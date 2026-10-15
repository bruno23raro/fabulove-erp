<template>
  <div>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
    <div v-else>
      <div class="kpi-grid">
        <div class="kpi-card card card-body">
          <div class="kpi-icon">💰</div>
          <div class="kpi-value">{{ formatCurrency(summary?.accounts_receivable?.pending_total || 0) }}</div>
          <div class="kpi-label text-muted text-sm">Contas a Receber (abertas)</div>
          <div class="text-muted text-xs" style="margin-top:4px">{{ summary?.accounts_receivable?.total_count || 0 }} registros</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-icon">💳</div>
          <div class="kpi-value">{{ formatCurrency(summary?.accounts_payable?.pending_total || 0) }}</div>
          <div class="kpi-label text-muted text-sm">Contas a Pagar (abertas)</div>
          <div class="text-muted text-xs" style="margin-top:4px">{{ summary?.accounts_payable?.total_count || 0 }} registros</div>
        </div>
        <div class="kpi-card card card-body" :class="netPositionClass">
          <div class="kpi-icon">📊</div>
          <div class="kpi-value">{{ formatCurrency(summary?.net_position || 0) }}</div>
          <div class="kpi-label text-muted text-sm">Posição Líquida</div>
          <div class="text-muted text-xs" style="margin-top:4px">Receber − Pagar</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-icon">📈</div>
          <div class="kpi-value" style="color:var(--color-success)">{{ formatCurrency(summary?.cashflow_30d?.inflows || 0) }}</div>
          <div class="kpi-label text-muted text-sm">Entradas (30 dias)</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-icon">📉</div>
          <div class="kpi-value" style="color:var(--color-danger)">{{ formatCurrency(summary?.cashflow_30d?.outflows || 0) }}</div>
          <div class="kpi-label text-muted text-sm">Saídas (30 dias)</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Contas a Receber Recentes</h2>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-if="!receivables.length"><td colspan="3" style="text-align:center;color:var(--color-text-muted);padding:24px">Nenhuma conta</td></tr>
                <tr v-for="r in receivables" :key="r.id">
                  <td class="text-muted text-sm">{{ formatDate(r.due_date) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(r.amount) }}</td>
                  <td><span :class="badgeClass(receivableStatusMap[r.status])" class="badge">{{ receivableStatusMap[r.status] }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:12px 16px">
            <router-link to="/financial/receivables" class="btn btn-ghost" style="font-size:13px">Ver todas →</router-link>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Contas a Pagar Recentes</h2>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-if="!payables.length"><td colspan="3" style="text-align:center;color:var(--color-text-muted);padding:24px">Nenhuma conta</td></tr>
                <tr v-for="p in payables" :key="p.id">
                  <td class="text-muted text-sm">{{ formatDate(p.due_date) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(p.amount) }}</td>
                  <td><span :class="badgeClass(payableStatusMap[p.status])" class="badge">{{ payableStatusMap[p.status] }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:12px 16px">
            <router-link to="/financial/payable" class="btn btn-ghost" style="font-size:13px">Ver todas →</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api.js'

const loading = ref(true)
const summary = ref(null)
const receivables = ref([])
const payables = ref([])

const receivableStatusMap = { pending: 'Pendente', paid: 'Quitada', partial: 'Parcial', written_off: 'Baixada' }
const payableStatusMap = { pending: 'Pendente', paid: 'Quitada', partial: 'Parcial' }

const netPositionClass = computed(() => {
  const net = parseFloat(summary.value?.net_position || 0)
  return net >= 0 ? 'kpi-positive' : 'kpi-negative'
})

function badgeClass(status) {
  const m = { Pendente: 'badge-warning', Quitada: 'badge-success', Parcial: 'badge-info', Baixada: 'badge-gray' }
  return m[status] || 'badge-gray'
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

async function load() {
  loading.value = true
  try {
    const [sumRes, recRes, payRes] = await Promise.all([
      api.get('/financial/summary'),
      api.get('/financial/receivable', { params: { limit: 5 } }),
      api.get('/financial/payable', { params: { limit: 5 } }),
    ])
    summary.value = sumRes.data.data
    receivables.value = recRes.data.data
    payables.value = payRes.data.data
  } catch (e) {
    console.error('Failed to load financial dashboard:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.kpi-positive .kpi-value { color: var(--color-success); }
.kpi-negative .kpi-value { color: var(--color-danger); }
</style>
