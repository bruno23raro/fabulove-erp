/**
 * Validator — checks product data for required fields, duplicates, and type errors
 */
import pool from '../../config/database.js'
import { normalizePrice, normalizeBarcode, normalizeQuantity } from './normalizer.js'

export class ImportValidator {
  constructor(options = {}) {
    this.duplicatePolicy = options.duplicatePolicy || 'skip' // 'skip' | 'create' | 'update' | 'review'
    this.requiredFields = options.requiredFields || ['name']
    this.maxErrors = options.maxErrors || 1000
  }

  /**
   * Validate a single product object against the ERP schema.
   * Returns { valid, errors, warnings }
   */
  validate(product, existingProduct = null) {
    const errors = []
    const warnings = []

    // Required fields
    for (const field of this.requiredFields) {
      if (!product[field] || String(product[field]).trim() === '') {
        errors.push(`Campo obrigatório "${field}" ausente.`)
      }
    }

    // Price validation
    if (product.price !== null && product.price !== undefined) {
      const price = normalizePrice(String(product.price))
      if (price === null) {
        errors.push(`Preço inválido: "${product.price}"`)
      } else if (price < 0) {
        errors.push(`Preço não pode ser negativo: ${product.price}`)
      }
      product.price = price
    }

    // Cost validation
    if (product.cost !== null && product.cost !== undefined) {
      const cost = normalizePrice(String(product.cost))
      if (cost !== null && cost < 0) {
        warnings.push(`Custo negativo ignorado: ${product.cost}`)
        product.cost = null
      }
    }

    // Stock validation
    if (product.stock !== null && product.stock !== undefined) {
      const stock = normalizeQuantity(String(product.stock))
      if (stock === null) {
        errors.push(`Estoque inválido: "${product.stock}"`)
      }
      product.stock = stock
    }

    // Barcode normalization (preserve leading zeros)
    if (product.barcode) {
      const clean = normalizeBarcode(String(product.barcode))
      if (clean) product.barcode = clean
      else warnings.push(`Código de barras com formato inválido: ${product.barcode}`)
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Check for duplicates against the database.
   * Returns Map of identifier → existing product
   */
  async checkDuplicates(products) {
    const byBarcode = new Map()
    const bySku = new Map()

    for (const product of products) {
      if (product.barcode) {
        const existing = await pool.query(
          'SELECT id, name, sku, barcode FROM products WHERE barcode = $1 AND is_active = TRUE LIMIT 1',
          [product.barcode.trim()]
        )
        if (existing.rows[0]) byBarcode.set(product.barcode.trim(), existing.rows[0])
      }
      if (product.sku) {
        const existing = await pool.query(
          'SELECT id, name, sku, barcode FROM products WHERE UPPER(sku) = UPPER($1) AND is_active = TRUE LIMIT 1',
          [product.sku.trim()]
        )
        if (existing.rows[0]) bySku.set(product.sku.trim().toUpperCase(), existing.rows[0])
      }
    }

    return { byBarcode, bySku }
  }

  /**
   * Apply duplicate policy and return conflict info per product.
   */
  resolveDuplicates(products, duplicates) {
    const conflicts = []
    const resolved = products.map((product, idx) => {
      const barcodeDup = product.barcode ? duplicates.byBarcode.get(product.barcode.trim()) : null
      const skuDup = product.sku ? duplicates.bySku.get(product.sku.trim().toUpperCase()) : null
      const dup = barcodeDup || skuDup

      if (dup) {
        conflicts.push({
          index: idx,
          product,
          existing: dup,
          matchType: barcodeDup ? 'barcode' : 'sku',
          existingId: dup.id,
        })

        switch (this.duplicatePolicy) {
          case 'skip':
            product._conflict = 'skip'
            break
          case 'create':
            product._conflict = 'create_new'
            break
          case 'update':
          case 'update_existing':
            product._conflict = 'update_existing'
            product._existingId = dup.id
            break
          case 'review':
            product._conflict = 'review'
            break
          default:
            product._conflict = 'skip'
        }
      } else {
        product._conflict = 'new'
      }

      return product
    })

    return { resolved, conflicts }
  }
}
