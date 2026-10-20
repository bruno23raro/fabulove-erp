/**
 * CSV / TSV / TXT — delimiter detection, multi-encoding, quoted fields
 */
import Papa from 'papaparse'
import { registerFormat } from './base.js'
import iconv from 'iconv-lite'

// Try common encodings when UTF-8 fails
const ENCODINGS = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']

function tryParseWithEncoding(buffer, encoding) {
  const text = iconv.decode(buffer, encoding)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 1) return null

  // Auto-detect delimiter by checking which gives most consistent column counts
  const delimiters = ['\t', ';', ',', '|']
  let bestSep = ','
  let bestScore = -1

  for (const sep of delimiters) {
    const colCounts = lines.slice(0, 10).map(l => {
      let count = 0, inQ = false
      for (const ch of l) {
        if (ch === '"') inQ = !inQ
        else if (ch === sep && !inQ) count++
      }
      return count
    })
    const consistent = colCounts.every(c => c === colCounts[0]) ? 1 : 0
    const score = consistent * 10 + colCounts[0]
    if (score > bestScore) { bestScore = score; bestSep = sep }
  }

  return { text, sep: bestSep, lines }
}

export const csvFormat = {
  type: 'csv',
  label: 'CSV / TSV / TXT',
  extensions: ['csv', 'tsv', 'txt'],
  mimeTypes: ['text/csv', 'text/tab-separated-values', 'text/plain', 'application/csv'],

  scoreByExt(_buf, ext) {
    return ext === 'csv' ? 0.9 : ext === 'tsv' ? 0.95 : 0.7
  },

  detect(buffer, filename) {
    // ZIP-internal CSVs
    if (/\.csv$/i.test(filename || '')) return 0.95
    // Check first bytes for BOM or text-like content
    const first2 = buffer.slice(0, 2).toString('hex')
    if (first2 === 'efbb' || first2 === 'feff') return 0.9 // UTF-16 BOM handled by Papa
    // Try parsing — if it looks like CSV, return confidence
    for (const enc of ENCODINGS) {
      const parsed = tryParseWithEncoding(buffer, enc)
      if (parsed && parsed.lines[0].split(parsed.sep).length >= 2) return 0.85
    }
    return 0
  },

  async parse(buffer, options = {}) {
    const { autoDetectEncoding = true } = options
    let result = null

    if (autoDetectEncoding) {
      for (const enc of ENCODINGS) {
        try {
          result = tryParseWithEncoding(buffer, enc)
          if (result) break
        } catch (_) { /* try next encoding */ }
      }
    } else {
      result = tryParseWithEncoding(buffer, 'utf-8')
    }

    if (!result) {
      throw new Error('Não foi possível detectar o formato do arquivo CSV.')
    }

    const { text, sep, lines } = result

    // Use PapaParse for robust CSV parsing
    const parseResult = Papa.parse(text, {
      delimiter: sep,
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
      comments: options.commentChar || '',
    })

    if (parseResult.errors.length > 0 && parseResult.data.length < 1) {
      throw new Error(`Erro ao processar CSV: ${parseResult.errors[0].message}`)
    }

    return {
      headers: parseResult.data[0] || [],
      rows: parseResult.data.slice(1) || [],
      metadata: {
        delimiter: sep,
        encoding: result ? 'detected' : 'unknown',
        totalRows: parseResult.data.length - 1,
        totalCols: (parseResult.data[0] || []).length,
      },
    }
  },
}

registerFormat(csvFormat)
