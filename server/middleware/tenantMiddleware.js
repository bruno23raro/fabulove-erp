/**
 * tenantMiddleware.js — Middleware de isolamento de tenant por JWT
 *
 * Valida que o usuário autenticado pertence ao tenant especificado
 * nos parâmetros da rota (ex: /api/marketplaces/:marketplaceId/products)
 * ou no body. Se o tenant não bater, retorna 403 Forbidden.
 *
 * Usage:
 *   router.get('/:tenantId', authenticateToken, tenantMiddleware(), controller)
 *   router.post('/', authenticateToken, tenantMiddleware(), controller)
 */

import logger from "../utils/logger.js";

export function tenantMiddleware() {
  return async (req, res, next) => {
    try {
      // O tenant pode vir da URL param, body ou query
      const tenantFromUrl = req.params?.tenantId || req.params?.tenant;
      const tenantFromBody = req.body?.tenantId || req.body?.tenant;
      const tenantFromQuery = req.query?.tenantId || req.query?.tenant;

      // Usa o primeiro encontrado: URL > Body > Query
      const tenantId = tenantFromUrl || tenantFromBody || tenantFromQuery || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: { message: "ID do tenant não informado" },
        });
      }

      // Verifica se o usuário autenticado tem acesso a este tenant
      // O req.user é definido pelo authenticateToken middleware
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: "Usuário não autenticado" },
        });
      }

      // RBAC check: admin and manager can access any tenant
      const allowedRoles = ["admin", "manager"];
      const hasGlobalAccess = allowedRoles.includes(user.role);

      if (hasGlobalAccess) {
        // Admin/manager can access any tenant
        next();
        return;
      }

      // Regular users (operator, etc.) must have matching tenantId
      if (user.tenantId && user.tenantId === tenantId) {
        next();
        return;
      }

      // Acesso negado - tenant mismatch
      return res.status(403).json({
        success: false,
        error: {
          message: "Acesso negado a este tenant. Você pertence a um tenant diferente.",
        },
      });
    } catch (err) {
      logger.error("tenantMiddleware error:", err);
      return res.status(500).json({
        success: false,
        error: { message: "Erro interno no middleware de tenant" },
      });
    }
  };
}
