/**
 * XLSX / XLS — Excel spreadsheet support via SheetJS
 */
import XLSX from 'xlsx'
import { registerFormat } from './base.js'

export const xlsxFormat = {
  type: 'xlsx',
  label: 'Excel (XLSX / XLS)',
  extensions: ['xlsx', 'xls'],
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],

  scoreByExt(_buf, ext) {
    return ext === 'xlsx' ? 0.95 : ext === 'xls' ? 0.9 : 0
  },

  detect(buffer) {
    // XLSX magic: PK (0x504B) followed by specific signatures
    if (buffer.length < 4) return 0
    const sig = buffer.slice(0, 4).toString('hex')
    // ZIP-based (XLSX = ZIP): starts with 504B
    if (sig === '504b0304') return 0.9
    // Old XLS (BIFF): D0 CF 11 E0
    if (sig === 'd0cf11e0') return 0.85
    return 0
  },

  async parse(_buffer, options = {}) {
    let wb
    try {
      wb = XLSX.read(_buffer, { type: 'buffer', cellDates: true })
    } catch (err) {
      throw new Error(`Não foi possível ler arquivo Excel: ${err.message}`, { cause: err })
    }

    const sheetNames = wb.SheetNames
    // Auto-select the most data-rich sheet (not empty)
    const preferredName = options.sheetName
      ? (sheetNames.includes(options.sheetName) ? options.sheetName : sheetNames[0])
      : sheetNames.reduce((best, name) => {
          const ws = wb.Sheets[name]; const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
          const rows = range.e.r - range.s.r + 1
          const bestRange = wb.Sheets[best]['!ref']
            ? XLSX.utils.decode_range(wb.Sheets[best]['!ref']).e.r - XLSX.utils.decode_range(wb.Sheets[best]['!ref']).s.r
            : 0
          return rows > bestRange ? name : best
        }, sheetNames[0])

    const ws = wb.Sheets[preferredName]

    // Extract raw data as arrays
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false })

    if (rawData.length === 0) {
      throw new Error('Planilha vazia.')
    }

    // Detect header row: scan first N rows to find the one with most non-empty cells
    const headerCandidateCount = Math.min(10, rawData.length)
    let headerRowIndex = 0
    let headerScore = -1

    for (let i = 0; i < headerCandidateCount; i++) {
      const row = rawData[i]
      const nonEmpty = row.filter(v => v !== '' && v !== null && v !== undefined).length
      // Bonus if row contains typical header-like patterns
      const headerBonus = row.some(v => /nome|name|produto|sku|barcode|preço|price|custo|stock/i.test(String(v ?? ''))) ? 5 : 0
      const score = nonEmpty + headerBonus
      if (score > headerScore) { headerScore = score; headerRowIndex = i }
    }

    const headers = rawData[headerRowIndex]?.map(h => String(h ?? '').trim()) || []
    const dataRows = rawData.slice(headerRowIndex + 1).filter(row => row.some(v => v !== '' && v !== null && v !== undefined))

    // Normalize cell values: dates → strings, numbers → strings where appropriate
    const normalizeRow = (row) => {
      const normalized = []
      for (let i = 0; i < headers.length; i++) {
        const val = row[i]
        if (val instanceof Date) {
          normalized.push(val.toISOString().split('T')[0])
        } else if (val === null || val === undefined) {
          normalized.push('')
        } else {
          normalized.push(String(val).trim())
        }
      }
      // Pad shorter rows
      while (normalized.length < headers.length) normalized.push('')
      return normalized
    }

    return {
      headers,
      rows: dataRows.map(normalizeRow),
      metadata: {
        sheetName: preferredName,
        totalSheets: sheetNames.length,
        availableSheets: sheetNames,
        totalRows: dataRows.length,
        headerRowIndex: headerRowIndex,
      },
    }
  },
}

registerFormat(xlsxFormat)
