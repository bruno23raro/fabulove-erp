/**
 * SIZEN ERP — Validações com Zod
 *
 * schemas para input validation em controllers e rotas.
 */

import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
  role: z.enum(['admin', 'manager', 'seller']).default('seller'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

// ─── Products ────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU é obrigatório').max(100),
  price: z.number().min(0, 'Preço deve ser >= 0'),
  cost: z.number().min(0, 'Custo deve ser >= 0').optional(),
  stock: z.number().int().min(0, 'Estoque deve ser >= 0').default(0),
  category_id: z.number().int().positive('Categoria inválida').optional(),
  barcode: z.string().max(50).optional(),
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Customers ───────────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  document: z.string().max(20).optional(),
  type: z.enum(['person', 'company']).default('person'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zip_code: z.string().optional(),
});

// ─── Orders ──────────────────────────────────────────────────────────────────
export const createOrderSchema = z.object({
  customer_id: z.number().int().positive('Cliente é obrigatório'),
  items: z.array(z.object({
    product_id: z.number().int().positive('Produto é obrigatório'),
    quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
    unit_price: z.number().min(0, 'Preço deve ser >= 0'),
  })).min(1, 'Pedido deve ter pelo menos 1 item'),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).default('pending'),
  notes: z.string().optional(),
});

// ─── Categories ──────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().optional(),
  parent_id: z.number().int().positive().optional(),
});

// ─── Financial ───────────────────────────────────────────────────────────────
export const createAccountSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  type: z.enum(['receivable', 'payable']),
  amount: z.number().min(0.01, 'Valor deve ser > 0'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
  status: z.enum(['pending', 'paid', 'overdue', 'written_off']).default('pending'),
  customer_id: z.number().int().positive().optional(),
  supplier_id: z.number().int().positive().optional(),
});

// ─── CRM ─────────────────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  contact_name: z.string().min(1, 'Nome é obrigatório').max(255),
  company: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  value: z.number().min(0).default(0),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'closed_won', 'closed_lost']).default('new'),
  source: z.enum(['manual', 'shopee', 'ml', 'website', 'referral']).default('manual'),
  notes: z.string().optional(),
});

export const createDealSchema = z.object({
  lead_id: z.number().int().positive('Lead é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  pipeline_stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).default('prospecting'),
  expected_value: z.number().min(0).default(0),
  probability: z.number().int().min(0).max(100).default(50),
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)').optional().or(z.literal('')),
});

export const createActivitySchema = z.object({
  type: z.enum(['call', 'meeting', 'email', 'note', 'task']),
  subject: z.string().max(255).optional(),
  lead_id: z.number().int().positive().optional(),
  deal_id: z.number().int().positive().optional(),
  scheduled_at: z.string().optional(),
  description: z.string().optional(),
});

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  document: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
});

// ─── Purchases ───────────────────────────────────────────────────────────────
export const createPurchaseSchema = z.object({
  supplier_id: z.number().int().positive('Fornecedor é obrigatório'),
  items: z.array(z.object({
    product_id: z.number().int().positive('Produto é obrigatório'),
    quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
    unit_cost: z.number().min(0, 'Custo deve ser >= 0'),
  })).min(1, 'Compra deve ter pelo menos 1 item'),
  notes: z.string().optional(),
});

// ─── PDV ─────────────────────────────────────────────────────────────────────
export const createCartSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive('Produto é obrigatório'),
    quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
  })).min(1, 'Carrinho deve ter pelo menos 1 item'),
});

export const completeSaleSchema = z.object({
  payment_methods: z.array(z.object({
    type: z.enum(['cash', 'credit', 'debit', 'pix', 'other']),
    amount: z.number().min(0, 'Valor deve ser >= 0'),
  })).min(1, 'Deve ter pelo menos 1 forma de pagamento'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// ─── Stock ───────────────────────────────────────────────────────────────────
export const stockMovementSchema = z.object({
  product_id: z.number().int().positive('Produto é obrigatório'),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().min(1, 'Quantidade deve ser >= 1'),
  reason: z.string().optional(),
});

// ─── Generic query params ───────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Helper: validate request body ──────────────────────────────────────────
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ success: false, error: { message: 'Validação falhou', details: errors } });
    }
    req.validatedBody = result.data;
    next();
  };
}

// ─── Helper: validate query params ──────────────────────────────────────────
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ success: false, error: { message: 'Parâmetros inválidos', details: errors } });
    }
    req.validatedQuery = result.data;
    next();
  };
}
