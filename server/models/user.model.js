/**
 * Modelos de usuário e tokens de refresh
 *
 * UserModel         — CRUD de usuários, controle de tentativas de login e lockout
 * RefreshTokenModel — família de refresh tokens com rotação e detecção de reuso
 */

import crypto from 'crypto';
import pool from '../config/database.js';
import { hashPassword } from '../utils/password.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const UserModel = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, password, role = 'operator' }) {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );
    return rows[0];
  },

  async incrementFailedAttempts(id) {
    const { rows } = await pool.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE
             WHEN failed_login_attempts + 1 >= $2
             THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
             ELSE locked_until
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING failed_login_attempts, locked_until`,
      [id, 5]
    );
    return rows[0];
  },

  async recordSuccessfulLogin(id, ip) {
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = CURRENT_TIMESTAMP,
           last_login_ip = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, ip]
    );
  },

  async isLockedOut(id) {
    const { rows } = await pool.query(
      'SELECT locked_until FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    const user = rows[0];
    if (!user || !user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  },
};

export const RefreshTokenModel = {
  async create({ userId, token, expiresAt, ipAddress, userAgent }) {
    const { rows } = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, expires_at, created_at`,
      [userId, hashToken(token), expiresAt, ipAddress, userAgent]
    );
    return rows[0];
  },

  async findValid(token) {
    const { rows } = await pool.query(
      `SELECT rt.*, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > CURRENT_TIMESTAMP
         AND u.is_active = TRUE
       LIMIT 1`,
      [hashToken(token)]
    );
    return rows[0] || null;
  },

  async revoke(token, replacedByToken = null) {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           replaced_by_hash = $2
       WHERE token_hash = $1`,
      [hashToken(token), replacedByToken ? hashToken(replacedByToken) : null]
    );
  },

  async revokeAllForUser(userId) {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  },

  /**
   * Detecção de reuso: um token já revogado sendo apresentado novamente
   * indica roubo de token — retorna o registro para revogação da família.
   */
  async detectReuse(token) {
    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NOT NULL
       LIMIT 1`,
      [hashToken(token)]
    );
    return rows[0] || null;
  },

  async pruneExpired() {
    await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );
  },
};
