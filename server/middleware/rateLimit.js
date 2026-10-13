/**
 * rateLimit.js — Rate limiting para endpoints de autenticação
 *
 * Usa um Map em memória (sem dependência extra). Suficiente para uso local.
 * Para produção multi-instância, substituir por redis-rate-limiter.
 *
 * Limites padrão:
 * - Auth (login/register): 20 requests por 15 min por IP
 * - API geral: 300 requests por 15 min por IP
 */

const windows = new Map(); // ip:route -> { count, resetAt }

function createLimiter({ max, windowMs }) {
  return function rateLimitMiddleware(req, res, next) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = windows.get(key);

    if (!entry || now > entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: { message: `Muitas tentativas. Tente novamente em ${retryAfter} segundos.` },
      });
    }

    next();
  };
}

// 20 tentativas por 15 minutos — para login/register
export const authRateLimit = createLimiter({ max: 20, windowMs: 15 * 60 * 1000 });

// 300 requests por 15 minutos — para API geral
export const apiRateLimit = createLimiter({ max: 300, windowMs: 15 * 60 * 1000 });

// Limpa entradas antigas periodicamente (evita vazamento de memória)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    if (now > entry.resetAt) windows.delete(key);
  }
}, 5 * 60 * 1000);
