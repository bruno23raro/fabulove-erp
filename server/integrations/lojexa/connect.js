/**
 * LojeXa Connect — OAuth flow and tenant connection management
 *
 * This module handles the OAuth 2.0 Authorization Code flow for connecting
 * a tenant's marketplace accounts through LojeXa Hub.
 *
 * Flow:
 * 1. Tenant initiates connection via ERP UI
 * 2. ERP redirects to LojeXa Hub authorization URL
 * 3. Tenant authorizes in LojeXa Hub (centralized consent)
 * 4. LojeXa redirects back to ERP callback with authorization code
 * 5. ERP exchanges code for tokens and stores them (encrypted)
 * 6. ERP syncs marketplace data via LojeXa API
 */

import crypto from 'node:crypto';

// OAuth 2.0 constants
const OAUTH_AUTHORIZE_PATH = '/oauth/authorize';
const OAUTH_TOKEN_PATH = '/oauth/token';

// Scopes required for LojeXa Hub
export const LOJEXA_SCOPES = [
  'read:products',    // Read product catalog
  'read:orders',      // Read orders
  'read:stock',       // Read inventory
  'write:sales',      // Report sales
  'write:stock',      // Update stock
  'manage:mappings',  // Manage channel mappings
].join(' ');

/**
 * Generate a cryptographically secure state string for CSRF protection
 * @returns {string}
 */
export function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a secure code verifier for PKCE (if needed)
 * @returns {string}
 */
export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encode a code verifier for PKCE
 * @param {string} verifier - Code verifier string
 * @returns {string} Base64URL-encoded string
 */
export function encodeCodeVerifier(verifier) {
  return Buffer.from(verifier)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Build the LojeXa authorization URL for OAuth flow
 *
 * @param {Object} options
 * @param {string} options.clientId - LojeXa API key (used as client_id)
 * @param {string} options.redirectUri - ERP callback URL
 * @param {string} [options.state] - State string (auto-generated if not provided)
 * @param {string} [options.codeVerifier] - PKCE code verifier (optional)
 * @param {string} [options.codeChallenge] - PKCE code challenge (optional)
 * @returns {string} Authorization URL
 */
export function buildConnectUrl({
  clientId,
  redirectUri,
  state = generateState(),
  _codeVerifier = null,
  codeChallenge = null,
}) {
  if (!clientId) {
    throw new Error('clientId is required');
  }

  if (!redirectUri) {
    throw new Error('redirectUri is required');
  }

  const baseUrl = process.env.LOJEXA_BASE_URL || 'https://lojexa.com/api/v1';
  const authorizeUrl = `${baseUrl}${OAUTH_AUTHORIZE_PATH}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: LOJEXA_SCOPES,
    state,
  });

  if (codeChallenge) {
    params.set('code_challenge_method', 'S256');
    params.set('code_challenge', codeChallenge);
  }

  return `${authorizeUrl}?${params.toString()}`;
}

/**
 * Build callback URL for LojeXa OAuth
 *
 * @param {Object} options
 * @param {string} options.baseUrl - ERP base URL
 * @param {string} options.endpoint - Endpoint path (default: /api/auth/lojexa/callback)
 * @returns {string} Callback URL
 */
export function buildCallbackUrl({ baseUrl, endpoint = '/api/auth/lojexa/callback' }) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}${endpoint}`;
}

/**
 * Handle OAuth callback from LojeXa Hub
 *
 * @param {Object} options
 * @param {string} options.code - Authorization code from LojeXa
 * @param {string} options.state - State string (validate CSRF)
 * @param {string} options.storedState - State from initial authorization
 * @param {string} options.clientId - LojeXa API key
 * @param {string} options.clientSecret - LojeXa API secret (partner key)
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
 */
export async function handleCallback({
  code,
  state,
  storedState,
  clientId,
  clientSecret,
}) {
  if (!code) {
    throw new Error('Authorization code is required');
  }

  if (!state || !storedState) {
    throw new Error('State validation failed - possible CSRF attack');
  }

  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  if (!clientSecret) {
    throw new Error('Client secret is required');
  }

  const baseUrl = process.env.LOJEXA_BASE_URL || 'https://lojexa.com/api/v1';
  const tokenUrl = `${baseUrl}${OAUTH_TOKEN_PATH}`;

  // Build request body
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${errorBody.message || response.statusText}`);
    }

    const tokenData = await response.json();

    if (tokenData.error) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in || 3600,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
    };
  } catch (error) {
    console.error('[LojeXa] Token exchange failed:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 *
 * @param {Object} options
 * @param {string} options.refreshToken - Refresh token
 * @param {string} options.clientId - LojeXa API key
 * @param {string} options.clientSecret - LojeXa API secret
 * @returns {Promise<{accessToken: string, expiresIn: number}>}
 */
export async function refreshToken({ refreshToken, clientId, clientSecret }) {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  if (!clientSecret) {
    throw new Error('Client secret is required');
  }

  const baseUrl = process.env.LOJEXA_BASE_URL || 'https://lojexa.com/api/v1';
  const tokenUrl = `${baseUrl}${OAUTH_TOKEN_PATH}`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${errorBody.message || response.statusText}`);
    }

    const tokenData = await response.json();

    if (tokenData.error) {
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresIn: tokenData.expires_in || 3600,
    };
  } catch (error) {
    console.error('[LojeXa] Token refresh failed:', error);
    throw error;
  }
}

/**
 * Validate OAuth state (CSRF protection)
 *
 * @param {string} receivedState - State received in callback
 * @param {string} expectedState - State from initial authorization
 * @returns {boolean}
 */
export function validateState(receivedState, expectedState) {
  if (!receivedState || !expectedState) {
    return false;
  }

  try {
    // Use timing-safe comparison
    const receivedBuffer = Buffer.from(receivedState);
    const expectedBuffer = Buffer.from(expectedState);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Check if token needs refresh
 *
 * @param {string} expiresAt - ISO timestamp or number of milliseconds
 * @param {number} [thresholdSeconds=300] - Refresh threshold in seconds
 * @returns {boolean}
 */
export function needsRefresh(expiresAt, thresholdSeconds = 300) {
  if (!expiresAt) {
    return true;
  }

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  const now = Date.now();
  const thresholdMs = thresholdSeconds * 1000;

  return (expiry - now) < thresholdMs;
}

/**
 * Get connection status
 *
 * @param {Object} tenant - Tenant configuration
 * @returns {Object} Connection status
 */
export function getConnectionStatus(tenant) {
  return {
    connected: !!tenant?.accessToken,
    hasRefreshToken: !!tenant?.refreshToken,
    expiresAt: tenant?.expiresAt,
    needsRefresh: needsRefresh(tenant?.expiresAt),
    channel: tenant?.channel,
    connectedAt: tenant?.connectedAt,
  };
}