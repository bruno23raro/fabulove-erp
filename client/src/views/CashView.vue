<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-filters">
        <select v-model="filterType" class="form-control select-sm" aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          <option value="sale">Venda</option>
          <option value="suprimento">Suprimento</option>
          <option value="sangria">Sangria</option>
          <option value="entry">Entrada</option>
          <option value="exit">Saída</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Tipo</th>
              <th class="text-right">Valor</th>
              <th>Referência</th>
              <th>Pagamento</th>
              <th>Operador</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!items.length">
              <td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhuma movimentação encontrada</td>
            </tr>
            <tr v-for="t in items" :key="t.id">
              <td class="text-muted text-sm">{{ formatDateTime(t.created_at) }}</td>
              <td><span :class="typeBadge(t.type)" class="badge">{{ typeLabel(t.type) }}</span></td>
              <td class="text-right font-semibold" :style="{ color: isOutflow(t.type) ? 'var(--color-danger)' : 'var(--color-success)' }">
                {{ isOutflow(t.type) ? '-' : '+' }}{{ formatCurrency(t.amount) }}
              </td>
              <td class="text-sm text-muted">{{ referenceLabel(t) }}</td>
              <td class="text-muted text-sm">{{ t.payment_method || '—' }}</td>
              <td class="text-muted text-sm">{{ t.operator_name || '—' }}</td>
              <td class="text-sm text-muted">{{ truncate(t.notes, 30) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && items.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="items.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

const items = ref([])
const loading = ref(true)
const filterType = ref('')
const limit = 50
const offset = ref(0)
const currentPage = ref(1)

const typeLabels = {
  sale: 'Venda', suprimento: 'Suprimento', sangria: 'Sangria',
  entry: 'Entrada', exit: 'Saída'
}
const typeBadges = {
  sale: 'badge-success', suprimento: 'badge-info', sangria: 'badge-danger',
  entry: 'badge-success', exit: 'badge-danger'
}

function typeLabel(t) { return typeLabels[t] || t }
function typeBadge(t) { return typeBadges[t] || 'badge-gray' }
function isOutflow(t) { return ['sangria', 'exit'].includes(t) }

function referenceLabel(t) {
  if (t.reference_type === 'sale' && t.reference_id) return `Venda #${t.reference_id}`
  if (t.reference_type === 'receivable' && t.reference_id) return `R$ ${t.reference_id}`
  if (t.reference_type === 'payable' && t.reference_id) return `P$ ${t.reference_id}`
  return '—'
}

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}
function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

async function load() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (filterType.value) params.type = filterType.value
    const { data } = await api.get('/financial/cash', { params })
    items.value = data.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function prevPage() { offset.value = Math.max(0, offset.value - limit); currentPage.value--; load() }
function nextPage() { offset.value += limit; currentPage.value++; load() }

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.select-sm { width: 180px; font-size: 13px; }
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid var(--color-border); }
</style>
