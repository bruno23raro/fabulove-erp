/**
 * Product Controller — CRUD completo de produtos com estoque
 */

import { ProductModel } from '../models/product.model.js';
import logger from '../utils/logger.js';
import pool from '../config/database.js';

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
    const { name, sku, barcode, description, price, cost, stock, stock_min, categoryId, imageUrl, isActive } = req.body;

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

    if (barcode) {
      const existingBarcode = await ProductModel.findByBarcode(barcode);
      if (existingBarcode) {
        return res.status(409).json({ success: false, error: { message: 'Código de barras já cadastrado.' } });
      }
    }

    const product = await ProductModel.create({ name, sku, barcode, description, price, cost, stock, stock_min, categoryId, imageUrl, isActive });
    logger.info(`[Product] Criado id=${product.id} sku="${product.sku}" barcode="${product.barcode}"`);
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

    const { sku, barcode } = req.body;
    if (sku && sku.toUpperCase() !== existing.sku) {
      const dupSku = await ProductModel.findBySku(sku);
      if (dupSku) {
        return res.status(409).json({ success: false, error: { message: 'SKU já cadastrado em outro produto.' } });
      }
    }
    if (barcode && barcode !== existing.barcode) {
      const dupBarcode = await ProductModel.findByBarcode(barcode);
      if (dupBarcode) {
        return res.status(409).json({ success: false, error: { message: 'Código de barras já cadastrado em outro produto.' } });
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

// POST /api/products/import  — importação em massa via CSV (admin/manager)
export const importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'Arquivo CSV é obrigatório.' } });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: { message: 'CSV vazio ou sem cabeçalho.' } });
    }

    // Parser simples de CSV — suporta campos entre aspas e separador vírgula
    const parseLine = (line) => {
      const fields = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      fields.push(current.trim());
      return fields;
    };

    const headers = parseLine(lines[0]);
    const colBarcode = headers.findIndex(h => /barcode|cod.?barra|código de barras/i.test(h));
    const colName    = headers.findIndex(h => /nome|name|produto/i.test(h));
    const colPrice   = headers.findIndex(h => /preço|price|valor|venda/i.test(h));
    const colStock   = headers.findIndex(h => /estoque|stock|qtd/i.test(h));
    const colCategory = headers.findIndex(h => /categoria/i.test(h));
    const colSku     = headers.findIndex(h => /sku|referência|ref/i.test(h));

    const mandatory = [colBarcode, colName, colPrice].some(i => i === -1);
    if (mandatory) {
      return res.status(400).json({
        success: false,
        error: { message: 'Colunas obrigatórias não encontradas no CSV. Precisa ter: código de barras, nome, preço.', details: { headers } },
      });
    }

    // Busca categorias por nome (case-insensitive)
    const { rows: categories } = await pool.query('SELECT id, name FROM categories WHERE is_active = TRUE');
    const catMap = {};
    for (const cat of categories) catMap[cat.name.toLowerCase()] = cat.id;
    catMap['sem categoria'] = null;
    catMap[''] = null;

    const batchInsertFields = 'name, sku, barcode, description, price, cost, stock, stock_min, category_id, is_active';
    const batchInsertVals = 'VALUES ';
    const batchSize = 50;
    let created = 0, updated = 0, errors = 0;
    const errorList = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const barcode = cols[colBarcode] ? cols[colBarcode].trim() : '';
      const name    = cols[colName]    ? cols[colName].trim()    : '';
      const price   = parseFloat(cols[colPrice]);
      const stock   = parseInt(cols[colStock]) || 0;
      const sku     = cols[colSku]     ? cols[colSku].trim().toUpperCase() : null;
      const catName = cols[colCategory] ? cols[colCategory].trim() : null;
      const categoryId = catName ? (catMap[catName.toLowerCase()] ?? null) : null;

      if (!barcode || !name || isNaN(price)) {
        errors++;
        errorList.push(`Linha ${i + 1}: dados insuficientes (barcode="${barcode}", name="${name}", price=${price})`);
        continue;
      }

      try {
        const existing = await ProductModel.findByBarcode(barcode);
        if (existing) {
          await ProductModel.update(existing.id, {
            name, price, stock, sku, categoryId,
          });
          updated++;
        } else {
          await ProductModel.create({ name, sku, barcode, price, cost: 0, stock, stock_min: 0, categoryId, isActive: true });
          created++;
        }
      } catch (err) {
        errors++;
        errorList.push(`Linha ${i + 1}: ${err.message}`);
      }
    }

    logger.info(`[Product] Import CSV: created=${created} updated=${updated} errors=${errors}`);
    return res.json({
      success: true,
      data: { created, updated, errors, totalLines: lines.length - 1 },
      errors: errors > 0 ? errorList.slice(0, 20) : [],
    });
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
