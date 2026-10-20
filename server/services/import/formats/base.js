/**
 * Import Formats — Base detector and registry
 *
 * Each format module exports:
 *   type: string
 *   mimeTypes: string[]
 *   extensions: string[]
 *   detect(buffer, filename): boolean | number (confidence 0-1)
 *   parse(buffer, options): Promise<{headers, rows, metadata}>
 */

const FORMAT_REGISTRY = []

export function registerFormat(format) {
  FORMAT_REGISTRY.push(format)
}

export function detectFormat(buffer, filename) {
  const name = (filename || '').toLowerCase()
  const ext = name.split('.').pop() || ''

  // Try extension first (fast path)
  const extMatches = FORMAT_REGISTRY
    .filter(f => f.extensions.includes(ext))
    .sort((a, b) => (b.scoreByExt?.(buffer, ext) ?? 0) - (a.scoreByExt?.(buffer, ext) ?? 0))

  if (extMatches.length > 0) return extMatches[0]

  // Fall back to magic bytes / content sniffing
  for (const fmt of FORMAT_REGISTRY) {
    const score = fmt.detect?.(buffer, name) ?? 0
    if (score > 0.5) return fmt
  }

  return null
}

export function getRegisteredFormats() {
  return FORMAT_REGISTRY.map(f => ({
    type: f.type,
    label: f.label,
    extensions: f.extensions,
    mimeTypes: f.mimeTypes,
  }))
}

export { FORMAT_REGISTRY }
