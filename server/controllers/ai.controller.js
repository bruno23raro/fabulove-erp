/**
 * AI Controller — Configuração e uso de providers de IA
 */
import { generateCompletion, getProviderInfo, getModel } from '../services/ai.js';

export async function getConfig(req, res) {
  try {
    const info = getProviderInfo();
    const currentModel = getModel();
    return res.json({ success: true, data: { ...info, currentModel } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Erro ao obter config AI' } });
  }
}

export async function testConnection(req, res) {
  try {
    const { text = 'Hello' } = req.body || {};
    const messages = [
      { role: 'user', content: text },
    ];
    const result = await generateCompletion(messages);
    return res.json({
      success: true,
      data: {
        provider: result.provider,
        model: result.model,
        response: result.text,
        usage: result.usage,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Erro na conexão com IA' },
    });
  }
}

export async function generate(req, res) {
  try {
    const { messages, options = {} } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: { message: 'messages é obrigatório (array de {role, content})' },
      });
    }
    const result = await generateCompletion(messages, options);
    return res.json({
      success: true,
      data: {
        text: result.text,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Erro na geração de IA' },
    });
  }
}

export async function describeProduct(req, res) {
  try {
    const { product } = req.body || {};
    if (!product?.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'product.name é obrigatório' },
      });
    }
    const { generateProductDescription } = await import('../services/ai.js');
    const result = await generateProductDescription(product);
    return res.json({
      success: true,
      data: {
        description: result.text,
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Erro ao gerar descrição' },
    });
  }
}
