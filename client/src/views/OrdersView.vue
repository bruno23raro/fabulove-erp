<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-filters">
        <select v-model="filterStatus" class="form-control select-sm" @change="load" aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Novo Pedido</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Status</th>
              <th class="text-right">Itens</th>
              <th class="text-right">Total</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!orders.length">
              <td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhum pedido encontrado</td>
            </tr>
            <tr v-for="o in orders" :key="o.id">
              <td class="font-semibold">{{ o.order_number }}</td>
              <td>{{ o.customer_name || '—' }}</td>
              <td><span :class="statusBadge(o.status)" class="badge">{{ statusLabel(o.status) }}</span></td>
              <td class="text-right">{{ o.items_count }}</td>
              <td class="text-right font-semibold">{{ formatCurrency(o.total) }}</td>
              <td class="text-muted text-sm">{{ formatDate(o.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" @click="openDetail(o)" title="Ver detalhes">👁️</button>
                  <button v-if="o.status === 'pending'" class="btn btn-ghost" @click="confirmDelete(o)" title="Excluir" style="color:var(--color-danger)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && orders.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="orders.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>

    <!-- Modal criar pedido -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal" style="max-width:640px" role="dialog" aria-label="Novo pedido">
        <div class="modal-header">
          <span class="modal-title">Novo Pedido</span>
          <button class="btn btn-ghost" @click="showCreateModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitCreate">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Cliente *</label>
              <select v-model="newOrder.customerId" class="form-control" required>
                <option value="">Selecione um cliente…</option>
                <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Forma de pagamento</label>
              <select v-model="newOrder.paymentMethod" class="form-control">
                <option value="">Não informado</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>

            <div class="items-section">
              <div class="items-header">
                <span class="form-label" style="margin:0">Itens do pedido *</span>
                <button type="button" class="btn btn-ghost btn-sm" @click="addItem">+ Adicionar item</button>
              </div>
              <div v-for="(item, i) in newOrder.items" :key="i" class="item-row">
                <select v-model="item.productId" class="form-control" @change="fillPrice(item)" required>
                  <option value="">Produto…</option>
                  <option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }} (estoque: {{ p.stock }})</option>
                </select>
                <input v-model="item.quantity" type="number" min="1" class="form-control qty-input" placeholder="Qtd" required />
                <input v-model="item.price" type="number" step="0.01" min="0" class="form-control price-input" placeholder="Preço" required />
                <button type="button" class="btn btn-ghost" @click="removeItem(i)" style="color:var(--color-danger)" aria-label="Remover item">✕</button>
              </div>
              <div v-if="newOrder.items.length" class="order-total">
                Total: <strong>{{ formatCurrency(orderTotal) }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Salvando…' : 'Criar Pedido' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal detalhe / alterar status -->
    <div v-if="detailOrder" class="modal-overlay" @click.self="detailOrder = null">
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <span class="modal-title">Pedido {{ detailOrder.order_number }}</span>
          <button class="btn btn-ghost" @click="detailOrder = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row"><span>Cliente</span><span>{{ detailOrder.customer_name }}</span></div>
          <div class="detail-row"><span>Status</span>
            <span>
              <span :class="statusBadge(detailOrder.status)" class="badge">{{ statusLabel(detailOrder.status) }}</span>
            </span>
          </div>
          <div class="detail-row"><span>Pagamento</span><span>{{ detailOrder.payment_method || '—' }}</span></div>
          <div class="detail-row"><span>Total</span><span class="font-semibold">{{ formatCurrency(detailOrder.total) }}</span></div>
          <div class="detail-row"><span>Data</span><span>{{ formatDate(detailOrder.created_at) }}</span></div>

          <div v-if="detailItems.length" style="margin-top:16px">
            <div class="form-label">Itens</div>
            <table style="width:100%;font-size:13px;margin-top:8px">
              <thead><tr><th>Produto</th><th class="text-right">Qtd</th><th class="text-right">Preço</th><th class="text-right">Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="item in detailItems" :key="item.id">
                  <td>{{ item.product_name }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">{{ formatCurrency(item.price) }}</td>
                  <td class="text-right">{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="!['canceled','delivered'].includes(detailOrder.status)" style="margin-top:20px">
            <label class="form-label">Alterar status</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button
                v-for="s in nextStatuses(detailOrder.status)"
                :key="s.value"
                type="button"
                class="btn btn-ghost"
                @click="changeStatus(detailOrder.id, s.value)"
                :disabled="saving"
              >{{ s.label }}</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="detailOrder = null">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Confirmar exclusão -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Confirmar exclusão</span>
          <button class="btn btn-ghost" @click="deleteTarget = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Excluir o pedido <strong>{{ deleteTarget.order_number }}</strong>?</p>
          <p class="text-muted text-sm" style="margin-top:8px">Apenas pedidos pendentes podem ser excluídos.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancelar</button>
          <button class="btn btn-danger" @click="doDelete" :disabled="saving">
            <span v-if="saving" class="spinner"></span>
            Excluir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/utils/api.js'

const orders = ref([])
const loading = ref(true)
const saving = ref(false)
const filterStatus = ref('')
const limit = 20
const offset = ref(0)
const currentPage = ref(1)
const showCreateModal = ref(false)
const detailOrder = ref(null)
const detailItems = ref([])
const deleteTarget = ref(null)
const formError = ref('')
const customerOptions = ref([])
const productOptions = ref([])

const statuses = [
  { value: 'pending',    label: 'Pendente' },
  { value: 'confirmed',  label: 'Confirmado' },
  { value: 'processing', label: 'Processando' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregue' },
  { value: 'canceled',   label: 'Cancelado' },
]

const statusMap = Object.fromEntries(statuses.map(s => [s.value, s.label]))

function statusLabel(s) { return statusMap[s] || s }
function statusBadge(s) {
  const m = { pending:'badge-warning', confirmed:'badge-info', processing:'badge-info', shipped:'badge-info', delivered:'badge-success', canceled:'badge-danger', refunded:'badge-gray' }
  return m[s] || 'badge-gray'
}

function nextStatuses(current) {
  const flow = { pending:['confirmed','canceled'], confirmed:['processing','canceled'], processing:['shipped','canceled'], shipped:['delivered','canceled'] }
  return (flow[current] || []).map(v => statuses.find(s => s.value === v)).filter(Boolean)
}

const newOrder = reactive({ customerId: '', paymentMethod: '', items: [] })

const orderTotal = computed(() =>
  newOrder.items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0)
)

function addItem() { newOrder.items.push({ productId: '', quantity: 1, price: '' }) }
function removeItem(i) { newOrder.items.splice(i, 1) }
function fillPrice(item) {
  const prod = productOptions.value.find(p => p.id == item.productId)
  if (prod) item.price = prod.price
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

async function load() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/orders', { params })
    orders.value = data.data
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

async function loadOptions() {
  const [cRes, pRes] = await Promise.all([
    api.get('/customers', { params: { limit: 200 } }),
    api.get('/products', { params: { limit: 200 } }),
  ]).catch(() => [{ data: { data: [] } }, { data: { data: [] } }])
  customerOptions.value = cRes.data.data
  productOptions.value = pRes.data.data.filter(p => p.is_active)
}

function openCreate() {
  newOrder.customerId = ''; newOrder.paymentMethod = ''; newOrder.items = []
  formError.value = ''
  loadOptions()
  showCreateModal.value = true
}

async function submitCreate() {
  if (!newOrder.customerId) { formError.value = 'Selecione um cliente.'; return }
  if (!newOrder.items.length) { formError.value = 'Adicione ao menos um item.'; return }
  saving.value = true; formError.value = ''
  try {
    const items = newOrder.items.map(i => ({ productId: parseInt(i.productId), quantity: parseInt(i.quantity), price: parseFloat(i.price) }))
    await api.post('/orders', { customerId: parseInt(newOrder.customerId), items, paymentMethod: newOrder.paymentMethod || undefined })
    showCreateModal.value = false
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao criar pedido.'
  } finally { saving.value = false }
}

async function openDetail(o) {
  detailOrder.value = o
  detailItems.value = []
  try {
    const { data } = await api.get(`/orders/${o.id}`)
    detailOrder.value = data.data
    detailItems.value = data.data.items || []
  } catch (_) {}
}

async function changeStatus(id, status) {
  saving.value = true
  try {
    const { data } = await api.patch(`/orders/${id}/status`, { status })
    detailOrder.value = { ...detailOrder.value, status: data.data.status }
    load()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao alterar status.')
  } finally { saving.value = false }
}

function confirmDelete(o) { deleteTarget.value = o }
async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/orders/${deleteTarget.value.id}`)
    deleteTarget.value = null
    load()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao excluir.')
    deleteTarget.value = null
  } finally { saving.value = false }
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
.btn-sm { padding: 4px 10px; font-size: 13px; }
.items-section { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px; margin-top: 8px; }
.items-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.item-row { display: grid; grid-template-columns: 1fr 80px 100px auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.qty-input { width: 80px; }
.price-input { width: 100px; }
.order-total { text-align: right; font-size: 14px; margin-top: 8px; color: var(--color-text-muted); }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
</style>
