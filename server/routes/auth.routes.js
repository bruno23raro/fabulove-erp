/**
 * Rotas de autenticação
 *
 * POST   /api/auth/register   - Registrar novo usuário
 * POST   /api/auth/login      - Autenticar (login)
 * POST   /api/auth/refresh    - Renovar access token
 * POST   /api/auth/logout     - Encerrar sessão
 * GET    /api/auth/me         - Perfil do usuário atual
 */

import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  me,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

// Registro
router.post('/register', register);

// Login
router.post('/login', login);

// Renovação de token (pode ser feito sem auth)
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', authenticateToken, logout);

// Perfil — protegido
router.get('/me', authenticateToken, me);

// Recuperação de senha (sem auth — usuário não está logado)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
