/**
 * Normalizer — converts raw string values to typed product fields
 */

// Brazilian monetary pattern: R$ 1.234,56 or 1.234,56 or 1234,56
const BR_MONETARY = /^(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)$/
// International: 1,234.56 or 1234.56
const INT_MONETARY = /^(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)$/
// Pure number (integer or decimal with period)
const PURE_NUM = /^-?\d+(?:\.\d+)?$/
// Barcode: 12-14 digits, possibly with dashes
const BARCODE = /^[\d-]{8,14}$/
// Date patterns
const DATE_BR = /^\d{2}[/.-]\d{2}[/.-]\d{2,4}$/
const DATE_ISO = /^\d{4}[/.-]\d{2}[/.-]\d{2}$/

export function normalizeString(val) {
  if (val === null || val === undefined || val === '') return null
  return String(val).trim()
}

export function normalizePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const s = String(val).trim()
  if (!s) return null

  // Remove currency symbols and whitespace
  const cleaned = s.replace(/[R$€£¥\s]/g, '').replace(/[„"”]/g, '')

  // Brazilian: 1.234,56 → 1234.56
  if (BR_MONETARY.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    return isNaN(num) ? null : num
  }

  // International: 1,234.56 → 1234.56
  if (INT_MONETARY.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/,/g, ''))
    return isNaN(num) ? null : num
  }

  // Plain number with period decimal: 25.5, 100, 0
  if (PURE_NUM.test(cleaned)) {
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  return null
}

export function normalizeQuantity(val) {
  if (val === null || val === undefined || val === '') return null
  const s = String(val).trim()
  if (!s) return null
  // Handle both comma and period as decimal separators
  // Brazilian: 1.234,56 → 1234.56 → round to 1235
  // International: 1,234.56 → remove commas → 1234.56 → round to 1235
  let numStr = s
  if (s.includes('.') && s.includes(',')) {
    // Mixed: determine which is decimal by position of last separator
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    if (lastComma > lastDot) {
      // Comma is decimal: 1.234,56
      numStr = s.replace(/\./g, '').replace(',', '.')
    } else {
      // Period is decimal: 1,234.56
      numStr = s.replace(/,/g, '')
    }
  } else if (s.includes(',')) {
    // Could be European thousands or Brazilian decimal
    // If single comma and 2 digits after → Brazilian decimal
    const commaIdx = s.indexOf(',')
    const afterComma = s.slice(commaIdx + 1)
    if (afterComma.length === 2 && /^\d{1,3}$/.test(s.slice(0, commaIdx))) {
      numStr = s.replace(',', '.')
    } else {
      numStr = s.replace(/,/g, '')
    }
  }
  const num = parseFloat(numStr)
  return isNaN(num) ? null : Math.round(num)
}

export function normalizeBarcode(val) {
  if (val === null || val === undefined || val === '') return null
  const s = String(val).trim()
  // Strip common separators
  const clean = s.replace(/[\s-]/g, '')
  if (BARCODE.test(clean)) return clean
  return null // Invalid barcode — caller decides what to do
}

export function normalizeBoolean(val) {
  if (val === null || val === undefined) return null
  const s = String(val).trim().toLowerCase()
  if (['true', '1', 'sim', 'yes', 'y', 'ok', 'ativo', 'ative'].includes(s)) return true
  if (['false', '0', 'nao', 'no', 'no', 'n', 'nao', 'inactive'].includes(s)) return false
  return null
}

export function normalizeDate(val) {
  if (val === null || val === undefined || val === '') return null
  const s = String(val).trim()
  if (DATE_BR.test(s) || DATE_ISO.test(s)) return s
  return null
}

export function truncateText(val, maxLen = 2000) {
  if (val === null) return null
  const s = String(val).trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s || null
}

export function normalizeProductRow(rawRow, headers) {
  /**
   * Map a raw row to normalized product fields.
   * Uses the provided headers array (which may have been remapped by the mapper).
   */
  const row = {}
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeString(headers[i])
    const v = rawRow[i]
    if (h && v !== undefined) {
      row[h] = normalizeString(v)
    }
  }
  return row
}
