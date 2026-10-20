<template>
  <div>
    <!-- Status card -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
          <div class="text-muted text-sm" style="margin-bottom:4px">Status da integração</div>
          <div style="font-size:18px;font-weight:700">
            <span :class="status.hasToken ? 'badge-success' : 'badge-gray'" class="badge">
              {{ status.hasToken ? 'Conectado' : status.configured ? 'Logado' : 'Não configurado' }}
            </span>
            <span v-if="status.syncEnabled && status.hasToken" class="badge-success badge" style="margin-left:4px">Sync ativo</span>
            <span v-else-if="status.syncEnabled" class="badge-gray badge" style="margin-left:4px">Sync pendente</span>
            <span v-if="status.authMethod" class="text-muted text-sm" style="margin-left:8px">
              {{ status.authMethod === 'oauth' ? '🔐 OAuth' : '🔑 API Key' }}
            </span>
            <span v-if="status.partnerIdShort" class="text-muted text-sm" style="margin-left:8px">
              Parceiro: {{ status.partnerIdShort }}
            </span>
          </div>
          <div v-if="status.tokenExpiresAt" class="text-muted text-sm" style="margin-top:4px">
            Token expira: {{ formatDateTime(status.tokenExpiresAt) }}
            <span v-if="!isTokenValid(status.tokenExpiresAt)" style="color:var(--color-warning)">⚠️ Expirado</span>
          </div>
        </div>
        <div v-if="status.lastSyncAt" style="margin-left:auto;text-align:right">
          <div class="text-muted text-sm">Última sincronia</div>
          <div style="font-size:14px;font-weight:600">{{ formatDateTime(status.lastSyncAt) }}</div>
          <div :style="status.lastSyncStatus === 'error' ? 'color:var(--color-danger)' : status.lastSyncStatus === 'partial' ? 'color:var(--color-warning)' : 'color:var(--color-success)'">
            {{ status.lastSyncStatus === 'error' ? 'Erro' : status.lastSyncStatus === 'partial' ? 'Parcial' : 'OK' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Seção 1: Configuração OAuth (Partner ID + Partner Key) -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="cursor:pointer" @click="showAuthSection = !showAuthSection">
        <span class="card-title">🔗 Conectar com Shopee (OAuth)</span>
        <span style="margin-left:auto;color:var(--color-text-muted)">{{ showAuthSection ? '▲' : '▼' }}</span>
      </div>
      <div v-if="showAuthSection" class="card-body">
        <div v-if="authError" class="alert alert-danger">{{ authError }}</div>
        <div v-if="authInfo" class="alert alert-info">{{ authInfo }}</div>

        <p class="text-muted text-sm" style="margin-bottom:16px">
          Para conectar, você precisa de credenciais de parceiro da Shopee.
          Obtenha em <a href="https://open.shopee.com/console/app" target="_blank" rel="noopener">open.shopee.com/console/app</a>.
        </p>

        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group">
            <label class="form-label">Partner ID *</label>
            <input v-model="authForm.partnerId" class="form-control" placeholder="Ex: 123456" />
          </div>
          <div class="form-group">
            <label class="form-label">Partner Key *</label>
            <input v-model="authForm.partnerKey" class="form-control" type="password" placeholder="Sua Partner Key" />
          </div>
        </div>

        <div class="form-row" style="grid-template-columns:1fr 1fr;margin-top:12px">
          <div class="form-group">
            <label class="form-label">Shop ID (opcional)</label>
            <input v-model="authForm.shopId" class="form-control" placeholder="ID da loja Shopee" />
          </div>
          <div class="form-group">
            <label class="form-label">Locale</label>
            <select v-model="authForm.locale" class="form-control">
              <option value="pt_BR">Português (Brasil)</option>
              <option value="th_TH">ไทย (Tailândia)</option>
              <option value="ms_MY">Melayu (Malásia)</option>
              <option value="en_MY">English (Malásia)</option>
              <option value="id_ID">Bahasa (Indonésia)</option>
              <option value="vi_VN">Tiếng Việt (Vietnã)</option>
              <option value="fil_PH">Filipino (Filipinas)</option>
            </select>
          </div>
        </div>

        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" :disabled="authing" @click="doAuth">
            <span v-if="authing" class="spinner"></span>
            {{ authing ? 'Gerando URL…' : '🔗 Conectar com Shopee' }}
          </button>
          <span class="text-muted text-sm" style="align-self:center">
            Você será redirecionado para a Shopee autorizar a conexão.
          </span>
        </div>

        <!-- URL de autorização exibida para cópia (caso o popup seja bloqueado) -->
        <div v-if="authUrl" class="alert alert-info" style="margin-top:12px;word-break:break-all">
          <div class="text-muted text-sm" style="margin-bottom:4px">URL de autorização:</div>
          <code style="font-size:11px">{{ authUrl }}</code>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px" @click="copyAuthUrl">📋 Copiar URL</button>
        </div>

        <!-- Formulário de callback manual -->
        <div v-if="status.configured && !status.hasToken" style="margin-top:16px;border-top:1px solid var(--color-border);padding-top:16px">
          <div class="form-label">Callback manual</div>
          <p class="text-muted text-sm">Se o redirecionamento não funcionar automaticamente, cole o código abaixo:</p>
          <div class="form-row" style="grid-template-columns:2fr 1fr">
            <div class="form-group">
              <input v-model="callbackCode" class="form-control" placeholder="authorization_code da Shopee" />
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" :disabled="processingCallback" @click="submitCallback">
                {{ processingCallback ? '…' : 'Confirmar' }}
              </button>
            </div>
          </div>
          <div v-if="callbackError" class="alert alert-danger" style="margin-top:8px">{{ callbackError }}</div>
        </div>
      </div>
    </div>

    <!-- Seção 2: API Key direta (alternativa) -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="cursor:pointer" @click="showApiKeySection = !showApiKeySection">
        <span class="card-title">🔑 Conectar com API Key (sem OAuth)</span>
        <span style="margin-left:auto;color:var(--color-text-muted)">{{ showApiKeySection ? '▲' : '▼' }}</span>
      </div>
      <div v-if="showApiKeySection" class="card-body">
        <p class="text-muted text-sm" style="margin-bottom:12px">
          Use este método se já possui API Key e API Secret diretos da Shopee.
          Requer credenciais de parceiro com permissões HMAC.
        </p>
        <div v-if="apiKeyError" class="alert alert-danger">{{ apiKeyError }}</div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group">
            <label class="form-label">API Key *</label>
            <input v-model="apiKeyForm.apiKey" class="form-control" type="password" />
          </div>
          <div class="form-group">
            <label class="form-label">API Secret *</label>
            <input v-model="apiKeyForm.apiSecret" class="form-control" type="password" />
          </div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr;margin-top:12px">
          <div class="form-group">
            <label class="form-label">Shop ID</label>
            <input v-model="apiKeyForm.shopId" class="form-control" />
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" v-model="apiKeyForm.syncEnabled" />
              <span class="form-label" style="margin:0">Sincronizar estoque após vendas</span>
            </label>
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" :disabled="savingApiKey" @click="saveApiKey">
            <span v-if="savingApiKey" class="spinner"></span>
            {{ savingApiKey ? 'Salvando…' : 'Salvar Credenciais' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-primary" :disabled="syncing || !status.hasToken" @click="syncProducts">
        <span v-if="syncing" class="spinner"></span>
        🔄 Sincronizar Produtos da Shopee
      </button>
      <button class="btn btn-secondary" :disabled="exporting || !status.hasToken" @click="exportCsv">
        <span v-if="exporting" class="spinner"></span>
        📥 Exportar CSV para Shopee
      </button>
      <button v-if="status.hasToken" class="btn btn-danger" @click="doDisconnect">
        🔌 Desconectar
      </button>
    </div>

    <!-- Resultado da sincronização -->
    <div v-if="syncResult" class="card" style="margin-bottom:16px">
      <div class="card-body">
        <div v-if="syncResult?.failed" class="summary-row">
          <span class="summary-label" style="color:var(--color-danger)">❌ Erro na sincronização</span>
        </div>
        <div v-else-if="syncResult?.created !== undefined || syncResult?.updated !== undefined" class="summary-row">
          <span class="summary-label">Criados:</span>
          <span class="summary-value" style="color:var(--color-success)">{{ syncResult.created }}</span>
        </div>
        <div v-if="syncResult?.updated !== undefined" class="summary-row">
          <span class="summary-label">Atualizados:</span>
          <span class="summary-value" style="color:var(--color-primary)">{{ syncResult.updated }}</span>
        </div>
        <div v-if="syncResult?.errors !== undefined && syncResult.errors > 0" class="summary-row">
          <span class="summary-label">Erros:</span>
          <span class="summary-value" style="color:var(--color-danger)">{{ syncResult.errors }}</span>
        </div>
      </div>
    </div>

    <!-- Logs -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Logs de Sincronização</span>
      </div>
      <div class="card-body" style="padding:0">
        <div v-if="loadingLogs" class="loading-center" style="padding:24px"><span class="spinner"></span></div>
        <table v-else>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!logs.length">
              <td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:32px">Nenhum log encontrado</td>
            </tr>
            <tr v-for="log in logs" :key="log.id">
              <td class="text-muted text-sm">{{ formatDateTime(log.created_at) }}</td>
              <td><code style="font-size:12px">{{ log.action }}</code></td>
              <td class="text-sm">{{ log.product_name || log.product_sku || '—' }}</td>
              <td>
                <span :class="log.status === 'ok' ? 'badge-success' : log.status === 'error' ? 'badge-danger' : 'badge-gray'" class="badge">
                  {{ log.status }}
                </span>
              </td>
              <td class="text-sm" :style="log.status === 'error' ? 'color:var(--color-danger)' : ''">{{ log.message || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

// ── Estado principal ──────────────────────────────────────────────────────────
const status = ref({ configured: false, hasToken: false, syncEnabled: false })
const showAuthSection = ref(true)
const showApiKeySection = ref(false)
const loadingLogs = ref(true)

// ── OAuth form ────────────────────────────────────────────────────────────────
const authForm = ref({ partnerId: '', partnerKey: '', shopId: '', locale: 'pt_BR' })
const authError = ref('')
const authInfo = ref('')
const authing = ref(false)
const authUrl = ref('')
const callbackCode = ref('')
const processingCallback = ref(false)
const callbackError = ref('')

// ── API Key form ──────────────────────────────────────────────────────────────
const apiKeyForm = ref({ apiKey: '', apiSecret: '', shopId: '', syncEnabled: true })
const apiKeyError = ref('')
const savingApiKey = ref(false)

// ── Ações ─────────────────────────────────────────────────────────────────────
const syncing = ref(false)
const syncResult = ref(null)
const exporting = ref(false)
const logs = ref([])

// ── Helpers ───────────────────────────────────────────────────────────────────
function isTokenValid(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt) > new Date(Date.now() - 60_000)
}

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Carregar dados ─────────────────────────────────────────────────────────────
async function loadStatus() {
  try {
    const { data } = await api.get('/marketplaces/shopee/status')
    status.value = data.data
  } catch (_) {}
}

async function loadLogs() {
  loadingLogs.value = true
  try {
    const { data } = await api.get('/marketplaces/shopee/logs?limit=100')
    logs.value = data.data || []
  } catch (_) {} finally {
    loadingLogs.value = false
  }
}

// ── OAuth: gerar URL e redirecionar ───────────────────────────────────────────
async function doAuth() {
  authError.value = ''
  authInfo.value = ''
  authUrl.value = ''

  const { partnerId, partnerKey } = authForm.value
  if (!partnerId || !partnerKey) {
    authError.value = 'Partner ID e Partner Key são obrigatórios.'
    return
  }

  authing.value = true
  try {
    const { data } = await api.post('/marketplaces/shopee/auth-url', {
      partnerId,
      partnerKey,
      shopId: authForm.value.shopId || undefined,
      locale: authForm.value.locale,
      callbackUrl: `${window.location.origin}/api/marketplaces/shopee/oauth/callback`,
    })

    authUrl.value = data.data.authUrl

    // Abre em nova aba
    const win = window.open(authUrl.value, '_blank')
    if (!win || win.closed || typeof win.closed === 'undefined') {
      authInfo.value = 'O redirecionamento foi bloqueado pelo navegador. Copie a URL acima e cole no navegador.'
    } else {
      authInfo.value = '✅ Autorize a conexão na aba da Shopee. Aguarde o redirecionamento de volta.'
    }

    await loadStatus()
    await loadLogs()
  } catch (err) {
    authError.value = err?.response?.data?.error?.message || err?.message || 'Erro ao gerar URL de autorização.'
  } finally {
    authing.value = false
  }
}

function copyAuthUrl() {
  navigator.clipboard.writeText(authUrl.value).then(() => {
    authInfo.value = '✅ URL copiada para a área de transferência.'
  }).catch(() => {
    authInfo.value = 'Não foi possível copiar. Selecione e copie manualmente.'
  })
}

// ── Callback manual ───────────────────────────────────────────────────────────
async function submitCallback() {
  callbackError.value = ''
  const code = callbackCode.value.trim()
  if (!code) {
    callbackError.value = 'Código de autorização é obrigatório.'
    return
  }

  processingCallback.value = true
  try {
    const { data } = await api.post('/marketplaces/shopee/oauth/callback', {
      code,
      state: '', // backend valida state interno
    })
    callbackCode.value = ''
    authInfo.value = '✅ Conexão estabelecida com sucesso!'
    await loadStatus()
    await loadLogs()
  } catch (err) {
    callbackError.value = err?.response?.data?.error?.message || err?.message || 'Erro ao processar callback.'
  } finally {
    processingCallback.value = false
  }
}

// ── API Key direta ─────────────────────────────────────────────────────────────
async function saveApiKey() {
  apiKeyError.value = ''
  const { apiKey, apiSecret } = apiKeyForm.value
  if (!apiKey || !apiSecret) {
    apiKeyError.value = 'API Key e API Secret são obrigatórios.'
    return
  }

  savingApiKey.value = true
  try {
    await api.post('/marketplaces/shopee/config', {
      apiKey,
      apiSecret,
      shopId: apiKeyForm.value.shopId || undefined,
      syncEnabled: apiKeyForm.value.syncEnabled,
    })
    showApiKeySection.value = false
    await loadStatus()
    await loadLogs()
  } catch (err) {
    apiKeyError.value = err?.response?.data?.error?.message || 'Erro ao salvar credenciais.'
  } finally {
    savingApiKey.value = false
  }
}

// ── Desconectar ───────────────────────────────────────────────────────────────
async function doDisconnect() {
  if (!confirm('Deseja desconectar a conta Shopee? Todos os tokens serão removidos.')) return
  try {
    await api.post('/marketplaces/shopee/disconnect')
    status.value = { configured: false, hasToken: false, syncEnabled: false }
    await loadLogs()
  } catch (_) {
    status.value = { configured: false, hasToken: false, syncEnabled: false }
  }
}

// ── Sincronizar produtos ──────────────────────────────────────────────────────
async function syncProducts() {
  syncing.value = true
  syncResult.value = null
  try {
    const { data } = await api.post('/marketplaces/shopee/sync')
    syncResult.value = data.data
    await loadStatus()
    await loadLogs()
  } catch (err) {
    syncResult.value = { created: 0, updated: 0, errors: 0, failed: true }
    alert('Erro na sincronização: ' + (err?.response?.data?.error?.message || err.message))
  } finally {
    syncing.value = false
  }
}

// ── Exportar CSV ───────────────────────────────────────────────────────────────
async function exportCsv() {
  exporting.value = true
  try {
    const res = await api.get('/marketplaces/shopee/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'produtos-shopee.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('Erro ao exportar CSV: ' + (err?.response?.data?.error?.message || err.message))
  } finally {
    exporting.value = false
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(() => { loadStatus(); loadLogs() })
</script>

<style scoped>
.card-body { padding: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 14px; }
.summary-label { color: var(--color-text-secondary); }
.summary-value { font-weight: 600; }
.card-header { cursor: pointer; display: flex; align-items: center; }
</style>
