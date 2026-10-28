/**
 * AI Service — Multi-provider integration (OpenAI-compatible)
 *
 * Providers:
 *  - openai      → API key via OPENAI_API_KEY
 *  - nvidia-nim  → API key via NVIDIA_NIM_API_KEY + base URL
 *  - agnes-ai    → free key via AGNES_AI_API_KEY
 *  - azure       → Azure OpenAI
 *
 * Auto mode selects the most reliable provider first.
 */

import dotenv from 'dotenv';
dotenv.config();

const PROVIDERS = {
  'openai': {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: process.env.AI_MODEL || 'gpt-4o-mini',
    priority: 3,
  },
  'nvidia-nim': {
    name: 'NVIDIA NIM',
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseUrl: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    defaultModel: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
    priority: 2,
  },
  'agnes-ai': {
    name: 'Agnes AI',
    apiKey: process.env.AGNES_AI_API_KEY,
    baseUrl: process.env.AGNES_AI_BASE_URL || 'https://api.agnes.ai/v1',
    defaultModel: process.env.AI_MODEL || 'agnes-free',
    priority: 1,
  },
};

/** Get active providers sorted by priority */
export function getActiveProviders() {
  const active = Object.entries(PROVIDERS)
    .filter(([, config]) => config.apiKey)
    .map(([key, config]) => ({ key, ...config }));
  return active.sort((a, b) => b.priority - a.priority);
}

/** Get provider for current AI_PROVIDER env var */
export function getCurrentProvider() {
  const provider = process.env.AI_PROVIDER || 'openai';
  const config = PROVIDERS[provider];
  if (!config) return null;
  if (!config.apiKey) return null;
  return { key: provider, ...config };
}

/** Auto-select best available provider */
export function getAutoProvider() {
  const active = getActiveProviders();
  return active.length > 0 ? active[0] : null;
}

/** Get model name for current provider */
export function getModel() {
  const current = getCurrentProvider();
  return current?.defaultModel || 'gpt-4o-mini';
}

/** Get base URL for current provider */
export function getBaseUrl() {
  const current = getCurrentProvider();
  return current?.baseUrl || 'https://api.openai.com/v1';
}

/**
 * Call AI model with auto-fallback
 * @param {string} messages - array of {role, content}
 * @param {object} options - optional params (temperature, maxTokens, etc.)
 * @returns {Promise<object>} - { text, provider, model, usage }
 */
export async function generateCompletion(messages, options = {}) {
  const providers = getActiveProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider configured. Set OPENAI_API_KEY, NVIDIA_NIM_API_KEY, or AGNES_AI_API_KEY in .env');
  }

  const { temperature = 0.7, maxTokens = 1024 } = options;
  const model = getModel();
  let lastError = null;

  for (const provider of providers) {
    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.defaultModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        provider: provider.name,
        model: provider.defaultModel,
        usage: data.usage,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[ai] ${provider.name} falhou: ${err.message}`);
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
}

/**
 * Generate product description using AI
 */
export async function generateProductDescription(product) {
  const messages = [
    {
      role: 'system',
      content: 'You are a product marketing expert. Write concise, compelling product descriptions in Brazilian Portuguese.',
    },
    {
      role: 'user',
      content: `Generate a product description for:\nName: ${product.name || ''}\nCategory: ${product.category_id || ''}\nFeatures: ${product.features || 'N/A'}\n\nWrite 2-3 sentences highlighting key benefits. Return only the description text.`,
    },
  ];

  return generateCompletion(messages, { temperature: 0.8, maxTokens: 300 });
}

/**
 * Get current provider info for UI
 */
export function getProviderInfo() {
  const providers = getActiveProviders();
  const current = getCurrentProvider();
  return {
    active: providers.map(p => p.name),
    current: current?.name || 'none',
    currentKey: current?.key || null,
    hasApiKey: providers.length > 0,
  };
}

export default {
  generateCompletion,
  generateProductDescription,
  getProviderInfo,
  getCurrentProvider,
  getAutoProvider,
  getModel,
  getBaseUrl,
  getActiveProviders,
};
