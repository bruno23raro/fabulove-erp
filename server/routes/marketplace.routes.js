/**
 * Rotas de Integrações com Marketplaces
 *
 * Módulo futuro para Shopee, Mercado Livre, Amazon etc.
 * Requer configuração de credenciais no .env.
 *
 * GET /api/marketplaces/status — estado das integrações configuradas
 */

import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/status', (req, res) => {
  const integrations = [
    { name: 'Shopee', key: 'SHOPEE_API_KEY', configured: Boolean(process.env.SHOPEE_API_KEY) },
    { name: 'Mercado Livre', key: 'MERCADOLIVRE_API_KEY', configured: Boolean(process.env.MERCADOLIVRE_API_KEY) },
  ];

  return res.json({
    success: true,
    data: {
      integrations,
      message: 'Configure as chaves de API no .env para habilitar cada marketplace.',
    },
  });
});

router.get('/', authorizeRole('admin', 'manager'), (req, res) => {
  return res.json({
    success: true,
    data: { message: 'Módulo de marketplaces — em desenvolvimento.' },
  });
});

export default router;
