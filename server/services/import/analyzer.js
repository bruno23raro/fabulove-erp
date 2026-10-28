/**
 * Analyzer — parses a file, detects format, suggests column mapping, returns preview
 */
import { detectFormat, getRegisteredFormats } from './formats/base.js'
import { analyzeHeaders, getTargetFields } from './mapper.js'
import { normalizeProductRow } from './normalizer.js'

const MAX_PREVIEW_ROWS = 20
const DEFAULT_ANALYSIS_LIMIT = 500 // rows to scan for analysis

export async function analyzeFile(buffer, filename, options = {}) {
  const { maxRows = DEFAULT_ANALYSIS_LIMIT } = options

  // Detect format
  const fmt = detectFormat(buffer, filename)
  if (!fmt) {
    return {
      success: false,
      error: 'Formato não reconhecido. Suportados: CSV, XLSX, JSON, XML, ZIP.',
      formats: getRegisteredFormats(),
    }
  }

  // Parse the file (limit rows for analysis)
  let parsed
  try {
    parsed = await fmt.parse(buffer, { ...options, maxRows })
  } catch (err) {
    return { success: false, error: err.message }
  }

  const { headers, rows, metadata } = parsed

  // Analyze column mapping
  const headerAnalysis = analyzeHeaders(headers)

  // Build preview (first N rows)
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS).map(rawRow => {
    const mapped = normalizeProductRow(rawRow, headers)
    return mapped
  })

  // Detect which fields are present and their sample values
  const fieldPresence = {}
  for (const field of getTargetFields()) {
    let count = 0, sampleValues = []
    for (const row of rows.slice(0, 50)) {
      const mapped = normalizeProductRow(row, headers)
      if (mapped[field]) {
        count++
        if (sampleValues.length < 3) sampleValues.push(mapped[field])
      }
    }
    fieldPresence[field] = { count, sampleValues }
  }

  return {
    success: true,
    format: fmt.type,
    formatLabel: fmt.label,
    headers,
    totalRows: rows.length,
    metadata,
    headerAnalysis,
    preview: previewRows,
    fieldPresence,
    suggestedMapping: buildSuggestedMapping(headerAnalysis),
  }
}

function buildSuggestedMapping(headerAnalysis) {
  const mapping = {}
  for (const { header, mappedField, confidence } of headerAnalysis) {
    if (mappedField && confidence >= 0.7) {
      mapping[mappedField] = header
    }
  }
  return mapping
}
