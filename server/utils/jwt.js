import jwt from 'jsonwebtoken';
import logger from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET           = process.env.JWT_SECRET           || 'default-secret-change-in-production';
const JWT_EXPIRES_IN       = process.env.JWT_EXPIRES_IN       || '15m';   // access token padrão
const REFRESH_EXPIRES_IN   = process.env.REFRESH_EXPIRES_IN  || '7d';    // refresh token padrão

export const generateToken = (payloadOrId, expiresIn = JWT_EXPIRES_IN) => {
  const payload = typeof payloadOrId === 'number' ? { id: payloadOrId } : payloadOrId;
  return jwt.sign(payload, JWT_SECRET, expiresIn ? { expiresIn } : undefined);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('Token verification failed:', error.message);
    throw error;
  }
};

export const signRefreshToken = (payloadOrId, expiresIn = REFRESH_EXPIRES_IN) => {
  const payload = typeof payloadOrId === 'number' ? { id: payloadOrId } : payloadOrId;
  return jwt.sign(payload, JWT_SECRET, expiresIn ? { expiresIn } : undefined);
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    throw error;
  }
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Token de acesso não fornecido' },
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({
      success: false,
      error: { message: 'Token inválido ou expirado' },
    });
  }
};

export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: { message: 'Acesso negado' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Permissão insuficiente' },
      });
    }

    next();
  };
};