/**
 * Production Guards — Runtime safety checks for production deployments
 *
 * Called at app startup to prevent misconfiguration in production.
 */

export function assertMockGuard() {
  const mock = process.env.MARKETPLACE_MOCK === "true";
  const prod = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (mock && prod) {
    console.warn("[guard] MARKETPLACE_MOCK=true em producao — sync real desativado");
    if (process.env.MARKETPLACE_MOCK_STRICT === "true") {
      throw new Error("MARKETPLACE_MOCK=true em producao com MOCK_STRICT ligado");
    }
  }
}

/**
 * Validate required production env vars
 * @param {string[]} requiredVars - List of required env var names
 * @throws {Error} if any required var is missing in production
 */
export function assertRequiredEnv(requiredVars = []) {
  const prod = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (!prod) return;

  const missing = requiredVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente obrigatorias ausentes em producao: ${missing.join(", ")}`);
  }
}

/**
 * Validate database connection config
 */
export function assertDatabaseConfig() {
  const hasUrl = !!process.env.DATABASE_URL;
  const hasLocal = !!(process.env.DB_HOST && process.env.DB_PASSWORD);

  if (!hasUrl && !hasLocal) {
    throw new Error(
      "Configuracao de banco ausente: defina DATABASE_URL (Supabase/Vercel) ou DB_HOST/DB_PASSWORD (local)"
    );
  }
}

/**
 * Run all production guards
 * @param {object} options
 * @param {string[]} options.requiredEnv - Additional required env vars
 */
export function runProductionGuards(options = {}) {
  assertMockGuard();
  assertDatabaseConfig();
  if (options.requiredEnv) {
    assertRequiredEnv(options.requiredEnv);
  }
}

export default {
  assertMockGuard,
  assertRequiredEnv,
  assertDatabaseConfig,
  runProductionGuards,
};
