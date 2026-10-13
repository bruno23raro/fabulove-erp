/**
 * Product Controller — CRUD completo de produtos com estoque
 */

import { ProductModel } from '../models/product.model.js';
import logger from '../utils/logger.js';

// GET /api/products
export const listProducts = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || null;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;

    const products = await ProductModel.findAll({ limit, offset, search, categoryId });
    return res.json({ success: true, data: products, meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock
export const listLowStock = async (req, res, next) => {
  try {
    const products = await ProductModel.listLowStock();
    return res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
export const getProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: { message: 'Produto não encontrado.' } });
    }
    return res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, price, cost, stock, stock_min, categoryId, imageUrl, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Nome do produto é obrigatório.' } });
    }
    if (price === undefined || isNaN(parseFloat(price))) {
      return res.status(400).json({ success: false, error: { message: 'Preço inválido.' } });
    }

    if (sku) {
      const existingSku = await ProductModel.findBySku(sku);
      if (existingSku) {
        return res.status(409).json({ success: false, error: { message: 'SKU já cadastrado.' } });
      }
    }

    const product = await ProductModel.create({ name, sku, description, price, cost, stock, stock_min, categoryId, imageUrl, isActive });
    logger.info(`[Product] Criado id=${product.id} sku="${product.sku}"`);
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await ProductModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Produto não encontrado.' } });
    }

    const { sku } = req.body;
    if (sku && sku.toUpperCase() !== existing.sku) {
      const dupSku = await ProductModel.findBySku(sku);
      if (dupSku) {
        return res.status(409).json({ success: false, error: { message: 'SKU já cadastrado em outro produto.' } });
      }
    }

    const updated = await ProductModel.update(id, req.body);
    logger.info(`[Product] Atualizado id=${id}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await ProductModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Produto não encontrado.' } });
    }

    await ProductModel.delete(id);
    logger.info(`[Product] Excluído id=${id}`);
    return res.json({ success: true, data: { message: 'Produto excluído com sucesso.' } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/stock
export const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || isNaN(parseInt(quantity))) {
      return res.status(400).json({ success: false, error: { message: 'Quantidade inválida.' } });
    }

    const existing = await ProductModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Produto não encontrado.' } });
    }

    const result = await ProductModel.adjustStock(id, parseInt(quantity));
    logger.info(`[Product] Estoque ajustado id=${id} delta=${quantity} novo=${result.stock}`);
    return res.json({ success: true, data: { stock: result.stock } });
  } catch (err) {
    next(err);
  }
};
