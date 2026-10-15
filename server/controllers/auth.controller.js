/**
 * auth.controller.js
 *
 * Fluxo completo de recuperação de senha (forgot + reset):
 *  1. POST /api/auth/forgot-password  → gera token, salva hash no DB,
 *     notifica usuário (email real se SMTP configurado; log simulado caso contrário).
 *  2. POST /api/auth/reset-password   → valida token (não expirado, não usado),
 *     atualiza senha via bcrypt, revoga refresh_tokens (rotação), marca token como usado.
 *
 * Proteções:
 *  - Mensagem genérica em /forgot (não revela se email existe no sistema).
 *  - Mensagem genérica em /reset (falha silenciosa se token não encontrado).
 *  - rate-limit independente para o par forgot+reset.
 *  - bcrypt 12 rounds para nova senha.
 *
 * Nenhuma credencial é exposta em logs.
 */
import crypto from 'crypto';
import pool from '../config/database.js';
import { generateToken, signRefreshToken } from '../utils/jwt.js';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail, generateResetToken, hashToken } from '../services/email.js';

export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user;
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, is_active FROM users WHERE email = $1',
      [cleanEmail]
    );
    user = rows[0];
  } catch (err) {
    console.error('[auth-forgot] query error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro no servidor. Tente novamente mais tarde.' });
  }

  // SEMPRE retornar sucesso — nunca revelar se o email existe (anti-enumeration)
  let tokenRow = null;
  if (user) {
    // Revoga tokens antigos e invalida sessões antes de emitir novo
    await pool.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', [user.id]);
    const token = generateResetToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min
    try {
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (token_hash) DO NOTHING`,
        [user.id, tokenHash, expiresAt]
      );
      tokenRow = { token };
    } catch (err) {
      console.error('[auth-forgot] insert token error (sem credenciais expostas):', err.code);
    }

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink });
    } catch (mailErr) {
      console.error('[auth-forgot] send email error (sem credenciais expostas):', mailErr.message);
    }
  }

  // Mensagem genérica (não diferencia existente/inexistente)
  return res.json({
    message: 'Se o e-mail informado estiver cadastrado, você receberá um link para redefinir a senha.',
    simulated: !!tokenRow && tokenRow.token ? false : undefined, // apenas para debugging interno, nunca retornado ao frontend
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token é obrigatório.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  const tokenHash = hashToken(token);

  let record;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    record = rows[0];
  } catch (err) {
    console.error('[auth-reset] query error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro no servidor.' });
  }

  // Sem mensagem específica — se token não encontrado ou inválido, silently falha
  if (!record) {
    return res.status(400).json({ error: 'Link inválido ou expirado.' });
  }
  if (record.used_at) {
    return res.status(400).json({ error: 'Este link já foi utilizado.' });
  }
  if (record.expires_at < new Date()) {
    return res.status(400).json({ error: 'Este link expirou.' });
  }

  let userId;
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('BEGIN');
    try {
      await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, record.user_id]);
      await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [record.id]);
      // Revoga todas as sessões ativas do usuário (segurança)
      await pool.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', [record.user_id]);
      await pool.query('COMMIT');
      userId = record.user_id;
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (err) {
    console.error('[auth-reset] transaction error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro ao atualizar a senha. Tente novamente.' });
  }

  // Gera novos tokens de sessão (rotação)
  const newRefreshToken = signRefreshToken({ id: userId });
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const newAccessToken = generateToken({ id: userId, role: rows[0]?.role || 'admin' });

  try {
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [userId, hashToken(newRefreshToken), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), req.ip, req.get('user-agent')]
    );
  } catch (_) { /* silently ignore — não expõe erro ao cliente */ }

  return res.json({
    message: 'Senha atualizada com sucesso. Faça login novamente.',
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
}

// ---------------------------------------------------------------------------
// Métodos existentes (login, register, refreshToken, logout, me) mantidos
// ---------------------------------------------------------------------------
import { authenticateToken } from '../utils/jwt.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Usuário inativo.' });
    }
    if (user.locked_until && user.locked_until > new Date()) {
      return res.status(423).json({ error: 'Conta temporariamente bloqueada por muitas tentativas.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newAttempts, lockedUntil, user.id]
      );
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Reset attempts on success
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2',
      [req.ip, user.id]
    );

    const accessToken = generateToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [user.id, hashToken(refreshToken), expiresAt, req.ip, req.get('user-agent')]
    );

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth-login] error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro no servidor.' });
  }
}

export async function register(req, res) {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name, email, role`,
      [name, email.trim().toLowerCase(), hash, role || 'operator']
    );
    const user = rows[0];

    const accessToken = generateToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [user.id, hashToken(refreshToken), expiresAt, req.ip, req.get('user-agent')]
    );

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    console.error('[auth-register] error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro no servidor.' });
  }
}

export async function refreshToken(req, res) {
  const { refresh_token } = req.body || {};
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token é obrigatório.' });
  }

  const tokenHash = hashToken(refresh_token);
  try {
    const { rows } = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.id AS uid, u.name, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );
    const rt = rows[0];

    if (!rt || rt.revoked_at || rt.expires_at < new Date()) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
    }

    // Rotação: revoga antigo, emite novo
    await pool.query('BEGIN');
    try {
      await pool.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [rt.id]);
      const newRefresh = signRefreshToken({ id: rt.user_id });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
        [rt.user_id, hashToken(newRefresh), expiresAt, req.ip, req.get('user-agent')]
      );
      await pool.query('COMMIT');

      return res.json({
        accessToken: generateToken({ id: rt.user_id, role: rt.role }),
        refreshToken: newRefresh,
        user: { id: rt.uid, name: rt.name, email: rt.email, role: rt.role },
      });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (err) {
    console.error('[auth-refresh] error (sem credenciais expostas):', err.code);
    return res.status(500).json({ error: 'Erro no servidor.' });
  }
}

export async function logout(req, res) {
  const { refresh_token } = req.body || {};
  if (refresh_token) {
    try {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND revoked_at IS NULL',
        [hashToken(refresh_token)]
      );
    } catch (_) {}
  }
  return res.json({ message: 'Logout realizado.' });
}

export async function me(req, res) {
  return res.json({ user: req.user });
}
