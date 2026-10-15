<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-filters">
        <select v-model="filterStatus" class="form-control select-sm" aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Quitada</option>
          <option value="partial">Parcial</option>
        </select>
      </div>
      <div class="toolbar-right">
        <span class="text-muted text-sm">Total aberto: <strong style="color:var(--color-text)">{{ formatCurrency(meta?.pending_total || 0) }}</strong></span>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nº Compra</th>
              <th>Fornecedor</th>
              <th>Descrição</th>
              <th class="text-right">Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Criada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!items.length">
              <td colspan="8" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhuma conta a pagar encontrada</td>
            </tr>
            <tr v-for="p in items" :key="p.id">
              <td class="text-muted text-sm">{{ p.purchase_number || `#${p.purchase_id}` }}</td>
              <td class="font-semibold">{{ p.supplier_name || '—' }}</td>
              <td class="text-sm">{{ truncate(p.description, 40) }}</td>
              <td class="text-right font-semibold">{{ formatCurrency(p.amount) }}</td>
              <td :class="{ 'text-danger': isOverdue(p.due_date, p.status) }">{{ formatDate(p.due_date) }}</td>
              <td><span :class="badgeClass(p.status)" class="badge">{{ statusLabel(p.status) }}</span></td>
              <td class="text-muted text-sm">{{ formatDate(p.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button v-if="p.status !== 'paid'" class="btn btn-ghost btn-sm" @click="openPay(p)" title="Registrar pagamento">💵</button>
                </div>
              </td>
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

    <!-- Modal: quitar conta -->
    <div v-if="payTarget" class="modal-overlay" @click.self="payTarget = null">
      <div class="modal" style="max-width:420px" role="dialog" aria-label="Registrar pagamento">
        <div class="modal-header">
          <span class="modal-title">Registrar Pagamento</span>
          <button class="btn btn-ghost" @click="payTarget = null" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitPay">
          <div class="modal-body">
            <p>Conta: <strong>{{ formatCurrency(payTarget.amount) }}</strong></p>
            <p class="text-muted text-sm">Fornecedor: {{ payTarget.supplier_name || '—' }}</p>
            <div class="form-group">
              <label class="form-label">Valor do pagamento</label>
              <input v-model="payForm.amount" type="number" step="0.01" min="0" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Forma de pagamento</label>
              <select v-model="payForm.payment_method" class="form-control">
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
            <div v-if="formError" class="alert alert-danger" style="margin-top:8px">{{ formError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="payTarget = null">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Registrando…' : 'Confirmar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

const items = ref([])
const meta = ref({})
const loading = ref(true)
const saving = ref(false)
const filterStatus = ref('')
const limit = 20
const offset = ref(0)
const currentPage = ref(1)
const payTarget = ref(null)
const formError = ref('')

const payForm = ref({ amount: '', payment_method: 'transferencia' })

const statusLabels = { pending: 'Pendente', paid: 'Quitada', partial: 'Parcial' }
function statusLabel(s) { return statusLabels[s] || s }
function badgeClass(s) {
  const m = { pending: 'badge-warning', paid: 'badge-success', partial: 'badge-info' }
  return m[s] || 'badge-gray'
}
function isOverdue(dueDate, status) {
  if (status === 'paid') return false
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10))
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

async function load() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/financial/payable', { params })
    items.value = data.data
    meta.value = data.meta || {}
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openPay(p) {
  payForm.value = { amount: String(p.amount), payment_method: 'transferencia' }
  formError.value = ''
  payTarget.value = p
}
async function submitPay() {
  if (!payTarget.value) return
  saving.value = true; formError.value = ''
  try {
    const payload = { amount: payForm.value.amount, payment_method: payForm.value.payment_method }
    await api.put(`/financial/payable/${payTarget.value.id}/pay`, payload)
    payTarget.value = null
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error || 'Erro ao registrar pagamento.'
  } finally {
    saving.value = false
  }
}

function prevPage() { offset.value = Math.max(0, offset.value - limit); currentPage.value--; load() }
function nextPage() { offset.value += limit; currentPage.value++; load() }

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar-filters { display: flex; gap: 8px; }
.select-sm { width: 180px; font-size: 13px; }
.row-actions { display: flex; gap: 4px; }
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid var(--color-border); }
</style>
