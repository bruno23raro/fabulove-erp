/**
 * LojeXa Error Mapper — Translate LojeXa API errors to SIZEN domain errors
 *
 * Error mapping follows the Adapter pattern, normalizing provider-specific
 * error codes into domain-level error types that the ERP can handle consistently.
 */

// LojeXa API error codes (from LojeXa documentation)
export const LOJEXA_ERRORS = {
  // Authentication errors
  UNAUTHORIZED: 'unauthorized',
  INVALID_API_KEY: 'invalid_api_key',
  MISSING_AUTH: 'missing_auth',

  // Rate limiting
  RATE_LIMITED: 'rate_limited',
  QUOTA_EXCEEDED: 'quota_exceeded',

  // Product/Stock errors
  PRODUCT_NOT_FOUND: 'product_not_found',
  SKU_NOT_FOUND: 'sku_not_found',
  STOCK_UPDATE_FAILED: 'stock_update_failed',
  INSUFFICIENT_STOCK: 'insufficient_stock',

  // Order errors
  ORDER_NOT_FOUND: 'order_not_found',
  ORDER_CANCELLED: 'order_cancelled',

  // Webhook errors
  INVALID_SIGNATURE: 'invalid_signature',
  WEBHOOK_NOT_FOUND: 'webhook_not_found',

  // Validation errors
  VALIDATION_ERROR: 'validation_error',
  INVALID_SKU: 'invalid_sku',
  INVALID_QUANTITY: 'invalid_quantity',

  // Connection errors
  CONNECTION_FAILED: 'connection_failed',
  TIMEOUT: 'timeout',
  SERVICE_UNAVAILABLE: 'service_unavailable',

  // Generic errors
  INTERNAL_ERROR: 'internal_error',
  UNKNOWN_ERROR: 'unknown_error',
};

// Error class for LojeXa-specific errors
export class LojeXaError extends Error {
  /**
   * @param {string} code - Error code from LOJEXA_ERRORS
   * @param {string} message - Human-readable message
   * @param {number} [statusCode] - HTTP status code
   * @param {Object} [details] - Additional error details
   */
  constructor(code, message, statusCode = null, details = null) {
    super(message);
    this.name = 'LojeXaError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Create a LojeXaError from a response
   * @param {Object} errorBody - Error response body from LojeXa API
   * @returns {LojeXaError}
   */
  static fromResponse(errorBody) {
    const code = errorBody?.code || errorBody?.error || LOJEXA_ERRORS.UNKNOWN_ERROR;
    const message = errorBody?.message || errorBody?.error || 'Unknown error from LojeXa API';
    const statusCode = errorBody?.status || null;
    const details = errorBody?.details || null;

    return new LojeXaError(code, message, statusCode, details);
  }
}

/**
 * Map LojeXa error response to SIZEN domain error
 *
 * @param {string} errorBody - Raw error message or response body
 * @returns {LojeXaError}
 */
export function mapLojeXaError(errorBody) {
  if (errorBody instanceof LojeXaError) {
    return errorBody;
  }

  const errStr = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody);
  const errLower = errStr.toLowerCase();

  // Authentication errors
  if (errLower.includes('unauthorized') || errLower.includes('invalid_api_key')) {
    return new LojeXaError(LOJEXA_ERRORS.UNAUTHORIZED, 'Invalid or missing LojeXa API key', 401);
  }

  // Rate limiting
  if (errLower.includes('rate limit') || errLower.includes('quota')) {
    return new LojeXaError(LOJEXA_ERRORS.RATE_LIMITED, 'Rate limit exceeded', 429);
  }

  // Product/Stock errors
  if (errLower.includes('product not found')) {
    return new LojeXaError(LOJEXA_ERRORS.PRODUCT_NOT_FOUND, 'Product not found in LojeXa');
  }

  if (errLower.includes('sku') && (errLower.includes('not found') || errLower.includes('invalid'))) {
    return new LojeXaError(LOJEXA_ERRORS.SKU_NOT_FOUND, 'SKU not found');
  }

  if (errLower.includes('stock') && errLower.includes('update')) {
    return new LojeXaError(LOJEXA_ERRORS.STOCK_UPDATE_FAILED, 'Failed to update stock');
  }

  if (errLower.includes('insufficient stock')) {
    return new LojeXaError(LOJEXA_ERRORS.INSUFFICIENT_STOCK, 'Insufficient stock available');
  }

  // Order errors
  if (errLower.includes('order not found')) {
    return new LojeXaError(LOJEXA_ERRORS.ORDER_NOT_FOUND, 'Order not found');
  }

  if (errLower.includes('cancelled')) {
    return new LojeXaError(LOJEXA_ERRORS.ORDER_CANCELLED, 'Order has been cancelled');
  }

  // Connection errors
  if (errLower.includes('connection') || errLower.includes('network')) {
    return new LojeXaError(LOJEXA_ERRORS.CONNECTION_FAILED, 'Connection to LojeXa failed');
  }

  if (errLower.includes('timeout')) {
    return new LojeXaError(LOJEXA_ERRORS.TIMEOUT, 'Request timed out');
  }

  if (errLower.includes('service unavailable') || errLower.includes('503')) {
    return new LojeXaError(LOJEXA_ERRORS.SERVICE_UNAVAILABLE, 'LojeXa service unavailable');
  }

  // Validation errors
  if (errLower.includes('validation') || errLower.includes('invalid')) {
    return new LojeXaError(LOJEXA_ERRORS.VALIDATION_ERROR, 'Validation error', 400);
  }

  if (errLower.includes('sku')) {
    return new LojeXaError(LOJEXA_ERRORS.INVALID_SKU, 'Invalid SKU format');
  }

  if (errLower.includes('quantity')) {
    return new LojeXaError(LOJEXA_ERRORS.INVALID_QUANTITY, 'Invalid quantity value');
  }

  // Webhook errors
  if (errLower.includes('signature')) {
    return new LojeXaError(LOJEXA_ERRORS.INVALID_SIGNATURE, 'Invalid webhook signature');
  }

  // Default to unknown error
  return new LojeXaError(LOJEXA_ERRORS.UNKNOWN_ERROR, errStr, null, null);
}

/**
 * Error response helpers for API responses
 */
export function errorResponse(code, message, details = null, statusCode = 500) {
  return {
    success: false,
    error: { code, message, details, statusCode },
  };
}

export function successResponse(data, message = null) {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Check if an error code is retryable
 * @param {string} errorCode - Error code from LOJEXA_ERRORS
 * @returns {boolean}
 */
export function isRetryable(errorCode) {
  const retryableCodes = [
    LOJEXA_ERRORS.RATE_LIMITED,
    LOJEXA_ERRORS.QUOTA_EXCEEDED,
    LOJEXA_ERRORS.TIMEOUT,
    LOJEXA_ERRORS.SERVICE_UNAVAILABLE,
    LOJEXA_ERRORS.CONNECTION_FAILED,
  ];
  return retryableCodes.includes(errorCode);
}

/**
 * Check if an error is recoverable
 * @param {LojeXaError|string} error - Error instance or string
 * @returns {boolean}
 */
export function isRecoverable(error) {
  const errorCode = error instanceof LojeXaError ? error.code : mapLojeXaError(error).code;
  return isRetryable(errorCode) || errorCode === LOJEXA_ERRORS.PRODUCT_NOT_FOUND;
}