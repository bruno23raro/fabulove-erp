/**
 * Auth Controller — register, login, refresh, logout, me
 *
 * Segurança:
 * - Mensagens de erro genéricas para não vazar existência de contas
 * - bcrypt para hash de senhas
 * - JWT access (15 min) + refresh (7 dias) com rotação
 * - Bloqueio após tentativas excessivas
 */

import { UserModel, RefreshTokenModel } from '../models/user.model.js';
import { comparePassword, validatePassword } from '../utils/password.js';
import { generateToken, signRefreshToken } from '../utils/jwt.js';
import { createError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

/**
 * Gera par de tokens access + refresh
 */
const issueTokenPair = async (user, req) => {
  const payload = { sub: user.id, email: user.email, role: user.role };

  // Access token JWT (15 min)
  const accessToken = generateToken(payload, '15m');

  // Refresh token opaco (256 bits de entropia)
  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId: user.id,
    token: rawRefreshToken,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return { accessToken, refreshToken: rawRefreshToken, expiresAt };
};

/**
 * Sanitiza usuário para resposta (nunca expõe hash da senha)
 */
const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  is_active: user.is_active,
  last_login_at: user.last_login_at,
  created_at: user.created_at,
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Nome, e-mail e senha são obrigatórios.' },
      });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'E-mail inválido.' },
      });
    }

    // Validação de senha
    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Senha não atende aos requisitos.', details: pwValidation.errors },
      });
    }

    // Usuários públicos não podem definir role admin
    const role = 'operator'; // papel padrão; admin só via console

    // Verificar duplicidade — sem vazar existência via timing,
    // mas um registro já existente retorna 409 pela constraint do BD.
    // A mensagem aqui é intencionalmente genérica.
    let newUser;
    try {
      newUser = await UserModel.create({ name, email, password, role });
    } catch (dbErr) {
      if (dbErr.code === '23505') { // unique_violation (pg)
        return res.status(409).json({
          success: false,
          error: { message: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' },
        });
      }
      throw dbErr;
    }

    const { accessToken, refreshToken, expiresAt } = await issueTokenPair(newUser, req);

    logger.info(`[Auth] Novo usuário registrado id=${newUser.id} role=${newUser.role}`);

    return res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(newUser),
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'E-mail e senha são obrigatórios.' },
      });
    }

    const user = await UserModel.findByEmail(email);

    // Mensagem genérica para não revelar se o e-mail existe
    const GENERIC_ERROR = { message: 'Credenciais inválidas.' };

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Verifica bloqueio
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: { message: `Conta temporariamente bloqueada. Tente novamente em ${minutesLeft} minuto(s).` },
      });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      await UserModel.incrementFailedAttempts(user.id);
      logger.warn(`[Auth] Tentativa de login malsucedida user=${user.id} ip=${req.ip}`);
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Sucesso — zera tentativas e registra IP/timestamp
    await UserModel.recordSuccessfulLogin(user.id, req.ip);

    const { accessToken, refreshToken, expiresAt } = await issueTokenPair(user, req);

    logger.info(`[Auth] Login bem-sucedido user=${user.id} ip=${req.ip}`);

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: rawToken } = req.body;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token é obrigatório.' },
      });
    }

    // Detectar reutilização de token revogado (possível roubo)
    const reuseRecord = await RefreshTokenModel.detectReuse(rawToken);
    if (reuseRecord) {
      // Token rotacionado reutilizado — revogar toda a família de sessão
      logger.warn(`[Auth] Reutilização de refresh token detectada user=${reuseRecord.user_id} ip=${req.ip}`);
      await RefreshTokenModel.revokeAllForUser(reuseRecord.user_id);
      return res.status(401).json({
        success: false,
        error: { message: 'Sessão inválida. Por favor, faça login novamente.' },
      });
    }

    const tokenRecord = await RefreshTokenModel.findValid(rawToken);
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token inválido ou expirado.' },
      });
    }

    const user = await UserModel.findById(tokenRecord.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { message: 'Sessão inválida.' },
      });
    }

    // Gerar novo par — rotacionar o refresh token
    const newTokens = await issueTokenPair(user, req);

    // Revogar o token antigo, apontando para o novo
    await RefreshTokenModel.revoke(rawToken, newTokens.refreshToken);

    logger.info(`[Auth] Token renovado user=${user.id} ip=${req.ip}`);

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        refreshTokenExpiresAt: newTokens.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const { refreshToken: rawToken } = req.body;

    if (rawToken) {
      await RefreshTokenModel.revoke(rawToken);
    }

    // Se quiser logout total (revogar todos os tokens do usuário),
    // basta chamar RefreshTokenModel.revokeAllForUser(req.user.id) aqui.
    // O access JWT permanece válido até expirar (stateless), por isso
    // o frontend deve descartá-lo imediatamente ao receber este 200.

    logger.info(`[Auth] Logout user=${req.user?.sub || 'anonymous'} ip=${req.ip}`);

    return res.status(200).json({
      success: true,
      data: { message: 'Sessão encerrada com sucesso.' },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
export const me = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.sub);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuário não encontrado.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
};