/**
 * Rotas de Automação IA
 *
 * Módulo de integração com OpenAI para sugestões automáticas.
 * Requer OPENAI_API_KEY no .env para funcionar plenamente.
 *
 * GET /api/automation/status  — verificar se integração está configurada
 */

import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/status', (req, res) => {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  return res.json({
    success: true,
    data: {
      configured,
      message: configured
        ? 'Integração com OpenAI configurada.'
        : 'Configure OPENAI_API_KEY no .env para habilitar automações IA.',
    },
  });
});

// Placeholder para futuras rotas de automação
router.get('/', authorizeRole('admin', 'manager'), (req, res) => {
  return res.json({
    success: true,
    data: { message: 'Módulo de automações IA — em desenvolvimento.' },
  });
});

export default router;
