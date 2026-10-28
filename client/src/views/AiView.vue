<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="testConnection" :disabled="testing">
          {{ testing ? 'Testando...' : '🧪 Testar Conexão' }}
        </button>
        <button class="btn btn-secondary" @click="refreshConfig">
          🔄 Atualizar
        </button>
      </div>
    </div>

    <!-- Status do Provider -->
    <div class="card" v-if="providerInfo">
      <div class="card-header">
        <h3>⚙️ Configuração de IA</h3>
        <span class="badge" :class="providerInfo.hasApiKey ? 'badge-success' : 'badge-warning'">
          {{ providerInfo.hasApiKey ? '✅ Configurado' : '⚠️ Sem API Key' }}
        </span>
      </div>
      <div class="card-body">
        <div class="grid grid-3">
          <div class="info-item">
            <span class="info-label">Provider Atual</span>
            <span class="info-value">{{ providerInfo.current || 'Nenhum' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Modelo</span>
            <span class="info-value">{{ currentModel || 'gpt-4o-mini' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Provedores Disponíveis</span>
            <span class="info-value">{{ providerInfo.active.length || 0 }} configurados</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Providers Configurados -->
    <div class="card">
      <div class="card-header"><h3>🔌 Provedores de IA</h3></div>
      <div class="card-body">
        <div class="provider-list">
          <div v-for="provider in providers" :key="provider.key" class="provider-item"
               :class="{ active: provider.key === providerInfo.current }">
            <div class="provider-info">
              <span class="provider-name">{{ provider.name }}</span>
              <span class="provider-key" v-if="provider.apiKey">● Configurado</span>
              <span class="provider-key" v-else>○ Sem chave</span>
            </div>
            <div class="provider-actions">
              <span class="provider-priority">Prioridade: {{ provider.priority }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Teste de Conexão -->
    <div v-if="testResult" class="card" :class="testResult.success ? 'success' : 'error'">
      <div class="card-header">
        <h3>{{ testResult.success ? '✅ Teste Bem-Sucedido' : '❌ Erro no Teste' }}</h3>
      </div>
      <div class="card-body">
        <p><strong>Provider:</strong> {{ testResult.provider }}</p>
        <p><strong>Modelo:</strong> {{ testResult.model }}</p>
        <p><strong>Resposta:</strong> {{ testResult.response }}</p>
        <p v-if="testResult.usage" class="text-muted text-sm">
          Tokens: {{ testResult.usage.total_tokens }} (prompt: {{ testResult.usage.prompt_tokens }}, completion: {{ testResult.usage.completion_tokens }})
        </p>
      </div>
    </div>

    <!-- Área de Teste Rápido -->
    <div class="card">
      <div class="card-header"><h3>📝 Teste Rápido</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label>Prompt</label>
          <textarea v-model="testPrompt" rows="3" class="form-control" placeholder="Digite um prompt para testar..."></textarea>
        </div>
        <button class="btn btn-primary" @click="runTest" :disabled="!testPrompt || running">
          {{ running ? 'Gerando...' : '▶️ Gerar Resposta' }}
        </button>
        <div v-if="testResponse" class="mt-2 p-2 bg-light rounded">
          <pre class="text-sm">{{ testResponse }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

const providerInfo = ref(null)
const currentModel = ref('')
const testing = ref(false)
const testResult = ref(null)
const testPrompt = ref('Hello, how are you?')
const running = ref(false)
const testResponse = ref(null)

const providers = [
  { key: 'openai', name: 'OpenAI', priority: 3 },
  { key: 'nvidia-nim', name: 'NVIDIA NIM', priority: 2 },
  { key: 'agnes-ai', name: 'Agnes AI', priority: 1 },
]

async function refreshConfig() {
  try {
    const { data } = await api.get('/ai/config')
    providerInfo.value = data.data
    currentModel.value = data.data.currentModel
  } catch (err) {
    console.error('Erro ao carregar config:', err)
  }
}

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    const { data } = await api.post('/ai/test', { text: 'Oi' })
    testResult.value = data.data
  } catch (err) {
    testResult.value = { success: false, error: err.response?.data?.error?.message || err.message }
  } finally {
    testing.value = false
  }
}

async function runTest() {
  if (!testPrompt.value) return
  running.value = true
  testResponse.value = null
  try {
    const { data } = await api.post('/ai/generate', {
      messages: [{ role: 'user', content: testPrompt.value }]
    })
    testResponse.value = data.data.text
  } catch (err) {
    testResponse.value = `Erro: ${err.response?.data?.error?.message || err.message}`
  } finally {
    running.value = false
  }
}

onMounted(refreshConfig)
</script>

<style scoped>
.grid {
  display: grid;
  gap: 1rem;
}
.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.info-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}
.info-value {
  font-size: 1rem;
  font-weight: 600;
}
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.provider-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
}
.provider-item.active {
  border: 2px solid var(--color-primary);
  background: var(--color-primary-light);
}
.provider-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.provider-name {
  font-weight: 600;
}
.provider-key {
  font-size: 0.75rem;
  color: var(--color-success);
}
.provider-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.provider-priority {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.mt-2 { margin-top: 0.5rem; }
.bg-light { background: var(--color-bg-tertiary); }
.pre { white-space: pre-wrap; font-family: monospace; }
.text-muted { color: var(--color-text-muted); }
.text-sm { font-size: 0.875rem; }
</style>
