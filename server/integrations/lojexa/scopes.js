/**
 * LojeXa Scopes — OAuth scope definitions and validation
 *
 * Defines minimum scopes required for each operation,
 * and validates scope requirements before API calls.
 */

/**
 * OAuth scopes required by LojeXa Hub
 * @see https://docs.lojexa.com/scopes
 */
export const LOJEXA_SCOPES = {
  // Read scopes
  READ_PRODUCTS: 'read:products',
  READ_ORDERS: 'read:orders',
  READ_STOCK: 'read:stock',
  READ_CHANNELS: 'read:channels',
  READ_STORES: 'read:stores',

  // Write scopes
  WRITE_SALES: 'write:sales',
  WRITE_STOCK: 'write:stock',
  WRITE_PRODUCTS: 'write:products',

  // Management scopes
  MANAGE_MAPPINGS: 'manage:mappings',
  MANAGE_CONNECTIONS: 'manage:connections',
  MANAGE_WEBHOOKS: 'manage:webhooks',
};

/**
 * Scope requirement map - operation -> required scopes
 */
export const SCOPE_REQUIREMENTS = {
  // Stock operations
  'stock:get': [LOJEXA_SCOPES.READ_STOCK],
  'stock:update': [LOJEXA_SCOPES.WRITE_STOCK, LOJEXA_SCOPES.READ_STOCK],

  // Product operations
  'products:list': [LOJEXA_SCOPES.READ_PRODUCTS, LOJEXA_SCOPES.READ_CHANNELS],
  'products:get': [LOJEXA_SCOPES.READ_PRODUCTS],
  'products:create': [LOJEXA_SCOPES.WRITE_PRODUCTS],
  'products:update': [LOJEXA_SCOPES.WRITE_PRODUCTS, LOJEXA_SCOPES.READ_PRODUCTS],
  'products:sync': [LOJEXA_SCOPES.READ_PRODUCTS],

  // Order operations
  'orders:list': [LOJEXA_SCOPES.READ_ORDERS],
  'orders:get': [LOJEXA_SCOPES.READ_ORDERS],
  'orders:create': [LOJEXA_SCOPES.WRITE_SALES],
  'orders:cancel': [LOJEXA_SCOPES.WRITE_SALES],

  // Connection operations
  'connections:list': [LOJEXA_SCOPES.READ_STORES],
  'connections:create': [LOJEXA_SCOPES.MANAGE_CONNECTIONS],
  'connections:delete': [LOJEXA_SCOPES.MANAGE_CONNECTIONS],

  // Webhook operations
  'webhooks:register': [LOJEXA_SCOPES.MANAGE_WEBHOOKS],
  'webhooks:process': [LOJEXA_SCOPES.MANAGE_WEBHOOKS],

  // Mapping operations
  'mappings:list': [LOJEXA_SCOPES.MANAGE_MAPPINGS],
  'mappings:create': [LOJEXA_SCOPES.MANAGE_MAPPINGS],
  'mappings:update': [LOJEXA_SCOPES.MANAGE_MAPPINGS],

  // Health check (no scopes needed)
  'health': [],
};

/**
 * Minimum scopes for full integration
 */
export const MINIMUM_SCOPES = [
  LOJEXA_SCOPES.READ_PRODUCTS,
  LOJEXA_SCOPES.READ_ORDERS,
  LOJEXA_SCOPES.READ_STOCK,
  LOJEXA_SCOPES.WRITE_SALES,
  LOJEXA_SCOPES.WRITE_STOCK,
  LOJEXA_SCOPES.MANAGE_MAPPINGS,
];

/**
 * Default scopes requested during OAuth
 */
export const DEFAULT_OAUTH_SCOPES = [
  LOJEXA_SCOPES.READ_PRODUCTS,
  LOJEXA_SCOPES.READ_ORDERS,
  LOJEXA_SCOPES.READ_STOCK,
  LOJEXA_SCOPES.WRITE_SALES,
  LOJEXA_SCOPES.WRITE_STOCK,
  LOJEXA_SCOPES.MANAGE_MAPPINGS,
].join(' ');

/**
 * Check if required scopes are present in granted scopes
 * @param {string[]} grantedScopes - Scopes granted by user
 * @param {string[]} requiredScopes - Scopes required for operation
 * @returns {boolean}
 */
export function hasRequiredScopes(grantedScopes, requiredScopes) {
  if (!grantedScopes || !requiredScopes) {
    return false;
  }

  const grantedSet = new Set(grantedScopes);
  return requiredScopes.every((scope) => grantedSet.has(scope));
}

/**
 * Get missing scopes
 * @param {string[]} grantedScopes - Scopes granted by user
 * @param {string[]} requiredScopes - Scopes required for operation
 * @returns {string[]} Missing scopes
 */
export function getMissingScopes(grantedScopes, requiredScopes) {
  if (!grantedScopes || !requiredScopes) {
    return requiredScopes || [];
  }

  const grantedSet = new Set(grantedScopes);
  return requiredScopes.filter((scope) => !grantedSet.has(scope));
}

/**
 * Validate operation has required scopes
 * @param {string} operation - Operation name
 * @param {string[]} grantedScopes - Scopes granted by user
 * @returns {{valid: boolean, missing: string[]}}
 */
export function validateScope(operation, grantedScopes) {
  const required = SCOPE_REQUIREMENTS[operation] || [];

  if (required.length === 0) {
    return { valid: true, missing: [] };
  }

  const missing = getMissingScopes(grantedScopes, required);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Parse scope string into array
 * @param {string} scopeString - Space-separated scopes
 * @returns {string[]}
 */
export function parseScopes(scopeString) {
  if (!scopeString) return [];
  return scopeString.split(' ').filter(Boolean);
}

/**
 * Get scopes description for documentation
 */
export function getScopeDescriptions() {
  return {
    [LOJEXA_SCOPES.READ_PRODUCTS]: 'Read product catalog and details',
    [LOJEXA_SCOPES.READ_ORDERS]: 'Read order information',
    [LOJEXA_SCOPES.READ_STOCK]: 'Read inventory/stock levels',
    [LOJEXA_SCOPES.READ_CHANNELS]: 'Read channel information',
    [LOJEXA_SCOPES.READ_STORES]: 'Read store information',
    [LOJEXA_SCOPES.WRITE_SALES]: 'Report sales and order updates',
    [LOJEXA_SCOPES.WRITE_STOCK]: 'Update stock/inventory',
    [LOJEXA_SCOPES.WRITE_PRODUCTS]: 'Create and update products',
    [LOJEXA_SCOPES.MANAGE_MAPPINGS]: 'Manage SKU and channel mappings',
    [LOJEXA_SCOPES.MANAGE_CONNECTIONS]: 'Manage channel connections',
    [LOJEXA_SCOPES.MANAGE_WEBHOOKS]: 'Manage webhook subscriptions',
  };
}

export default {
  LOJEXA_SCOPES,
  SCOPE_REQUIREMENTS,
  MINIMUM_SCOPES,
  DEFAULT_OAUTH_SCOPES,
  hasRequiredScopes,
  getMissingScopes,
  validateScope,
  parseScopes,
  getScopeDescriptions,
};