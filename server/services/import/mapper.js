/**
 * Column Mapper — auto-detects column roles with confidence scoring
 *
 * Each target field has a list of known aliases. The mapper scores each source
 * header against every target field and returns the best match per field,
 * with a confidence score (0–1).
 *
 * Fields with confidence < threshold are flagged as "unmapped" for user review.
 */

import { normalizeString, normalizePrice, normalizeQuantity } from './normalizer.js'

// Fuzzy string similarity (case-insensitive, accent-stripped)
function similarity(a, b) {
  const norm = (s) => s.toLowerCase().replace(/[àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿœšß]/g, m => {
    const map = {'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','æ':'ae','ç':'c','è':'e','é':'e','ê':'e','ë':'e','ì':'i','í':'i','î':'i','ï':'i','ð':'d','ñ':'n','ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ù':'u','ú':'u','û':'u','ü':'u','ý':'y','ÿ':'y','œ':'oe','š':'s','ß':'ss'}
    return map[m] || m
  })
  const na = norm(a), nb = norm(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) {
    // Substring match: require minimum length to avoid false positives
    // e.g. "cod" (3 chars) matching "codigo de barras" (16 chars) should NOT score 0.85
    const minLen = Math.max(na.length, nb.length)
    const maxLen = Math.min(na.length, nb.length)
    if (maxLen < 4) return 0.3 // too short to be a meaningful substring match
    return 0.85
  }
  // Levenshtein-like: simple ratio
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1.0
  // Count common characters (simple)
  let matches = 0
  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length <= nb.length ? nb : na
  for (const ch of shorter) {
    if (longer.includes(ch)) matches++
  }
  return matches / maxLen
}

// Check if a header looks like a pure numeric ID (should not be auto-mapped)
function isNumericId(header) {
  const clean = header.trim().toLowerCase()
  // If the header is just "id" or "index" or purely numeric, skip auto-map
  if (/^id$|^index$|^#\s*$/.test(clean)) return true
  return false
}

// Target field definitions with aliases
const FIELD_DEFINITIONS = {
  name: {
    aliases: ['nome', 'name', 'produto', 'product', 'titulo', 'title', 'item name',
              'nome_produto', 'product_name', 'article', 'razao_social', 'descricao_curta'],
    required: true,
  },
  sku: {
    aliases: ['sku', 'reference', 'ref', 'codigo_interno', 'internal_code',
              'seller_sku', 'sku_vendedor', 'cod_interno', 'code', 'referencia', 'cod'],
    required: false,
  },
  barcode: {
    aliases: ['barcode', 'codigo_barras', 'cod_barras', 'ean', 'gtin', 'isbn',
              'cod_barra', 'barcode_seller', 'seller_barcode', 'upc', 'codigo_barras',
              'ean13', 'gtin13', 'ncm'],
    required: false,
  },
  description: {
    aliases: ['description', 'descricao', 'desc', 'detail', 'details', 'resumo',
              'product_description', 'about', 'complemento', 'detalhes', 'descricao_longa'],
    required: false,
  },
  price: {
    aliases: ['price', 'preco', 'preço', 'precio', 'valor', 'sale_price', 'selling_price',
              'price_sale', 'venda', 'preco_venda', 'preco_final', 'list_price',
              'retail_price', 'customer_price', 'vlr_unitario', 'preco_publico', 'preco_venda'],
    required: false,
  },
  cost: {
    aliases: ['cost', 'custo', 'cost_price', 'purchase_price', 'preco_compra',
              'price_cost', 'buy_price', 'custo_unitario', 'costo'],
    required: false,
  },
  stock: {
    aliases: ['stock', 'qty', 'quantity', 'quantidade', 'estoque', 'inventory',
              'available', 'disponivel', 'avail', 'qtd', 'units', 'quantity_available',
              'estoque_atual', 'qtd_disponivel'],
    required: false,
  },
  stockMin: {
    aliases: ['stock_min', 'min_stock', 'minimum_stock', 'estoque_minimo',
              'reorder_point', 'minimo', 'threshold', 'stock_minimo', 'estoque_seguranca'],
    required: false,
  },
  category: {
    aliases: ['category', 'categoria', 'cat', 'type', 'section', 'department',
              'family', 'grupo', ' classe', 'niche', 'familia', 'subcategoria', 'linha'],
    required: false,
  },
  brand: {
    aliases: ['brand', 'marca', 'manufacturer', 'fabricante', 'brand_name', 'marcas'],
    required: false,
  },
  weight: {
    aliases: ['weight', 'peso', 'weight_kg', 'peso_kg', 'gross_weight', 'lb', 'peso_bruto'],
    required: false,
  },
  image: {
    aliases: ['image', 'imagem', 'picture', 'photo', 'img', 'url_image',
              'image_url', 'foto', 'thumbnail', 'main_image', 'foto_principal'],
    required: false,
  },
  images: {
    aliases: ['images', 'imagens', 'photos', 'fotos', 'gallery', 'galeria',
              'fotos_adicionais', 'image_list', 'imagens_adicionais'],
    required: false,
  },
  video: {
    aliases: ['video', 'videos', 'video_url', 'videos_url', 'filme',
              'video_do_produto', 'url_video', 'youtube', 'vimeo'],
    required: false,
  },
  ncm: {
    aliases: ['ncm', 'ncc', 'sh', 'hs_code', 'codigo_ncm', 'tributacao'],
    required: false,
  },
  pricePromotional: {
    aliases: ['preco_promocional', 'preco_promo', 'promo_price', 'sale_price', 'preco_offerta', 'desconto', 'promocional'],
    required: false,
  },
  availability: {
    aliases: ['disponibilidade', 'stock_status', 'situacao', 'estado', 'condition'],
    required: false,
  },
}

const CONFIDENCE_THRESHOLD = 0.45

export function getTargetFields() {
  return Object.keys(FIELD_DEFINITIONS)
}

export function getFieldDefinition(fieldName) {
  return FIELD_DEFINITIONS[fieldName]
}

export function analyzeHeaders(headers) {
  /**
   * Analyze source headers and return mapping suggestions.
   * Returns array of { header, mappedField, confidence, suggestion }
   */
  const results = []
  const usedFields = new Set()

  for (const rawHeader of headers) {
    const header = normalizeString(rawHeader) || ''
    if (!header) continue

    // Skip pure ID columns — they are not meaningful for mapping
    if (isNumericId(header)) {
      results.push({ header, mappedField: null, confidence: 0, isRequired: false })
      continue
    }

    let bestMatch = null
    let bestScore = 0

    for (const [field, def] of Object.entries(FIELD_DEFINITIONS)) {
      if (usedFields.has(field)) continue

      // Direct match (normalized)
      for (const alias of def.aliases) {
        if (header.toLowerCase() === alias.toLowerCase()) {
          const score = 1.0
          if (score > bestScore) { bestScore = score; bestMatch = field }
          break
        }
      }

      // Fuzzy match
      for (const alias of def.aliases) {
        const score = similarity(header, alias)
        if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
          bestScore = score
          bestMatch = field
        }
      }
    }

    results.push({
      header,
      mappedField: bestMatch,
      confidence: bestScore,
      isRequired: bestMatch ? FIELD_DEFINITIONS[bestMatch]?.required : false,
    })
    if (bestMatch) usedFields.add(bestMatch)
  }

  return results
}

export function mapColumns(sourceHeaders, mapping) {
  /**
   * Apply a column mapping to get the normalized column order.
   * mapping can be:
   *   - { fieldName: headerIndex } (numeric index)
   *   - { fieldName: headerName } (string name)
   * Returns { fields: string[], fieldMapping: [{ field, header, index }] }
   */
  const fieldMapping = []
  const fields = []

  for (const [field, def] of Object.entries(FIELD_DEFINITIONS)) {
    let mappedIndex = mapping?.[field]
    let headerName = null

    // If mapping value is a string, find its index in headers
    if (typeof mappedIndex === 'string') {
      headerName = normalizeString(mappedIndex)
      mappedIndex = sourceHeaders.findIndex(h => normalizeString(h) === headerName)
    }

    if (mappedIndex !== undefined && mappedIndex !== null && mappedIndex < sourceHeaders.length && mappedIndex >= 0) {
      headerName = normalizeString(sourceHeaders[mappedIndex]) || headerName
      fieldMapping.push({ field, header: headerName, index: mappedIndex })
      fields.push(headerName || field)
    } else if (def.required) {
      fieldMapping.push({ field, header: null, index: -1, missing: true })
      fields.push(field)
    }
  }

  return { fields, fieldMapping }
}

export function normalizeRow(rawRow, fieldMapping) {
  /**
   * Map a raw row to normalized product object.
   */
  const product = {}
  for (const { field, header, index, missing } of fieldMapping) {
    if (missing) {
      product[field] = null
      continue
    }
    const val = rawRow[index]
    switch (field) {
      case 'name':
        product.name = normalizeString(val)
        break
      case 'sku':
        product.sku = normalizeString(val) ? normalizeString(val).toUpperCase() : null
        break
      case 'barcode':
        product.barcode = normalizeString(val)
        break
      case 'description':
        product.description = normalizeString(val)
        break
      case 'price':
        product.price = normalizePrice(val)
        break
      case 'cost':
        product.cost = normalizePrice(val)
        break
      case 'stock':
        product.stock = normalizeQuantity(val)
        break
      case 'stockMin':
        product.stock_min = normalizeQuantity(val)
        break
      case 'category':
        product.category = normalizeString(val)
        break
      case 'brand':
        product.brand = normalizeString(val)
        break
      case 'weight':
        product.weight = normalizeString(val)
        break
      case 'image':
        product.image = normalizeString(val)
        break
      case 'images':
        // Store as delimited string for later parsing
        product.images = normalizeString(val)
        break
      case 'video':
        product.videoUrl = normalizeString(val)
        break
      case 'ncm':
        product.ncm = normalizeString(val)
        break
      case 'pricePromotional':
        product.price_promotional = normalizePrice(val)
        break
      case 'availability':
        product.availability = normalizeString(val)
        break
      default:
        break
    }
  }
  return product
}
