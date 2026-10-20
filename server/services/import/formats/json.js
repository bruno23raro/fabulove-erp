/**
 * JSON / NDJSON — array of objects or newline-delimited
 */
import { registerFormat } from './base.js'

export const jsonFormat = {
  type: 'json',
  label: 'JSON / NDJSON',
  extensions: ['json', 'jsonl', 'ndjson'],
  mimeTypes: ['application/json', 'text/json'],

  scoreByExt(_buf, ext) {
    return ext === 'json' ? 0.95 : ext === 'jsonl' || ext === 'ndjson' ? 0.9 : 0
  },

  detect(buffer, filename) {
    if (/\.json(l?)$/i.test(filename || '')) return 0.95
    // Try to parse as JSON
    try {
      const text = buffer.toString('utf-8').trim()
      JSON.parse(text)
      return 0.9
    } catch (_) { return 0 }
  },

  async parse(buffer) {
    const text = buffer.toString('utf-8').trim()
    if (!text) throw new Error('Arquivo JSON vazio.')

    let data
    try {
      data = JSON.parse(text)
    } catch (err) {
      // Try NDJSON (one JSON object per line)
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length === 0) throw new Error('Arquivo JSON inválido.')
      data = lines.map(line => {
        try { return JSON.parse(line.trim()) }
        catch (_) { return null }
      }).filter(Boolean)
      if (data.length === 0) throw new Error('Nenhum objeto JSON válido encontrado.')
      return {
        headers: Object.keys(data[0]),
        rows: data.map(obj => Object.values(obj).map(v => v === null ? '' : String(v))),
        metadata: { format: 'ndjson', totalRows: data.length },
      }
    }

    // Wrap single object in array
    const arr = Array.isArray(data) ? data : [data]
    if (arr.length === 0) throw new Error('JSON contém array vazio.')

    // Collect all unique keys across all objects for complete header set
    const allKeys = new Set()
    for (const obj of arr) {
      if (typeof obj === 'object' && obj !== null) {
        for (const key of Object.keys(obj)) allKeys.add(key)
      }
    }
    const headers = Array.from(allKeys)

    const rows = arr.map(obj => {
      if (typeof obj !== 'object' || obj === null) return ['']
      return headers.map(key => {
        const val = obj[key]
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      })
    })

    return {
      headers,
      rows,
      metadata: { format: 'json', totalRows: arr.length },
    }
  },
}

registerFormat(jsonFormat)
