<template>
  <div>
    <!-- Status card -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
          <div class="text-muted text-sm" style="margin-bottom:4px">Status da integração</div>
          <div style="font-size:18px;font-weight:700">
            <span :class="status.configured ? 'badge-success' : 'badge-gray'" class="badge">
              {{ status.configured ? 'Conectado' : 'Não configurado' }}
            </span>
            <span v-if="status.configured && status.syncEnabled" class="badge-success badge" style="margin-left:4px">Sync ativo</span>
            <span v-else-if="status.configured" class="badge-gray badge" style="margin-left:4px">Sync desativado</span>
          </div>
        </div>
        <div v-if="status.lastSyncAt" style="margin-left:auto">
          <div class="text-muted text-sm">Última sincronia</div>
          <div style="font-size:14px;font-weight:600">{{ formatDateTime(status.lastSyncAt) }}</div>
          <div :style="status.lastSyncStatus === 'error' ? 'color:var(--color-danger)' : 'color:var(--color-success)'">
            {{ status.lastSyncStatus === 'error' ? 'Erro' : status.lastSyncStatus === 'partial' ? 'Parcial' : 'OK' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Config form -->
    <div v-if="!status.configured || showConfigForm" class="card" style="margin-bottom:16px">
      <div class="card-header" style="cursor:pointer" @click="showConfigForm = !showConfigForm">
        <span class="card-title">⚙️ Configurar Shopee</span>
        <span style="margin-left:auto;color:var(--color-text-muted)">{{ showConfigForm ? '▲' : '▼' }}</span>
      </div>
      <div v-if="showConfigForm" class="card-body">
        <div v-if="configError" class="alert alert-danger">{{ configError }}</div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group">
            <label class="form-label">API Key *</label>
            <input v-model="config.apiKey" class="form-control" placeholder="Sua Shopee API Key" />
          </div>
          <div class="form-group">
            <label class="form-label">API Secret *</label>
            <input v-model="config.apiSecret" class="form-control" type="password" placeholder="Sua Shopee API Secret" />
          </div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group">
            <label class="form-label">Shop ID</label>
            <input v-model="config.shopId" class="form-control" placeholder="ID da loja (opcional)" />
          </div>
          <div class="form-group">
            <label class="form-label">Partner ID</label>
            <input v-model="config.partnerId" class="form-control" placeholder="Partner ID (opcional)" />
          </div>
        </div>
        <div class="form-group" style="margin-top:8px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" v-model="config.syncEnabled" />
            <span class="form-label" style="margin:0">Sincronizar estoque automaticamente após vendas</span>
          </label>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary" :disabled="savingConfig" @click="saveConfig">
            <span v-if="savingConfig" class="spinner"></span>
            {{ savingConfig ? 'Salvando…' : 'Salvar Credenciais' }}
          </button>
          <button v-if="status.configured" class="btn btn-secondary" @click="status.configured=false;showConfigForm=false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-primary" :disabled="syncing" @click="syncProducts">
        <span v-if="syncing" class="spinner"></span>
        🔄 Sincronizar Produtos da Shopee
      </button>
      <button class="btn btn-secondary" :disabled="exporting" @click="exportCsv">
        <span v-if="exporting" class="spinner"></span>
        📥 Exportar CSV para Shopee
      </button>
    </div>

    <!-- Resultado da sincronização -->
    <div v-if="syncResult" class="card" style="margin-bottom:16px">
      <div class="card-body">
        <div class="summary-row">
          <span class="summary-label">Criados:</span>
          <span class="summary-value" style="color:var(--color-success)">{{ syncResult.created }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Atualizados:</span>
          <span class="summary-value" style="color:var(--color-primary)">{{ syncResult.updated }}</span>
        </div>
        <div v-if="syncResult.errors" class="summary-row">
          <span class="summary-label">Erros:</span>
          <span class="summary-value" :style="syncResult.errors > 0 ? 'color:var(--color-danger)' : ''">{{ syncResult.errors }}</span>
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

const status = ref({ configured: false, syncEnabled: false })
const showConfigForm = ref(false)
const config = ref({ apiKey: '', apiSecret: '', shopId: '', partnerId: '', syncEnabled: false })
const configError = ref('')
const savingConfig = ref(false)
const syncing = ref(false)
const syncResult = ref(null)
const exporting = ref(false)
const logs = ref([])
const loadingLogs = ref(true)

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

async function saveConfig() {
  if (!config.value.apiKey || !config.value.apiSecret) {
    configError.value = 'API Key e API Secret são obrigatórios.'
    return
  }
  savingConfig.value = true
  configError.value = ''
  try {
    await api.post('/marketplaces/shopee/config', config.value)
    showConfigForm.value = false
    await loadStatus()
  } catch (err) {
    configError.value = err?.response?.data?.error?.message || 'Erro ao salvar credenciais.'
  } finally {
    savingConfig.value = false
  }
}

async function syncProducts() {
  syncing.value = true
  syncResult.value = null
  try {
    const { data } = await api.post('/marketplaces/shopee/sync')
    syncResult.value = data.data
    await loadStatus()
    await loadLogs()
  } catch (err) {
    syncResult.value = { created: 0, updated: 0, errors: -1 }
    alert('Erro na sincronização: ' + (err?.response?.data?.error?.message || err.message))
  } finally {
    syncing.value = false
  }
}

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

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

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
