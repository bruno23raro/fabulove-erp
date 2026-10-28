/**
 * Image Service — handles extraction, storage, and association of product images
 */
import fs from 'fs/promises'
import path from 'path'
import pool from '../../config/database.js'
import logger from '../../utils/logger.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'server/data/uploads/images')
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB per image
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export class ImageService {
  constructor() {
    this.uploadDir = UPLOAD_DIR
  }

  /**
   * Ensure upload directory exists
   */
  async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true })
  }

  /**
   * Extract images from a ZIP entry buffer and save to disk
   * Returns array of saved image info
   */
  async extractAndSave(entryBuffer, originalName, productId = null, source = 'zip_extract') {
    await this.ensureDir()

    const ext = path.extname(originalName).toLowerCase()
    const mimeType = this._guessMimeType(ext, originalName)

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      logger.debug(`[Image] Skipping non-image: ${originalName} (${mimeType})`)
      return null
    }

    if (entryBuffer.length > MAX_IMAGE_SIZE) {
      logger.debug(`[Image] Skipping oversized: ${originalName} (${entryBuffer.length} bytes)`)
      return null
    }

    // Generate safe filename
    const safeName = this._safeFilename(originalName)
    const dateStr = new Date().toISOString().slice(0, 10)
    const filePath = path.join(this.uploadDir, dateStr, safeName)

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, entryBuffer)

    const url = `/uploads/images/${dateStr}/${safeName}`

    // Insert into database
    const result = await pool.query(
      `INSERT INTO product_images (product_id, filename, file_path, file_size, mime_type, url, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id, filename, url, is_primary, status`,
      [productId, originalName, filePath, entryBuffer.length, mimeType, url, source]
    )

    logger.debug(`[Image] Saved: ${originalName} → ${url} (product_id=${productId})`)
    return result.rows[0]
  }

  /**
   * Associate pending images with a product by matching filename patterns
   * Expected pattern: {sku}-{index}.jpg or {id}-{index}.jpg or just matches by position
   */
  async associateImagesWithProduct(productId, imageHints) {
    /**
     * imageHints: array of { filename, expectedSku, expectedId } from ZIP manifest
     */
    const matching = await pool.query(
      `SELECT id, filename, url FROM product_images
       WHERE status = 'pending' AND product_id IS NULL
       ORDER BY id`,
      []
    )

    // Simple heuristic: associate first N pending images with the product
    // A more sophisticated version would match by SKU/id in filename
    const toLink = matching.rows.slice(0, imageHints.length || 5)

    for (const img of toLink) {
      await pool.query(
        `UPDATE product_images SET product_id = $1, status = 'linked' WHERE id = $2`,
        [productId, img.id]
      )
    }

    return toLink.length
  }

  /**
   * Get pending images (not yet associated with any product)
   */
  async getPendingImages(limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT id, filename, url, file_size, mime_type, created_at
       FROM product_images
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  /**
   * Get images for a product
   */
  async getProductImages(productId) {
    const result = await pool.query(
      `SELECT id, filename, url, is_primary, mime_type, created_at
       FROM product_images
       WHERE product_id = $1 AND status = 'linked'
       ORDER BY is_primary DESC, created_at`,
      [productId]
    )
    return result.rows
  }

  /**
   * Update product's primary image_url from associated images
   */
  async setPrimaryImage(productId, imageId) {
    await pool.query(
      `UPDATE product_images SET is_primary = FALSE WHERE product_id = $1`,
      [productId]
    )
    await pool.query(
      `UPDATE product_images SET is_primary = TRUE WHERE id = $1 AND product_id = $2`,
      [imageId, productId]
    )
    const img = await pool.query(
      `SELECT url FROM product_images WHERE id = $1`,
      [imageId]
    )
    if (img.rows[0]) {
      await pool.query(
        `UPDATE products SET image_url = $1 WHERE id = $2`,
        [img.rows[0].url, productId]
      )
    }
  }

  /**
   * Discard pending images
   */
  async discardImages(imageIds) {
    for (const id of imageIds) {
      const img = await pool.query(`SELECT file_path FROM product_images WHERE id = $1`, [id])
      if (img.rows[0] && img.rows[0].file_path) {
        try { await fs.unlink(img.rows[0].file_path) } catch { /* ignore */ }
      }
      await pool.query(`DELETE FROM product_images WHERE id = $1`, [id])
    }
  }

  /**
   * Count pending images
   */
  async countPending() {
    const result = await pool.query(`SELECT COUNT(*) AS cnt FROM product_images WHERE status = 'pending'`)
    return parseInt(result.rows[0]?.cnt || 0)
  }

  _guessMimeType(ext, _filename) {
    const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }
    return map[ext.toLowerCase()] || 'application/octet-stream'
  }

  _safeFilename(originalName) {
    // Remove path separators, special chars; keep extension
    const base = originalName.replace(/[^\\w.\\-]/g, '_')
    return base.slice(0, 200)
  }
}

export const imageService = new ImageService()
