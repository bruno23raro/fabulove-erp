/**
 * XML — flat list of <product> elements or table-like structure
 */
import { XMLParser } from 'fast-xml-parser'
import { registerFormat } from './base.js'

const DEFAULT_XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // Common list-like tags
    return /items?|products?|rows?|records?|dados?/i.test(name)
  },
  trimValues: true,
  parseNumberValueAsString: false,
}

export const xmlFormat = {
  type: 'xml',
  label: 'XML',
  extensions: ['xml'],
  mimeTypes: ['application/xml', 'text/xml'],

  scoreByExt(_buf, ext) {
    return ext === 'xml' ? 0.95 : 0
  },

  detect(buffer, filename) {
    if (/\.xml$/i.test(filename || '')) return 0.95
    const text = buffer.slice(0, 200).toString('utf-8').toLowerCase()
    return text.includes('<?xml') || text.includes('<product') || text.includes('<item') ? 0.8 : 0
  },

  async parse(buffer) {
    const text = buffer.toString('utf-8')
    if (!text.trim()) throw new Error('Arquivo XML vazio.')

    let parsed
    try {
      parsed = new XMLParser(DEFAULT_XML_OPTIONS).parse(text)
    } catch (err) {
      throw new Error(`XML inválido: ${err.message}`)
    }

    // Navigate to the array of product-like objects
    const products = this._extractProducts(parsed)
    if (products.length === 0) {
      throw new Error('Nenhum registro de produto encontrado no XML.')
    }

    // Collect all unique keys
    const allKeys = new Set()
    for (const obj of products) {
      for (const key of Object.keys(obj)) allKeys.add(key)
    }
    const headers = Array.from(allKeys)

    const rows = products.map(obj =>
      headers.map(key => {
        const val = obj[key]
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val).trim()
      })
    )

    return {
      headers,
      rows,
      metadata: { format: 'xml', totalRows: products.length },
    }
  },

  _extractProducts(obj) {
    if (Array.isArray(obj)) return obj.filter(item => typeof item === 'object' && item !== null)
    if (typeof obj !== 'object' || obj === null) return []

    // Recursively unwrap nested containers to find the first array of actual records
    const unwrap = (val) => {
      if (Array.isArray(val)) {
        if (val.length === 0) return null
        // If all elements are plain objects with scalar values → these are the records
        if (val.every(item => typeof item === 'object' && item !== null &&
              Object.values(item).every(v => typeof v !== 'object' || v === null))) {
          return val
        }
        // Otherwise recurse into each element
        for (const item of val) {
          const result = unwrap(item)
          if (result) return result
        }
      } else if (typeof val === 'object' && val !== null) {
        for (const v of Object.values(val)) {
          const result = unwrap(v)
          if (result) return result
        }
      }
      return null
    }

    const products = unwrap(obj)
    if (products && products.length > 0) return products

    // If root itself is an object with scalar values, treat as single record
    const entries = Object.entries(obj)
    if (entries.length > 0 && entries.every(([, v]) => typeof v !== 'object' || v === null)) {
      return [obj]
    }

    return []
  },
}

registerFormat(xmlFormat)
