/**
 * Import Controller — endpoints for analyze, preview, and batch import
 *
 * POST /api/products/import/analyze  — analyze file, return structure + suggestions
 * POST /api/products/import          — full import with mapping
 * GET  /api/products/import/profiles — list saved import profiles
 * POST /api/products/import/profiles — save an import profile
 * DELETE /api/products/import/profiles/:id — delete an import profile
 */
import { Router } from 'express'
import multer from 'multer'
import { authenticateToken, authorizeRole } from '../../utils/jwt.js'
import { analyzeFile, ImportService } from '../services/import/index.js'
import pool from '../config/database.js'
import logger from '../utils/logger.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.tsv', '.txt', '.xlsx', '.xls', '.json', '.jsonl', '.ndjson', '.xml', '.zip']
    const ext = '.' + file.originalname.split('.').pop().toLowerCase()
    if (allowed.includes(ext)) return cb(null, true)
    cb(new Error(`Extensão não permitida: ${ext}`))
  },
})

router.use(authenticateToken)
router.use(authorizeRole('admin', 'manager'))

// ── Analyze endpoint ─────────────────────────────────────────────────────────
router.post('/import/analyze', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'Arquivo é obrigatório.' } })
    }

    const { sheetName } = req.body
    const result = await analyzeFile(req.file.buffer, req.file.originalname, { sheetName })

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.error }, availableFormats: result.formats })
    }

    return res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// ── Full import endpoint ─────────────────────────────────────────────────────
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'Arquivo é obrigatório.' } })
    }

    const {
      mapping,
      duplicatePolicy = 'skip',
      batchSize = 100,
      skipValidation = false,
      importProfileId,
    } = req.body

    // Parse mapping from JSON string if passed as string
    let parsedMapping = null
    if (mapping) {
      try {
        parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping
      } catch (_) {
        return res.status(400).json({ success: false, error: { message: 'Mapeamento de colunas inválido.' } })
      }
    }

    const service = new ImportService({
      batchSize: parseInt(batchSize) || 100,
      duplicatePolicy,
      importProfileId,
    })

    const result = await service.import(req.file.buffer, req.file.originalname, parsedMapping, {
      duplicatePolicy,
      skipValidation: skipValidation === true,
    })

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.error } })
    }

    logger.info(`[Import] ${result.format}: created=${result.stats.created} updated=${result.stats.updated} skipped=${result.stats.skipped} errors=${result.stats.errors}`)

    return res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// ── Import profiles ──────────────────────────────────────────────────────────
router.get('/import/profiles', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, mapping, created_at FROM import_profiles WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    return res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

router.post('/import/profiles', async (req, res, next) => {
  try {
    const { name, description, mapping } = req.body
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Nome do perfil é obrigatório.' } })
    }

    const { rows } = await pool.query(
      `INSERT INTO import_profiles (user_id, name, description, mapping)
       VALUES ($1, $2, $3, $4) RETURNING id, name, description, mapping, created_at`,
      [req.user.id, name, description || null, mapping ? JSON.stringify(mapping) : null]
    )

    return res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    next(err)
  }
})

router.delete('/import/profiles/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM import_profiles WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!rowCount) {
      return res.status(404).json({ success: false, error: { message: 'Perfil não encontrado.' } })
    }
    return res.json({ success: true, data: { message: 'Perfil excluído.' } })
  } catch (err) {
    next(err)
  }
})

// ── Legacy single-file CSV/ZIP import (backward compat) ───────────────────────
// Kept on /api/products/import for existing E2E tests and simple use cases
// The new multi-format flow uses /api/products/import/analyze + /api/products/import

export default router
