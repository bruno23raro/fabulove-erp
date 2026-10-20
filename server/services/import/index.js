/**
 * Import Service Module — re-exports all sub-components
 */
export { detectFormat, getRegisteredFormats } from './formats/base.js'
export { analyzeFile } from './analyzer.js'
export { ImportService } from './import.service.js'
export { analyzeHeaders, getTargetFields, mapColumns, normalizeRow } from './mapper.js'
export { normalizeString, normalizePrice, normalizeQuantity, normalizeBarcode } from './normalizer.js'

// Register all format handlers
import './formats/csv.js'
import './formats/xlsx.js'
import './formats/json.js'
import './formats/xml.js'
import './formats/zip.js'
