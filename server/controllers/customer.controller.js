/**
 * Customer Controller — CRUD completo de clientes
 */

import { CustomerModel } from '../models/customer.model.js';
import logger from '../utils/logger.js';

// GET /api/customers
export const listCustomers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || null;

    const customers = await CustomerModel.findAll({ limit, offset, search });
    return res.json({ success: true, data: customers, meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
export const getCustomer = async (req, res, next) => {
  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado.' } });
    }
    return res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id/orders
export const getCustomerOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const customer = await CustomerModel.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado.' } });
    }

    const orders = await CustomerModel.getOrders(id, { limit, offset });
    return res.json({ success: true, data: orders, meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, document } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Nome do cliente é obrigatório.' } });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: { message: 'E-mail inválido.' } });
      }
      const dupEmail = await CustomerModel.findByEmail(email);
      if (dupEmail) {
        return res.status(409).json({ success: false, error: { message: 'E-mail já cadastrado.' } });
      }
    }

    if (document) {
      const dupDoc = await CustomerModel.findByDocument(document);
      if (dupDoc) {
        return res.status(409).json({ success: false, error: { message: 'CPF/CNPJ já cadastrado.' } });
      }
    }

    const customer = await CustomerModel.create({ name, email, phone, document });
    logger.info(`[Customer] Criado id=${customer.id}`);
    return res.status(201).json({ success: true, data: customer });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: { message: 'Dados duplicados. Verifique e-mail ou documento.' } });
    }
    next(err);
  }
};

// PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await CustomerModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado.' } });
    }

    const { email, document } = req.body;

    if (email && email !== existing.email) {
      const dupEmail = await CustomerModel.findByEmail(email);
      if (dupEmail) {
        return res.status(409).json({ success: false, error: { message: 'E-mail já cadastrado em outro cliente.' } });
      }
    }

    if (document && document.replace(/[^\d]/g, '') !== existing.document) {
      const dupDoc = await CustomerModel.findByDocument(document);
      if (dupDoc) {
        return res.status(409).json({ success: false, error: { message: 'CPF/CNPJ já cadastrado em outro cliente.' } });
      }
    }

    const updated = await CustomerModel.update(id, req.body);
    logger.info(`[Customer] Atualizado id=${id}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await CustomerModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado.' } });
    }

    await CustomerModel.delete(id);
    logger.info(`[Customer] Excluído id=${id}`);
    return res.json({ success: true, data: { message: 'Cliente excluído com sucesso.' } });
  } catch (err) {
    next(err);
  }
};
