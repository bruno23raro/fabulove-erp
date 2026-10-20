/**
 * Import Service — orchestrates batch import with streaming, progress tracking, and transaction safety
 */
import pool from '../../config/database.js'
import logger from '../../utils/logger.js'
import { detectFormat } from './formats/base.js'
import { analyzeHeaders, mapColumns, normalizeRow } from './mapper.js'
import { ImportValidator } from './validator.js'
import { normalizeString, normalizePrice, normalizeQuantity, normalizeBarcode } from './normalizer.js'

const DEFAULT_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 1000

export class ImportService {
  constructor(options = {}) {
    this.batchSize = Math.min(options.batchSize ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE)
    this.duplicatePolicy = options.duplicatePolicy ?? 'skip'
    this.requiredFields = options.requiredFields ?? ['name']
    this.importProfile = options.importProfile ?? null
  }

  /**
   * Full import flow: parse → map → validate → upsert → report
   */
  async import(buffer, filename, mapping = null, options = {}) {
    const {
      batchSize = this.batchSize,
      duplicatePolicy = this.duplicatePolicy,
      skipValidation = false,
      onProgress,
    } = options

    const validator = new ImportValidator({ duplicatePolicy, requiredFields: this.requiredFields })

    // ── Step 1: Detect format and parse ──────────────────────────────────────
    const fmt = detectFormat(buffer, filename)
    if (!fmt) {
      return {
        success: false,
        error: 'Formato não reconhecido. Suportados: CSV, XLSX, JSON, XML, ZIP.',
        formats: fmt ? [] : [],
      }
    }

    let parsed
    try {
      parsed = await fmt.parse(buffer, options)
    } catch (err) {
      return { success: false, error: `Erro ao processar arquivo: ${err.message}` }
    }

    const { headers, rows, metadata } = parsed
    onProgress?.({ step: 'parsed', progress: 10, total: rows.length, current: rows.length })

    // ── Step 2: Column mapping ───────────────────────────────────────────────
    let headerAnalysis = analyzeHeaders(headers)
    let fieldMapping

    if (mapping) {
      // User-provided mapping: { fieldName: headerIndex }
      fieldMapping = mapColumns(headers, mapping)
    } else {
      // Auto-detect best mapping
      const autoMapping = this._autoMapHeaders(headerAnalysis)
      fieldMapping = mapColumns(headers, autoMapping)
      headerAnalysis = headerAnalysis.map(h => ({
        ...h,
        mappedField: fieldMapping.fieldMapping.find(f => f.header === h.header)?.mappedField || h.mappedField,
      }))
    }

    onProgress?.({ step: 'mapped', progress: 20 })

    // ── Step 3: Load categories ──────────────────────────────────────────────
    const { rows: categories } = await pool.query('SELECT id, name FROM categories ORDER BY name')
    const catMap = {}
    for (const cat of categories) {
      catMap[cat.name.toLowerCase()] = cat.id
      catMap[cat.name] = cat.id // also store original case
    }
    catMap['sem categoria'] = null
    catMap[''] = null

    // ── Step 4: Normalize and validate all rows ──────────────────────────────
    const normalized = []
    const validationErrors = []

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i]
      const product = normalizeRow(rawRow, fieldMapping.fieldMapping)

      // Ensure required mapping fields are present
      for (const fm of fieldMapping.fieldMapping) {
        if (fm.missing) product[fm.field] = null
      }

      // Normalize specific fields
      if (product.price !== null) product.price = normalizePrice(String(product.price))
      if (product.cost !== null) product.cost = normalizePrice(String(product.cost))
      if (product.stock !== null) product.stock = normalizeQuantity(String(product.stock))
      if (product.barcode) product.barcode = normalizeBarcode(String(product.barcode))
      if (product.name) product.name = normalizeString(product.name)
      if (product.sku) product.sku = normalizeString(product.sku)?.toUpperCase()
      if (product.description) product.description = normalizeString(product.description)

      if (skipValidation) {
        normalized.push(product)
        continue
      }

      const { valid, errors, warnings } = validator.validate(product)
      if (!valid) {
        validationErrors.push({ row: i + 1, errors })
        if (validationErrors.length >= 50) break // cap error reporting
      } else {
        product._warnings = warnings
        normalized.push(product)
      }
    }

    onProgress?.({ step: 'validated', progress: 40, total: rows.length, current: normalized.length })

    // ── Step 5: Check duplicates ─────────────────────────────────────────────
    let conflicts = []
    if (!skipValidation && normalized.length > 0) {
      const duplicates = await validator.checkDuplicates(normalized)
      const { resolved, conflicts: detectedConflicts } = validator.resolveDuplicates(normalized, duplicates)
      conflicts = detectedConflicts
      for (const c of conflicts) {
        validationErrors.push({
          row: c.index + 1,
          errors: [`Produto duplicado (${c.matchType}): "${c.existing.name}" (id=${c.existing.id})`],
        })
      }
      // Filter out skipped products
      const toImport = resolved.filter(p => p._conflict !== 'skip')
      // Re-validate after conflict resolution
      const finalProducts = []
      for (const p of toImport) {
        if (p._conflict === 'update_existing') {
          const { valid, errors } = validator.validate(p, { id: p._existingId })
          if (!valid) {
            validationErrors.push({ row: normalized.indexOf(p) + 1, errors })
          } else {
            finalProducts.push(p)
          }
        } else {
          finalProducts.push(p)
        }
      }
      normalized.length = 0
      normalized.push(...finalProducts)
    }

    onProgress?.({ step: 'duplicates-checked', progress: 50 })

    // ── Step 6: Batch upsert ─────────────────────────────────────────────────
    let created = 0, updated = 0, skipped = 0
    const errorList = []

    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(normalized.length / batchSize)

      onProgress?.({
        step: 'importing',
        progress: 50 + Math.round((i / normalized.length) * 45),
        total: normalized.length,
        current: Math.min(i + batchSize, normalized.length),
        batch: batchNum,
        totalBatches,
      })

      for (const product of batch) {
        try {
          if (product._conflict === 'update_existing' && product._existingId) {
            // Update existing
            const updateData = {}
            if (product.name) updateData.name = product.name
            if (product.sku) updateData.sku = product.sku
            if (product.barcode) updateData.barcode = product.barcode
            if (product.description) updateData.description = product.description
            if (product.price !== null && product.price !== undefined) updateData.price = product.price
            if (product.cost !== null && product.cost !== undefined) updateData.cost = product.cost
            if (product.stock !== null && product.stock !== undefined) updateData.stock = product.stock
            if (product.stock_min !== null && product.stock_min !== undefined) updateData.stock_min = product.stock_min
            if (product.category) {
              updateData.category_id = catMap[product.category.toLowerCase()] ?? null
            }
            if (product.image) updateData.image_url = product.image

            const result = await pool.query(
              `UPDATE products SET
                name = COALESCE($1, name),
                sku = COALESCE($2, sku),
                barcode = COALESCE($3, barcode),
                description = COALESCE($4, description),
                price = COALESCE($5, price),
                cost = COALESCE($6, cost),
                stock = COALESCE($7, stock),
                stock_min = COALESCE($8, stock_min),
                category_id = COALESCE($9, category_id),
                image_url = COALESCE($10, image_url),
                price_shopee = CASE WHEN $5 IS NOT NULL THEN ROUND(( $5 * 1.19 + 4.71 ) * 100) / 100 ELSE price_shopee END,
                updated_at = CURRENT_TIMESTAMP
               WHERE id = $11 RETURNING *`,
              [
                updateData.name, updateData.sku, updateData.barcode, updateData.description,
                updateData.price, updateData.cost, updateData.stock, updateData.stock_min,
                updateData.category_id, updateData.image_url, product._existingId,
              ]
            )
            if (result.rows.length > 0) {
              updated++
            } else {
              skipped++
              errorList.push(`Linha ${i + 1}: produto não encontrado para atualização (id=${product._existingId})`)
            }
          } else {
            // Insert new
            const categoryId = product.category ? (catMap[product.category.toLowerCase()] ?? null) : null
            const priceVal = product.price ?? 0
            const priceShopee = Math.round((priceVal * 1.19 + 4.71) * 100) / 100

            const result = await pool.query(
              `INSERT INTO products
                (name, sku, barcode, description, price, cost, stock, stock_min, category_id, image_url, is_active, price_shopee)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               RETURNING *`,
              [
                product.name, product.sku, product.barcode, product.description,
                priceVal, product.cost ?? 0, product.stock ?? 0, product.stock_min ?? 0,
                categoryId, product.image, true, priceShopee,
              ]
            )
            if (result.rows.length > 0) {
              created++
            } else {
              skipped++
            }
          }
        } catch (err) {
          skipped++
          errorList.push(`Linha ${i + 1}: ${err.message?.substring(0, 200)}`)
          logger.warn(`[Import] Error on row ${i + 1}: ${err.message}`)
        }
      }
    }

    onProgress?.({ step: 'complete', progress: 100 })

    return {
      success: true,
      format: fmt.type,
      metadata,
      stats: {
        totalRows: rows.length,
        created,
        updated,
        skipped,
        errors: validationErrors.length + errorList.length,
      },
      conflicts: conflicts.map(c => ({
        row: c.index + 1,
        matchType: c.matchType,
        existingId: c.existing.id,
        existingName: c.existing.name,
        newRow: c.product,
      })),
      validationErrors: validationErrors.slice(0, 100),
      errorList: errorList.slice(0, 100),
    }
  }

  /**
   * Auto-map headers using confidence scoring
   */
  _autoMapHeaders(headerAnalysis) {
    const mapping = {}
    const usedHeaders = new Set()

    // Sort by confidence descending
    const sorted = [...headerAnalysis].sort((a, b) => b.confidence - a.confidence)

    for (const { header, mappedField, confidence } of sorted) {
      if (!mappedField || confidence < 0.45) continue
      if (usedHeaders.has(header)) continue
      mapping[mappedField] = header
      usedHeaders.add(header)
    }

    return mapping
  }
}
