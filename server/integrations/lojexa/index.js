/**
 * LojeXa Integration Adapter — SIZEN ERP
 *
 * Main entry point for LojeXa Hub integration.
 * Provides adapters for connecting, syncing, and managing marketplace integrations
 * through the LojeXa Hub platform.
 *
 * Architecture: ERP ↔ LojeXa Hub ↔ Marketplaces (Shopee, Mercado Livre, etc.)
 *
 * @module lojexa
 */

import { LojeXaClient, createLojeXaClient } from './client.js';
import {
  buildConnectUrl,
  handleCallback,
  refreshToken,
  validateState,
  getConnectionStatus,
  generateState,
  LOJEXA_SCOPES,
} from './connect.js';
import {
  encryptCredential,
  decryptCredential,
  deriveTenantKey,
  isMasterKeyConfigured,
  CredentialStore,
  CredentialTypes,
  storeApiKey,
  getApiKey,
  storeWebhookSecret,
  getWebhookSecret,
} from './credentialStore.js';
import {
  validateWebhookSignature,
  parseWebhookPayload,
  handleWebhookEvent,
  processWebhook,
  WEBHOOK_EVENTS,
  generateEventId,
} from './webhook.js';
import {
  CHANNELS,
  CHANNEL_CONFIG,
  getChannelList,
  getChannelConfig,
  isChannelSupported,
  getChannelsByFeature,
  getPrimaryChannelForRegion,
  Catalog,
  createCatalogItem,
  validateCatalogItem,
} from './catalog.js';
import {
  LOJEXA_ERRORS,
  LojeXaError,
  mapLojeXaError,
  errorResponse,
  successResponse,
  isRetryable,
  isRecoverable,
} from './errors.js';
import {
  CACHE_CONFIG,
  getCacheKey,
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheByType,
  clearCache,
  getCacheStats,
  getCachedStore,
  getCachedProducts,
  getCachedMapping,
  startCacheCleanup,
} from './cache.js';
import {
  getQueue,
  enqueueJob,
  getQueueStats,
  clearQueue,
  calculateBackoff,
  OPERATIONS,
} from './queue.js';
import {
  SCOPE_REQUIREMENTS,
  MINIMUM_SCOPES,
  DEFAULT_OAUTH_SCOPES,
  hasRequiredScopes,
  getMissingScopes,
  validateScope,
  parseScopes,
  getScopeDescriptions,
  LOJEXA_SCOPES as SCOPE_LOJEXA,
} from './scopes.js';

// Export all components
export {
  // Client
  LojeXaClient,
  createLojeXaClient,

  // OAuth & Connection
  buildConnectUrl,
  handleCallback,
  refreshToken,
  validateState,
  getConnectionStatus,
  generateState,
  LOJEXA_SCOPES,

  // Credential Store
  encryptCredential,
  decryptCredential,
  deriveTenantKey,
  isMasterKeyConfigured,
  CredentialStore,
  CredentialTypes,
  storeApiKey,
  getApiKey,
  storeWebhookSecret,
  getWebhookSecret,

  // Webhook
  validateWebhookSignature,
  parseWebhookPayload,
  handleWebhookEvent,
  processWebhook,
  WEBHOOK_EVENTS,
  generateEventId,

  // Catalog
  CHANNELS,
  CHANNEL_CONFIG,
  getChannelList,
  getChannelConfig,
  isChannelSupported,
  getChannelsByFeature,
  getPrimaryChannelForRegion,
  Catalog,
  createCatalogItem,
  validateCatalogItem,

  // Errors
  LOJEXA_ERRORS,
  LojeXaError,
  mapLojeXaError,
  errorResponse,
  successResponse,
  isRetryable,
  isRecoverable,

  // Cache
  CACHE_CONFIG,
  getCacheKey,
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheByType,
  clearCache,
  getCacheStats,
  getCachedStore,
  getCachedProducts,
  getCachedMapping,
  startCacheCleanup,

  // Queue
  getQueue,
  enqueueJob,
  getQueueStats,
  clearQueue,
  calculateBackoff,
  OPERATIONS,

  // Scopes
  SCOPE_REQUIREMENTS,
  MINIMUM_SCOPES,
  DEFAULT_OAUTH_SCOPES,
  hasRequiredScopes,
  getMissingScopes,
  validateScope,
  parseScopes,
  getScopeDescriptions,
  SCOPE_LOJEXA,
};

// Default export with convenience methods
export default {
  // Client creation
  createClient: createLojeXaClient,

  // Connection management
  connect: buildConnectUrl,
  handleCallback,

  // Credential management
  storeCredential: CredentialStore.store.bind(CredentialStore),
  getCredential: CredentialStore.retrieve.bind(CredentialStore),
  deleteCredential: CredentialStore.delete.bind(CredentialStore),

  // Webhook handling
  validateSignature: validateWebhookSignature,
  handleWebhook: handleWebhookEvent,

  // Catalog operations
  getChannels: getChannelList,
  getChannelInfo: getChannelConfig,
  listProducts: Catalog.getByChannel,

  // Error mapping
  mapError: mapLojeXaError,

  // Version info
  version: '1.0.0',
  name: '@sizen/lojexa-adapter',
};