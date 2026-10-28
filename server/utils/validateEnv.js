/**
 * validateEnv.js — Validação de variáveis de ambiente no boot
 *
 * Chamado antes de iniciar o servidor. Registra avisos para vars opcionais
 * e encerra o processo para vars obrigatórias ausentes.
 */

const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'PORT', 'NODE_ENV'];
const INSECURE_JWT_DEFAULTS = [
  'fabulove-erp-dev-secret-change-in-production-use-128-chars-min',
  'default-secret-change-in-production',
];

export function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[ENV] ❌ Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    console.error('[ENV] Verifique o arquivo .env e tente novamente.');
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[ENV] ❌ JWT_SECRET não definido. O servidor não pode iniciar de forma segura.');
    process.exit(1);
  }

  if (INSECURE_JWT_DEFAULTS.includes(jwtSecret) && process.env.NODE_ENV === 'production') {
    console.error('[ENV] ❌ JWT_SECRET está usando um valor padrão inseguro em produção. Defina um segredo de 128+ chars.');
    process.exit(1);
  }

  if (INSECURE_JWT_DEFAULTS.includes(jwtSecret)) {
    console.warn('[ENV] ⚠️  JWT_SECRET está usando valor padrão de desenvolvimento. TROQUE antes de ir para produção.');
  }

  if (!process.env.DB_PASSWORD) {
    console.warn('[ENV] ⚠️  DB_PASSWORD não definido — usando sem senha (só aceitável localmente).');
  }

  if (!process.env.NVIDIA_NIM_API_KEY && !process.env.AGNES_AI_API_KEY) {
    console.warn('[ENV] ℹ️  NVIDIA_NIM_API_KEY e AGNES_AI_API_KEY não definidos — módulo de automação IA desabilitado.');
  }

  console.log(`[ENV] ✅ Ambiente validado. NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
}
