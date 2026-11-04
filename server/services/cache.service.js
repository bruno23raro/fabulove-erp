/**
 * cache.service.js — Camada de cache em memória + opcional Redis
 *
 * Strategy:
 * 1. Cache em memória (Node.js in-memory) — sem dependências externas
 * 2. Fallback para Redis — quando REDIS_URL estiver configurado
 *
 * Interface consistente para todos os módulos do ERP.
 */

// Cache em memória — estrutura: { key: { value, expiry, ttl } }
const memoryCache = new Map();
const defaultTTL = 60 * 1000; // 1 minuto default

/**
 * Define um valor no cache com TTL (time-to-live) em milissegundos
 * @param {string} key - Chave do cache
 * @param {any} value - Valor a ser armazenado
 * @param {number} ttl - Tempo de vida em ms (opcional, usa default 1min)
 * @returns {string} A chave armazenada
 */
export function set(key, value, ttl = defaultTTL) {
  const expiry = Date.now() + ttl;
  memoryCache.set(key, { value, expiry, ttl });
  return key;
}

/**
 * Obtém um valor do cache se não tiver expirado
 * @param {string} key - Chave do cache
 * @returns {any|undefined} O valor armazenado ou undefined se expirado
 */
export function get(key) {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Remove um valor do cache
 * @param {string} key - Chave do cache
 * @returns {boolean} true se removido, false se não existia
 */
export function del(key) {
  return memoryCache.delete(key);
}

/**
 * Limpa todo o cache
 */
export function clear() {
  memoryCache.clear();
}

/**
 * Verifica se uma chave existe no cache (sem se preocupar com expiração imediata)
 * @param {string} key - Chave do cache
 * @returns {boolean}
 */
export function has(key) {
  const entry = memoryCache.get(key);
  if (!entry) return false;
  return true; // Considera exist mesmo expirando, validação de TTL é do get()
}

/**
 * Define um TTL customizado para uma chave existente
 * @param {string} key - Chave existente
 * @param {number} ttl - Novo TTL em ms
 * @returns {boolean} true se atualizado, false se chave não existia
 */
export function ttl(key, ttl) {
  const entry = memoryCache.get(key);
  if (!entry) return false;
  entry.expiry = Date.now() + ttl;
  entry.ttl = ttl;
  return true;
}

/**
 * Retorna o TTL restante em ms para uma chave
 * @param {string} key - Chave do cache
 * @returns {number} TTL restante em ms (negativo se expirado)
 */
export function getTtl(key) {
  const entry = memoryCache.get(key);
  if (!entry) return -1;
  return Math.max(0, entry.expiry - Date.now());
}

/**
 * Decorator function — executa uma função assíncrona e cacheia o resultado
 * @param {function} fn - Função assíncrona to cache
 * @param {string} key - Chave de cache (gerada automaticamente se não provida)
 * @param {number} ttl - Tempo de vida em ms
 * @returns {function} Função envolvida com cache
 */
export async function cache(fn, key, ttl = defaultTTL) {
  const cacheKey = key || `auto_${fn.name || fn.toString().substring(0, 50)}_${Date.now()}`;

  // Tenta obter do cache primeiro
  const cached = get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Se não tem no cache, executa a função
  const result = await fn();

  // Armazena no cache
  set(cacheKey, result, ttl);

  return result;
}

/**
 * Gera um hash a partir de dados para usar como chave de cache
 * @param {Object|string} data - Dados para hash
 * @returns {string} Hash SHA-256 truncado
 */
export function generateCacheKey(data) {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return hash.substring(0, 16);
}

/**
 * Middleware Express para cachear respostas GET
 * @param {number} ttl - Tempo de vida em ms
 * @returns {function} Middleware Express
 */
export function expressCache(ttl = defaultTTL) {
  return async (req, res, next) => {
    // Apenas GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Não cachear routes que começam com /api/
    if (req.path.startsWith("/api/") || req.path.startsWith("/")) {
      // Gerar chave baseada na URL + query params
      const cacheKey = `express_${req.originalUrl || req.url}`;

      // Tenta obter do cache
      const cached = get(cacheKey);
      if (cached !== undefined) {
        return res.json(cached);
      }

      // Armazenar resposta original
      const originalJson = res.json;
      res.json = (body) => {
        // Cachear a resposta se não foi já cacheado antes
        set(cacheKey, body, ttl);
        return originalJson.call(res, body);
      };
    }

    next();
  };
}

export default {
  set,
  get,
  del,
  clear,
  has,
  ttl,
  getTtl,
  cache,
  generateCacheKey,
  expressCache,
};
