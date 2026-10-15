<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <input v-model="search" type="search" class="form-control" placeholder="Buscar por nº ou fornecedor…" @input="onSearch" aria-label="Buscar compras" />
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Nova Compra</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Fornecedor</th>
              <th>Data</th>
              <th class="text-right">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!purchases.length">
              <td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhuma compra encontrada</td>
            </tr>
            <tr v-for="p in purchases" :key="p.id">
              <td class="text-muted text-sm">{{ p.number || '—' }}</td>
              <td class="font-semibold">{{ p.supplier_name || '#'+p.supplier_id }}</td>
              <td class="text-muted text-sm">{{ formatDate(p.created_at) }}</td>
              <td class="text-right font-semibold">{{ formatCurrency(p.total_amount) }}</td>
              <td><span :class="statusBadge(p.status)" class="badge">{{ statusLabel(p.status) }}</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" @click="viewDetails(p)" title="Detalhes">👁️</button>
                  <button v-if="p.status !== 'completed' && p.status !== 'cancelled'"
                          class="btn btn-ghost" @click="openEdit(p)" title="Editar">✏️</button>
                  <button v-if="p.status !== 'completed'"
                          class="btn btn-ghost" @click="confirmDelete(p)" title="Excluir" style="color:var(--color-danger)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && purchases.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="purchases.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>

    <!-- Criar / Editar modal -->
    <div v-if="showFormModal" class="modal-overlay" @click.self="showFormModal = false">
      <div class="modal" style="max-width:680px" role="dialog">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Compra' : 'Nova Compra' }}</span>
          <button class="btn btn-ghost" @click="showFormModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>

            <div class="form-group">
              <label class="form-label">Fornecedor *</label>
              <select v-model="form.supplierId" class="form-control" required :disabled="!!editing">
                <option value="">Selecione um fornecedor…</option>
                <option v-for="s in supplierOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-control" :disabled="!!editing">
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div class="items-section">
              <div class="items-header">
                <span class="form-label" style="margin:0">Itens *</span>
                <button v-if="!editing" type="button" class="btn btn-ghost btn-sm" @click="addItem">+ Adicionar item</button>
              </div>
              <div v-for="(item, i) in form.items" :key="i" class="item-row">
                <select v-model="item.productId" class="form-control" @change="fillCost(item)" required>
                  <option value="">Produto…</option>
                  <option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <input v-model.number="item.quantity" type="number" min="1" class="form-control qty-input" placeholder="Qtd" required />
                <input v-model.number="item.cost" type="number" step="0.01" min="0" class="form-control price-input" placeholder="Preço unit." required />
                <button v-if="!editing" type="button" class="btn btn-ghost" @click="removeItem(i)" style="color:var(--color-danger)" aria-label="Remover item">✕</button>
              </div>
              <div class="order-total">
                Total: <strong>{{ formatCurrency(itemsTotal) }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showFormModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Salvando…' : (editing ? 'Salvar alterações' : 'Criar Compra') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detalhes modal -->
    <div v-if="detailPurchase" class="modal-overlay" @click.self="detailPurchase = null">
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <span class="modal-title">Compra #{{ detailPurchase.number || detailPurchase.id }}</span>
          <button class="btn btn-ghost" @click="detailPurchase = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row"><span>Fornecedor</span><span>{{ detailPurchase.supplier_name || '—' }}</span></div>
          <div class="detail-row"><span>Status</span><span><span :class="statusBadge(detailPurchase.status)" class="badge">{{ statusLabel(detailPurchase.status) }}</span></span></div>
          <div class="detail-row"><span>Total</span><span class="font-semibold">{{ formatCurrency(detailPurchase.total_amount) }}</span></div>
          <div class="detail-row"><span>Data</span><span>{{ formatDate(detailPurchase.created_at) }}</span></div>

          <div v-if="detailItems.length" style="margin-top:16px">
            <div class="form-label">Itens</div>
            <table style="width:100%;font-size:13px;margin-top:8px">
              <thead><tr><th>Produto</th><th class="text-right">Qtd</th><th class="text-right">Preço unit.</th><th class="text-right">Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="item in detailItems" :key="item.id">
                  <td>{{ item.product_name }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">{{ formatCurrency(item.unit_price) }}</td>
                  <td class="text-right">{{ formatCurrency(item.total_price) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="detailPurchase = null">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Confirmar exclusão -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget=null">
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <span class="modal-title">Confirmar exclusão</span>
          <button class="btn btn-ghost" @click="deleteTarget=null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Excluir compra #{{ deleteTarget.number || deleteTarget.id }}?</p>
          <p class="text-muted text-sm" style="margin-top:8px">Esta ação não pode ser desfeita.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="deleteTarget=null">Cancelar</button>
          <button class="btn btn-danger" @click="doDelete" :disabled="saving">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/utils/api.js'

const purchases = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const limit = 20
const offset = ref(0)
const currentPage = ref(1)
const showFormModal = ref(false)
const detailPurchase = ref(null)
const detailItems = ref([])
const deleteTarget = ref(null)
const formError = ref('')
const editing = ref(null)
const supplierOptions = ref([])
const productOptions = ref([])

let searchTimer = null

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; currentPage.value = 1; load() }, 400)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

function statusLabel(s) {
  const labels = { pending: 'Pendente', approved: 'Aprovado', completed: 'Concluído', cancelled: 'Cancelado' }
  return labels[s] || s || '—'
}

function statusBadge(s) {
  const classes = { pending: 'badge-warning', approved: 'badge-success', completed: 'badge-success', cancelled: 'badge-danger' }
  return classes[s] || 'badge-gray'
}

const form = reactive({ supplierId: '', status: 'pending', items: [] })

const itemsTotal = computed(() =>
  form.items.reduce((sum, item) => sum + (parseFloat(item.cost || 0) * parseInt(item.quantity || 0)), 0)
)

function addItem() {
  form.items.push({ productId: '', quantity: 1, cost: '' })
}

function removeItem(i) {
  form.items.splice(i, 1)
}

function fillCost(item) {
  // no default cost fill — user enters manually
}

async function load() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (search.value) params.search = search.value
    const { data } = await api.get('/purchases', { params })
    purchases.value = data.data || []
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

async function loadOptions() {
  const [sRes, pRes] = await Promise.all([
    api.get('/suppliers', { params: { limit: 200 } }),
    api.get('/products', { params: { limit: 200 } }),
  ]).catch(() => [{ data: { data: [] } }, { data: { data: [] } }])
  supplierOptions.value = sRes.data.data.filter(s => s.status !== 'inactive')
  productOptions.value = pRes.data.data
}

function openCreate() {
  editing.value = null
  Object.assign(form, { supplierId: '', status: 'pending', items: [] })
  formError.value = ''
  loadOptions()
  showFormModal.value = true
}

function openEdit(p) {
  editing.value = p
  form.supplierId = p.supplier_id
  form.status = p.status
  form.items = []
  formError.value = ''
  loadOptions().then(() => {
    showFormModal.value = true
  })
}

async function submitForm() {
  if (!form.supplierId) { formError.value = 'Selecione um fornecedor.'; return }
  if (!form.items.length) { formError.value = 'Adicione ao menos um item.'; return }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await api.put('/purchases/' + editing.value.id, {
        supplier_id: parseInt(form.supplierId),
        status: form.status,
      })
    } else {
      const items = form.items.map(i => ({
        product_id: parseInt(i.productId),
        quantity: parseInt(i.quantity),
        cost: parseFloat(i.cost),
      }))
      await api.post('/purchases', {
        supplier_id: parseInt(form.supplierId),
        status: form.status,
        items,
      })
    }
    showFormModal.value = false
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

async function viewDetails(p) {
  detailPurchase.value = p
  detailItems.value = []
  try {
    const { data } = await api.get('/purchases/' + p.id)
    detailPurchase.value = data.data
    detailItems.value = data.data.items || []
  } catch (_) {}
}

function confirmDelete(p) { deleteTarget.value = p }

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await api.delete('/purchases/' + deleteTarget.value.id)
    deleteTarget.value = null
    load()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao excluir.')
    deleteTarget.value = null
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
.toolbar-left { flex: 1; min-width: 200px; max-width: 360px; }
.row-actions { display: flex; gap: 4px; }
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid var(--color-border); }
.btn-sm { padding: 4px 10px; font-size: 13px; }
.items-section { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px; margin-top: 8px; }
.items-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.item-row { display: grid; grid-template-columns: 1fr 80px 110px auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.qty-input { width: 80px; }
.price-input { width: 110px; }
.order-total { text-align: right; font-size: 14px; margin-top: 8px; color: var(--color-text-muted); }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
