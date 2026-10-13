/**
 * Config Controller — configurações do sistema via key-value
 */

import { ConfigModel } from '../models/config.model.js';
import logger from '../utils/logger.js';

// GET /api/config
export const listConfig = async (req, res, next) => {
  try {
    const config = await ConfigModel.findAll();
    return res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

// GET /api/config/:key
export const getConfigKey = async (req, res, next) => {
  try {
    const config = await ConfigModel.findByKey(req.params.key);
    if (!config) {
      return res.status(404).json({ success: false, error: { message: 'Configuração não encontrada.' } });
    }
    return res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

// PUT /api/config/:key
export const upsertConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, type, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: { message: 'Valor é obrigatório.' } });
    }

    const VALID_TYPES = ['string', 'number', 'boolean', 'json'];
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: { message: `Tipo inválido. Aceitos: ${VALID_TYPES.join(', ')}` } });
    }

    const config = await ConfigModel.upsert({ key, value, type: type || 'string', description });
    logger.info(`[Config] Atualizada chave="${key}"`);
    return res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/config/:key
export const deleteConfig = async (req, res, next) => {
  try {
    const { key } = req.params;

    const existing = await ConfigModel.findByKey(key);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Configuração não encontrada.' } });
    }

    await ConfigModel.delete(key);
    logger.info(`[Config] Excluída chave="${key}"`);
    return res.json({ success: true, data: { message: 'Configuração excluída.' } });
  } catch (err) {
    next(err);
  }
};
