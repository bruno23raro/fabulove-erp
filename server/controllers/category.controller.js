/**
 * Category Controller — CRUD completo de categorias
 */

import { CategoryModel } from '../models/category.model.js';
import logger from '../utils/logger.js';

// GET /api/categories
export const listCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.findAll();
    return res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// GET /api/categories/:id
export const getCategory = async (req, res, next) => {
  try {
    const category = await CategoryModel.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: { message: 'Categoria não encontrada.' } });
    }
    return res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// POST /api/categories
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Nome da categoria é obrigatório.' } });
    }

    const existing = await CategoryModel.findByName(name);
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'Já existe uma categoria com esse nome.' } });
    }

    const category = await CategoryModel.create({ name, description });
    logger.info(`[Category] Criada id=${category.id} nome="${category.name}"`);
    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// PUT /api/categories/:id
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Categoria não encontrada.' } });
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await CategoryModel.findByName(name);
      if (duplicate) {
        return res.status(409).json({ success: false, error: { message: 'Já existe uma categoria com esse nome.' } });
      }
    }

    const updated = await CategoryModel.update(id, { name, description });
    logger.info(`[Category] Atualizada id=${id}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Categoria não encontrada.' } });
    }

    const hasProducts = await CategoryModel.hasProducts(id);
    if (hasProducts) {
      return res.status(409).json({ success: false, error: { message: 'Não é possível excluir uma categoria com produtos vinculados.' } });
    }

    await CategoryModel.delete(id);
    logger.info(`[Category] Excluída id=${id}`);
    return res.json({ success: true, data: { message: 'Categoria excluída com sucesso.' } });
  } catch (err) {
    next(err);
  }
};
