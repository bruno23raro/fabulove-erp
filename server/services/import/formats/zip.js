/**
 * ZIP — extract and analyze contained files
 */
import AdmZip from 'adm-zip'
import { registerFormat } from './base.js'

// Dangerous file types to skip
const DANGEROUS_EXTS = new Set(['exe', 'bat', 'cmd', 'sh', 'js', 'py', 'vbs', 'msi', 'dll', 'scr'])

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export const zipFormat = {
  type: 'zip',
  label: 'ZIP Archive',
  extensions: ['zip'],
  mimeTypes: ['application/zip', 'application/x-zip-compressed'],

  scoreByExt(_buf, ext) {
    return ext === 'zip' ? 0.95 : 0
  },

  detect(buffer) {
    if (buffer.length < 4) return 0
    return buffer.slice(0, 4).toString('hex') === '504b0304' ? 0.95 : 0
  },

  async parse(_buffer, options = {}) {
    let zip
    try {
      zip = new AdmZip(_buffer)
    } catch (err) {
      throw new Error(`Arquivo ZIP inválido ou corrompido: ${err.message}`)
    }

    const entries = zip.getEntries()
    const maxDepth = options.maxDepth ?? 5
    const maxSizeTotal = (options.maxSizeTotal ?? 500) * 1024 * 1024 // 500 MB default
    const maxFiles = options.maxFiles ?? 5000

    // Validate ZIP safety
    let totalSize = 0
    const validEntries = []
    for (const entry of entries) {
      if (entry.isDirectory) continue
      const name = entry.entryName
      // Path traversal check
      if (name.includes('..') || name.startsWith('/')) continue
      // Dangerous extension check
      const ext = name.split('.').pop()?.toLowerCase() || ''
      if (DANGEROUS_EXTS.has(ext)) continue
      // Depth check
      const depth = name.split('/').length - 1
      if (depth > maxDepth) continue
      // Size check
      if (entry.header.size > 100 * 1024 * 1024) continue // 100MB per file
      totalSize += entry.header.size
      if (totalSize > maxSizeTotal) break
      validEntries.push(entry)
    }

    if (validEntries.length === 0) {
      throw new Error('ZIP não contém arquivos válidos para importação.')
    }

    const importable = validEntries.filter(e => {
      const ext = e.entryName.split('.').pop()?.toLowerCase() || ''
      return ['csv', 'tsv', 'txt', 'xlsx', 'xls', 'json', 'jsonl', 'xml'].includes(ext)
    })

    const imageEntries = validEntries.filter(e => {
      const ext = e.entryName.split('.').pop()?.toLowerCase() || ''
      return IMAGE_EXTS.has(ext)
    })

    // Limit importable files (not images) to maxFiles
    const limitedImportable = importable.slice(0, maxFiles)

    if (limitedImportable.length === 0) {
      throw new Error('ZIP não contém arquivos CSV, XLSX, JSON ou XML.')
    }

    // Prefer a file in a "produtos" folder (common Shopee export pattern)
    const preferred = limitedImportable.find(e => /\/produtos\//i.test(e.entryName)) ?? limitedImportable[0]
    const content = preferred.getData().toString('utf-8')

    // Reconstruct buffer for format detection
    const fakeBuffer = Buffer.from(content, 'utf-8')
    const ext = preferred.entryName.split('.').pop()?.toLowerCase() || ''

    // Import the file using the appropriate format handler
    const { detectFormat } = await import('./base.js')
    const fmt = detectFormat(fakeBuffer, preferred.entryName)
    if (!fmt) throw new Error('Nenhum formato reconhecido encontrado no ZIP.')

    const result = await fmt.parse(fakeBuffer, options)
    const imageEntryList = imageEntries.map(e => ({ name: e.entryName, size: e.header.size }))

    result.metadata.zipFile = preferred.entryName
    result.metadata.totalEntries = validEntries.length
    result.metadata.importableFiles = limitedImportable.map(e => e.entryName)
    result.metadata.imageCount = imageEntryList.length
    result.metadata.imageEntries = imageEntryList

    // Collect image buffers for on-demand extraction
    const imageBuffers = new Map()
    for (const img of imageEntries) {
      imageBuffers.set(img.entryName, img.getData())
    }

    return Object.assign(result, {
      getImages() {
        return imageBuffers
      },
    })
  },
}

registerFormat(zipFormat)
