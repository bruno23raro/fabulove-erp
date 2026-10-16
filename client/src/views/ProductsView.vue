<template>
  <div>
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <input
          v-model="search"
          type="search"
          class="form-control search-input"
          placeholder="Buscar por nome ou SKU…"
          @input="onSearch"
          aria-label="Buscar produtos"
        />
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="openImportModal">📥 Importar CSV</button>
        <button class="btn btn-primary" @click="openCreate">+ Novo Produto</button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>SKU</th>
              <th>Código de Barras</th>
              <th>Categoria</th>
              <th class="text-right">Preço</th>
              <th class="text-right">Estoque</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!products.length">
              <td colspan="8" style="text-align:center;color:var(--color-text-muted);padding:40px">
                Nenhum produto encontrado
              </td>
            </tr>
            <tr v-for="p in products" :key="p.id">
              <td class="font-semibold">{{ p.name }}</td>
              <td class="text-muted text-sm">{{ p.sku || '—' }}</td>
              <td class="text-muted text-sm" style="font-family:monospace">{{ p.barcode || '—' }}</td>
              <td>{{ p.category_name || '—' }}</td>
              <td class="text-right">{{ formatCurrency(p.price) }}</td>
              <td class="text-right" :style="p.stock <= p.stock_min ? 'color:var(--color-danger);font-weight:600' : ''">
                {{ p.stock }}
              </td>
              <td>
                <span :class="p.is_active ? 'badge-success' : 'badge-gray'" class="badge">
                  {{ p.is_active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" @click="openEdit(p)" title="Editar">✏️</button>
                  <button class="btn btn-ghost" @click="confirmDelete(p)" title="Excluir" style="color:var(--color-danger)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div v-if="!loading && products.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="products.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>

    <!-- Modal criar/editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" role="dialog" :aria-label="editing ? 'Editar produto' : 'Novo produto'">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Produto' : 'Novo Produto' }}</span>
          <button class="btn btn-ghost" @click="showModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input v-model="form.name" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">SKU</label>
                <input v-model="form.sku" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Código de Barras</label>
                <input v-model="form.barcode" class="form-control" placeholder="Ex: 7891234567890" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Preço *</label>
                <input v-model="form.price" type="number" step="0.01" min="0" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">Custo</label>
                <input v-model="form.cost" type="number" step="0.01" min="0" class="form-control" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Estoque</label>
                <input v-model="form.stock" type="number" min="0" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Estoque mínimo</label>
                <input v-model="form.stock_min" type="number" min="0" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select v-model="form.categoryId" class="form-control">
                <option value="">Sem categoria</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <textarea v-model="form.description" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" v-model="form.isActive" />
                <span class="form-label" style="margin:0">Produto ativo</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal confirmar exclusão -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Confirmar exclusão</span>
          <button class="btn btn-ghost" @click="deleteTarget = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja excluir o produto <strong>{{ deleteTarget.name }}</strong>?</p>
          <p class="text-muted text-sm" style="margin-top:8px">Esta ação não pode ser desfeita.</p>
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
    <!-- Modal importar CSV -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal" role="dialog" aria-label="Importar produtos via CSV">
        <div class="modal-header">
          <span class="modal-title">Importar Produtos (CSV)</span>
          <button class="btn btn-ghost" @click="showImportModal = false" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-muted text-sm">
            O CSV deve conter as colunas: <strong>barcode</strong>, <strong>nome</strong>, <strong>preço</strong>
            (opcionais: estoque, categoria, sku). O arquivo pode usar vírgula ou ponto-e-vírgula como separador.
          </p>
          <div class="import-upload-area" :class="{ dragging: isDragging }"
               @dragover.prevent="isDragging = true"
               @dragleave.prevent="isDragging = false"
               @drop.prevent="onDrop">
            <input type="file" accept=".csv,text/csv" ref="fileInput" @change="onFileSelected" style="display:none" />
            <div v-if="!importFileName" class="upload-placeholder" @click="$refs.fileInput.click()">
              <span class="upload-icon">📁</span>
              <span class="upload-text">Clique ou arraste um arquivo CSV aqui</span>
            </div>
            <div v-else class="uploaded-file">
              <span class="file-name">📄 {{ importFileName }}</span>
              <button class="btn btn-ghost btn-sm" @click="clearFile">✕</button>
            </div>
          </div>
          <div v-if="importError" class="alert alert-danger" style="margin-top:12px">{{ importError }}</div>
          <div v-if="importResult" class="import-summary" style="margin-top:12px">
            <div class="summary-row">
              <span class="summary-label">Total de linhas:</span>
              <span class="summary-value">{{ importResult.totalLines }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label" style="color:var(--color-success)">✓ Criados:</span>
              <span class="summary-value" style="color:var(--color-success)">{{ importResult.created }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label" style="color:var(--color-primary)">↻ Atualizados:</span>
              <span class="summary-value" style="color:var(--color-primary)">{{ importResult.updated }}</span>
            </div>
            <div v-if="importResult.errors && importResult.errors.length" class="summary-row">
              <span class="summary-label" style="color:var(--color-danger)">✕ Erros:</span>
              <span class="summary-value" style="color:var(--color-danger)">{{ importResult.errors.length }}</span>
            </div>
            <div v-if="importResult.errors && importResult.errors.length" class="import-errors" style="margin-top:8px">
              <details>
                <summary style="cursor:pointer;font-size:13px;color:var(--color-danger)">Ver detalhes dos erros</summary>
                <ul style="margin-top:8px;padding-left:20px;font-size:12px;color:var(--color-text-secondary)">
                  <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">Fechar</button>
          <button class="btn btn-primary" :disabled="!importFile || uploadingImport" @click="uploadImport">
            <span v-if="uploadingImport" class="spinner"></span>
            {{ uploadingImport ? 'Enviando…' : 'Importar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/utils/api.js'

const products = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const limit = 20
const offset = ref(0)
const currentPage = ref(1)
const showModal = ref(false)
const editing = ref(null)
const deleteTarget = ref(null)
const formError = ref('')

// CSV import state
const showImportModal = ref(false)
const importFile = ref(null)
const importFileName = ref('')
const uploadingImport = ref(false)
const importError = ref('')
const importResult = ref(null)
const isDragging = ref(false)
const fileInput = ref(null)

const form = reactive({
  name: '', sku: '', description: '', price: '', cost: '',
  stock: 0, stock_min: 5, categoryId: '', isActive: true,
})

let searchTimer = null

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; currentPage.value = 1; loadProducts() }, 400)
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

async function loadProducts() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (search.value) params.search = search.value
    const { data } = await api.get('/products', { params })
    products.value = data.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const { data } = await api.get('/categories')
    categories.value = data.data
  } catch (_) {}
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', sku: '', barcode: '', description: '', price: '', cost: '', stock: 0, stock_min: 5, categoryId: '', isActive: true })
  formError.value = ''
  showModal.value = true
}

function openEdit(p) {
  editing.value = p
  Object.assign(form, {
    name: p.name, sku: p.sku || '', barcode: p.barcode || '', description: p.description || '',
    price: p.price, cost: p.cost, stock: p.stock, stock_min: p.stock_min,
    categoryId: p.category_id || '', isActive: p.is_active,
  })
  formError.value = ''
  showModal.value = true
}

async function submitForm() {
  saving.value = true
  formError.value = ''
  try {
    const payload = { ...form, categoryId: form.categoryId || null }
    if (editing.value) {
      await api.put(`/products/${editing.value.id}`, payload)
    } else {
      await api.post('/products', payload)
    }
    showModal.value = false
    loadProducts()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

// ── CSV Import ───────────────────────────────────────────────────────────────
function openImportModal() {
  showImportModal.value = true
  importFile.value = null
  importFileName.value = ''
  importError.value = ''
  importResult.value = null
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  importFile.value = file
  importFileName.value = file.name
  importError.value = ''
  importResult.value = null
}

function onDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.name.toLowerCase().endsWith('.csv')) {
    importError.value = 'Apenas arquivos CSV são aceitos.'
    return
  }
  importFile.value = file
  importFileName.value = file.name
  importError.value = ''
  importResult.value = null
  isDragging.value = false
}

async function uploadImport() {
  if (!importFile.value) {
    importError.value = 'Selecione um arquivo CSV primeiro.'
    return
  }
  uploadingImport.value = true
  importError.value = ''
  importResult.value = null
  try {
    const formData = new FormData()
    formData.append('csv', importFile.value)
    const { data } = await api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data.data
    importError.value = ''
  } catch (err) {
    importError.value = err?.response?.data?.error?.message || 'Erro ao importar CSV.'
  } finally {
    uploadingImport.value = false
  }
}

function clearFile() {
  importFile.value = null
  importFileName.value = ''
  importResult.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function confirmDelete(p) { deleteTarget.value = p }

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await api.delete(`/products/${deleteTarget.value.id}`)
    deleteTarget.value = null
    loadProducts()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao excluir.')
  } finally {
    saving.value = false
  }
}

function prevPage() { offset.value = Math.max(0, offset.value - limit); currentPage.value--; loadProducts() }
function nextPage() { offset.value += limit; currentPage.value++; loadProducts() }

onMounted(() => { loadProducts(); loadCategories() })
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar-left { flex: 1; min-width: 200px; max-width: 360px; }
.toolbar-right { display: flex; gap: 8px; }
.search-input { font-size: 14px; }
.row-actions { display: flex; gap: 4px; }
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid var(--color-border); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-sm { padding: 4px 10px; font-size: 13px; }

/* CSV Import */
.import-upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  cursor: pointer;
}
.import-upload-area.dragging {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.05);
}
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--color-text-muted); }
.upload-icon { font-size: 28px; }
.uploaded-file { display: flex; align-items: center; justify-content: center; gap: 8px; }
.file-name { font-size: 14px; color: var(--color-text); }
.import-summary { background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px 16px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 14px; }
.summary-label { color: var(--color-text-secondary); }
.summary-value { font-weight: 600; }
.import-errors details { font-size: 13px; }
</style>
