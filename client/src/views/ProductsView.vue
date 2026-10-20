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
        <button class="btn btn-secondary" @click="openImportModal">📥 Importar Produtos</button>
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
              <th class="text-right">Preço PDV</th>
              <th class="text-right">Preço Shopee</th>
              <th class="text-right">Estoque</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!products.length">
              <td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:40px">
                Nenhum produto encontrado
              </td>
            </tr>
            <tr v-for="p in products" :key="p.id">
              <td class="font-semibold">{{ p.name }}</td>
              <td class="text-muted text-sm">{{ p.sku || '—' }}</td>
              <td class="text-muted text-sm" style="font-family:monospace">{{ p.barcode || '—' }}</td>
              <td>{{ p.category_name || '—' }}</td>
              <td class="text-right">{{ formatCurrency(p.price) }}</td>
              <td class="text-right" style="color:var(--color-success);font-weight:600">{{ formatCurrency(p.price_shopee) }}</td>
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
                <input v-model="form.barcode" class="form-control" placeholder="Ex: 7891234567890" @keyup.enter="onBarcodeEnter" :class="{ 'barcode-flash': barcodeFlash }" />
                <span v-if="barcodeFlash" class="text-muted text-sm" style="margin-top:4px;display:block">⬆️ Código lido pelo leitor — carregando produto…</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Preço PDV *</label>
                <input v-model="form.price" type="number" step="0.01" min="0" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">Preço Shopee (auto)</label>
                <input :value="shopeePrice" class="form-control" disabled style="background:var(--color-surface-2);color:var(--color-success);font-weight:600" />
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

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- WIZARD DE IMPORTAÇÃO — 4 etapas                                -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal import-wizard" role="dialog" aria-label="Importador universal de produtos">
        <!-- Header -->
        <div class="modal-header">
          <span class="modal-title">📥 Importar Produtos</span>
          <button class="btn btn-ghost" @click="showImportModal = false" aria-label="Fechar">✕</button>
        </div>

        <!-- Step indicators -->
        <div class="wizard-steps">
          <div v-for="(s, i) in steps" :key="i"
               class="step-indicator"
               :class="{ active: importStep === i, done: importStep > i }">
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-label">{{ s }}</span>
          </div>
          <div class="step-progress" :style="{ width: ((importStep) / (steps.length - 1)) * 100 + '%' }"></div>
        </div>

        <div class="modal-body wizard-body">
          <!-- STEP 0: Upload -->
          <div v-if="importStep === 0">
            <p class="text-muted text-sm" style="margin-bottom:16px">
              Suporta <strong>CSV, XLSX, JSON, XML e ZIP</strong>. O sistema detecta automaticamente o formato e reconhece as colunas.
            </p>
            <div class="import-upload-area" :class="{ dragging: isDragging }"
                 @dragover.prevent="isDragging = true"
                 @dragleave.prevent="isDragging = false"
                 @drop.prevent="onDrop">
              <input type="file"
                     accept=".csv,.tsv,.txt,.xlsx,.xls,.json,.jsonl,.ndjson,.xml,.zip"
                     ref="fileInput"
                     @change="onFileSelected"
                     style="display:none" />
              <div v-if="!importFile" class="upload-placeholder" @click="$refs.fileInput.click()">
                <span class="upload-icon">📁</span>
                <span class="upload-text">Clique ou arraste um arquivo aqui</span>
                <span class="upload-hint">CSV, XLSX, JSON, XML ou ZIP</span>
              </div>
              <div v-else class="uploaded-file-info">
                <div class="uploaded-file-main">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ importFileName }}</span>
                  <span class="file-size">{{ formatFileSize(importFileRaw?.size) }}</span>
                </div>
                <button class="btn btn-ghost btn-sm" @click="clearFile">✕</button>
              </div>
            </div>
            <div v-if="analyzeLoading" class="analyze-loading" style="margin-top:12px;text-align:center">
              <span class="spinner" style="width:16px;height:16px"></span>
              <span class="text-muted text-sm" style="margin-left:8px">Analisando arquivo…</span>
            </div>
            <div v-if="analyzeError" class="alert alert-danger" style="margin-top:12px">{{ analyzeError }}</div>
          </div>

          <!-- STEP 1: Preview & Mapping -->
          <div v-if="importStep === 1">
            <div class="mapping-header">
              <span class="text-sm text-muted">Formato detectado: <strong>{{ analysis?.formatLabel }}</strong> · {{ analysis?.totalRows }} linhas</span>
              <button class="btn btn-ghost btn-sm" @click="importStep = 0">← Trocar arquivo</button>
            </div>

            <!-- Column mapping table -->
            <div class="mapping-section">
              <h4 class="mapping-section-title">Mapeamento de Colunas</h4>
              <div class="mapping-table">
                <div class="mapping-row header">
                  <span>Coluna no arquivo</span>
                  <span>Mapear para</span>
                  <span>Confiança</span>
                </div>
                <div v-for="col in columnMappings" :key="col.header" class="mapping-row">
                  <span class="col-source">{{ col.header }}</span>
                  <span>
                    <select v-model="col.mapping" class="mapping-select" :class="{ 'mapping-high': col.confidence >= 0.7 }">
                      <option value="">— não mapeado —</option>
                      <option v-for="f in targetFields" :key="f" :value="f">
                        {{ fieldLabel(f) }}
                      </option>
                    </select>
                  </span>
                  <span>
                    <span v-if="col.confidence >= 0.7" class="confidence-badge confidence-high">✓ alto</span>
                    <span v-else-if="col.confidence >= 0.45" class="confidence-badge confidence-mid">~ médio</span>
                    <span v-else class="confidence-badge confidence-low">? baixo</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div class="preview-section" style="margin-top:16px">
              <h4 class="mapping-section-title">Pré-visualização (até 5 linhas)</h4>
              <div class="table-wrapper" style="max-height:200px;overflow-y:auto">
                <table class="preview-table">
                  <thead>
                    <tr>
                      <th v-for="h in analysis?.headers" :key="h">{{ h }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in (analysis?.preview || []).slice(0,5)" :key="ri">
                      <td v-for="h in analysis?.headers" :key="h" class="text-muted text-sm">{{ row[h] || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- STEP 2: Options -->
          <div v-if="importStep === 2">
            <div class="options-section">
              <div class="form-group">
                <label class="form-label">Política de duplicatas</label>
                <select v-model="importOptions.duplicatePolicy" class="form-control">
                  <option value="skip">⏭️ Ignorar duplicatas (padrão)</option>
                  <option value="create">➕ Criar mesmo com duplicata</option>
                  <option value="update">🔄 Atualizar produto existente</option>
                  <option value="review">⚠️ Revisar duplicatas (flag)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tamanho do lote</label>
                <input v-model.number="importOptions.batchSize" type="number" min="10" max="5000" class="form-control" style="max-width:160px" />
                <span class="text-muted text-sm">Registros por transação (10–5000)</span>
              </div>
              <div class="form-group">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                  <input type="checkbox" v-model="importOptions.saveProfile" />
                  <span class="form-label" style="margin:0">Salvar este mapeamento como perfil</span>
                </label>
              </div>
              <div v-if="importOptions.saveProfile" class="form-group" style="margin-left:24px">
                <input v-model="importOptions.profileName" placeholder="Nome do perfil (ex: Fornecedor ABC)" class="form-control" style="max-width:280px" />
              </div>
              <div v-if="savedProfiles.length" class="form-group" style="margin-top:12px">
                <label class="form-label">Perfis salvos</label>
                <div v-for="p in savedProfiles" :key="p.id" class="profile-chip" @click="loadProfile(p)">
                  <span class="profile-name">{{ p.name }}</span>
                  <span class="text-muted text-sm">{{ p.mapping ? Object.keys(p.mapping).length + ' colunas' : 'sem mapeamento' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 3: Results -->
          <div v-if="importStep === 3">
            <div v-if="importResult" class="result-summary">
              <div class="result-icon">{{ importResult.success ? '✅' : '❌' }}</div>
              <h3 style="margin:8px 0">{{ importResult.success ? 'Importação concluída!' : 'Erros na importação' }}</h3>

              <div v-if="importResult.success" class="stats-grid">
                <div class="stat-card">
                  <span class="stat-value" style="color:var(--color-success)">{{ importResult.data?.created ?? 0 }}</span>
                  <span class="stat-label">Criados</span>
                </div>
                <div class="stat-card">
                  <span class="stat-value" style="color:var(--color-info)">{{ importResult.data?.updated ?? 0 }}</span>
                  <span class="stat-label">Atualizados</span>
                </div>
                <div class="stat-card">
                  <span class="stat-value" style="color:var(--color-warning)">{{ importResult.data?.skipped ?? 0 }}</span>
                  <span class="stat-label">Ignorados</span>
                </div>
                <div class="stat-card">
                  <span class="stat-value">{{ importResult.data?.totalLines ?? 0 }}</span>
                  <span class="stat-label">Total de linhas</span>
                </div>
              </div>

              <!-- Image recovery panel -->
              <div v-if="importResult?.success && pendingImages.length > 0" class="image-recovery-section">
                <h4 style="margin:16px 0 8px;font-size:14px">
                  🖼️ {{ pendingImages.length }} imagem(ns) encontrada(s) no arquivo — associe aos produtos
                </h4>
                <div class="image-gallery">
                  <div v-for="img in pendingImages" :key="img.id"
                       class="image-tile"
                       :class="{ selected: selectedImageIds.includes(img.id) }"
                       @click="toggleImage(img.id)">
                    <div class="image-thumb" :style="{ backgroundImage: `url(${img.url})` }"></div>
                    <div class="image-info">
                      <span class="image-name">{{ img.filename }}</span>
                      <span v-if="img.product_id" class="image-linked">✓ {{ img.product_id }}</span>
                      <button class="btn btn-ghost btn-xs" @click.stop="discardImage(img.id)" title="Descartar">✕</button>
                    </div>
                  </div>
                </div>
                <div v-if="pendingImages.length > 0" class="image-associate-bar">
                  <select v-model="imageProductFilter" class="form-control" style="max-width:200px;display:inline-block">
                    <option value="">— selecionar produto —</option>
                    <option v-for="p in products" :key="p.id" :value="p.id">
                      {{ p.name }} ({{ p.sku || p.id }})
                    </option>
                  </select>
                  <button class="btn btn-primary btn-sm" :disabled="!imageProductFilter || selectedImageIds.length === 0"
                          @click="associateImages">
                    Associar {{ selectedImageIds.length }} imagem(ns)
                  </button>
                  <button class="btn btn-ghost btn-sm" @click="discardAllImages">Descartar todas</button>
                </div>
                <div v-if="imageError" class="alert alert-danger" style="margin-top:8px">{{ imageError }}</div>
              </div>

              <div v-if="importResult.data?.errorList?.length" class="errors-section">
                <details>
                  <summary style="cursor:pointer;font-size:13px;color:var(--color-danger);font-weight:500">
                    {{ importResult.data.errorList.length }} erro(s) encontrado(s)
                  </summary>
                  <ul style="margin-top:8px;padding-left:20px;font-size:12px;color:var(--color-text-secondary)">
                    <li v-for="(err, i) in importResult.data.errorList" :key="i">{{ err }}</li>
                  </ul>
                </details>
              </div>
            </div>
            <div v-else-if="importError" class="alert alert-danger">{{ importError }}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button v-if="importStep > 0" class="btn btn-secondary" @click="importStep--">← Voltar</button>
          <button v-if="importStep === 0" class="btn btn-secondary" @click="showImportModal = false">Cancelar</button>
          <button v-if="importStep < 3"
                  class="btn btn-primary"
                  :disabled="!canProceed"
                  @click="nextStep">
            {{ importStep === 2 ? '🚀 Iniciar Importação' : 'Próximo →' }}
          </button>
          <button v-if="importStep === 3 && importResult?.success"
                  class="btn btn-primary"
                  @click="showImportModal = false">
            ✓ Concluir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/utils/api.js'

const products = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const limit = 20
const offset = ref(0)
const currentPage = ref(1)
const modalOpen = ref(false)
const editing = ref(null)
const deleteTarget = ref(null)
const formError = ref('')
const barcodeFlash = ref(false)
const showModal = ref(false)

// ── Import Wizard State ───────────────────────────────────────────────
const showImportModal = ref(false)
const importStep = ref(0)
const steps = ['Upload', 'Mapeamento', 'Opções', 'Resultado']

const importFileRaw = ref(null)
const importFileName = ref('')
const uploadingImport = ref(false)
const importError = ref('')
const importResult = ref(null)
const isDragging = ref(false)
const fileInput = ref(null)
const analyzeLoading = ref(false)
const analyzeError = ref('')
const analysis = ref(null)
const savedProfiles = ref([])

// ── Image Recovery State ─────────────────────────────────────────────────────
const pendingImages = ref([])
const imageLoading = ref(false)
const imageError = ref('')
const selectedImageIds = ref([])
const imageProductFilter = ref('')

// Column mappings: { headerName: { mapping, confidence } }
const columnMappings = ref([])
const targetFields = ref(['name','sku','barcode','description','price','cost','stock','stockMin','category','brand','weight','image','ncm'])

const importOptions = reactive({
  duplicatePolicy: 'skip',
  batchSize: 500,
  saveProfile: false,
  profileName: '',
})

const canProceed = computed(() => {
  if (importStep.value === 0) return !!importFileRaw.value
  if (importStep.value === 1) return true // mapping optional
  if (importStep.value === 2) return true
  return false
})

const form = reactive({
  name: '', sku: '', barcode: '', description: '', price: '', cost: '',
  stock: 0, stock_min: 5, categoryId: '', isActive: true,
})

const shopeePrice = computed(() => {
  const p = parseFloat(form.price)
  if (isNaN(p) || p <= 0) return 'R$ 0,00'
  return formatCurrency(Math.round((p * 1.19 + 4.71) * 100) / 100)
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

function fieldLabel(field) {
  const labels = {
    name: 'Nome', sku: 'SKU', barcode: 'Código de Barras', description: 'Descrição',
    price: 'Preço', cost: 'Custo', stock: 'Estoque', stockMin: 'Estoque Mínimo',
    category: 'Categoria', brand: 'Marca', weight: 'Peso', image: 'Imagem', ncm: 'NCM',
  }
  return labels[field] || field
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── Wizard Actions ────────────────────────────────────────────────────
function openImportModal() {
  importStep.value = 0
  importFileRaw.value = null
  importFileName.value = ''
  importError.value = ''
  importResult.value = null
  analysis.value = null
  columnMappings.value = []
  analyzeError.value = ''
  analyzeLoading.value = false
  importOptions.duplicatePolicy = 'skip'
  importOptions.batchSize = 500
  importOptions.saveProfile = false
  importOptions.profileName = ''
  showImportModal.value = true
  loadProfiles()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  analyzeFile(file)
}

function onDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) {
    analyzeError.value = 'Nenhum arquivo detectado.'
    return
  }
  analyzeFile(file)
  isDragging.value = false
}

async function analyzeFile(file) {
  importFileRaw.value = file
  importFileName.value = file.name
  importError.value = ''
  analyzeError.value = ''
  analysis.value = null
  analyzeLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/products/import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    analysis.value = data.data
    buildColumnMappings(analysis.value)
    // Auto-advance to step 1 after brief delay
    setTimeout(() => { if (importStep.value === 0) importStep.value = 1 }, 400)
  } catch (err) {
    analyzeError.value = err?.response?.data?.error?.message || 'Erro ao analisar arquivo.'
  } finally {
    analyzeLoading.value = false
  }
}

function buildColumnMappings(analysisData) {
  const mappings = []
  for (const col of (analysisData.headerAnalysis || [])) {
    mappings.push({
      header: col.header,
      mapping: col.mappedField || '',
      confidence: col.confidence,
    })
  }
  columnMappings.value = mappings
}

function nextStep() {
  if (importStep.value === 0) {
    // Re-analyze if needed
    if (importFileRaw.value && !analysis.value) {
      analyzeFile(importFileRaw.value)
      return
    }
    importStep.value = 1
  } else if (importStep.value === 1) {
    importStep.value = 2
  } else if (importStep.value === 2) {
    runImport()
  }
}

async function runImport() {
  uploadingImport.value = true
  importError.value = ''
  importResult.value = null
  try {
    // Build mapping from columnMappings
    const mapping = {}
    for (const col of columnMappings.value) {
      if (col.mapping) {
        mapping[col.mapping] = col.header
      }
    }

    const formData = new FormData()
    formData.append('file', importFileRaw.value)
    formData.append('mapping', JSON.stringify(mapping))
    formData.append('duplicatePolicy', importOptions.duplicatePolicy)
    formData.append('batchSize', importOptions.batchSize)
    if (importOptions.saveProfile && importOptions.profileName) {
      formData.append('profileName', importOptions.profileName)
    }

    const { data } = await api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
    importStep.value = 3
    if (importOptions.saveProfile && importOptions.profileName) {
      await saveProfile()
      await loadProfiles()
    }
    loadProducts()
    await loadPendingImages()
  } catch (err) {
    importError.value = err?.response?.data?.error?.message || 'Erro ao importar arquivo.'
    importResult.value = { success: false }
    importStep.value = 3
  } finally {
    uploadingImport.value = false
  }
}

async function saveProfile() {
  const mapping = {}
  for (const col of columnMappings.value) {
    if (col.mapping) mapping[col.mapping] = col.header
  }
  try {
    await api.post('/products/import/profiles', {
      name: importOptions.profileName,
      mapping,
    })
  } catch (_) {}
}

async function loadProfiles() {
  try {
    const { data } = await api.get('/products/import/profiles')
    savedProfiles.value = data.data || []
  } catch (_) {}
}

// ── Image Recovery Actions ────────────────────────────────────────────────────
async function loadPendingImages() {
  imageLoading.value = true
  imageError.value = ''
  try {
    const { data } = await api.get('/products/import/images/pending')
    pendingImages.value = data.data || []
  } catch (err) {
    imageError.value = err?.response?.data?.error?.message || 'Erro ao carregar imagens.'
  } finally {
    imageLoading.value = false
  }
}

function toggleImage(id) {
  const idx = selectedImageIds.value.indexOf(id)
  if (idx >= 0) selectedImageIds.value.splice(idx, 1)
  else selectedImageIds.value.push(id)
}

async function associateImages() {
  if (!imageProductFilter.value || selectedImageIds.value.length === 0) return
  try {
    await api.post('/products/import/images/associate', {
      imageIds: selectedImageIds.value,
      productId: parseInt(imageProductFilter.value),
    })
    selectedImageIds.value = []
    await loadPendingImages()
    loadProducts()
  } catch (err) {
    imageError.value = err?.response?.data?.error?.message || 'Erro ao associar imagens.'
  }
}

async function discardImage(id) {
  try {
    await api.delete(`/products/import/images/${id}`)
    selectedImageIds.value = selectedImageIds.value.filter(i => i !== id)
    await loadPendingImages()
  } catch (_) {}
}

async function discardAllImages() {
  if (pendingImages.value.length === 0) return
  const ids = pendingImages.value.map(i => i.id)
  for (const id of ids) {
    try { await api.delete(`/products/import/images/${id}`) } catch (_) {}
  }
  pendingImages.value = []
  selectedImageIds.value = []
}

function loadProfile(profile) {
  if (profile.mapping) {
    try {
      const m = typeof profile.mapping === 'string' ? JSON.parse(profile.mapping) : profile.mapping
      columnMappings.value = (analysis.value?.headerAnalysis || []).map(col => ({
        header: col.header,
        mapping: m[col.header] || col.mappedField || '',
        confidence: col.confidence,
      }))
    } catch (_) {}
  }
}

function clearFile() {
  importFileRaw.value = null
  importFileName.value = ''
  analysis.value = null
  columnMappings.value = []
  analyzeError.value = ''
  importResult.value = null
  pendingImages.value = []
  selectedImageIds.value = []
  imageProductFilter.value = ''
  imageError.value = ''
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

// ── Leitor de código de barras (teclado / leitor) ────────────────────────────
async function onBarcodeEnter() {
  const code = form.barcode?.trim()
  if (!code) return
  barcodeFlash.value = true
  setTimeout(() => { barcodeFlash.value = false }, 600)
  try {
    const { data } = await api.get(`/pos/products/by-barcode/${encodeURIComponent(code)}`)
    const product = data.data
    if (product) {
      openEdit(product)
      return
    }
    Object.assign(form, { name: code, sku: '', barcode: code, description: '', price: '', cost: '', stock: 0, stock_min: 5, categoryId: '', isActive: true })
    formError.value = ''
    showModal.value = true
  } catch (_) {
    formError.value = 'Produto não encontrado pelo código de barras.'
  }
}

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

/* Barcode scanner flash */
.barcode-flash {
  animation: barcode-flash-anim 0.6s ease-out;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
@keyframes barcode-flash-anim {
  0%   { background: rgba(59, 130, 246, 0.2); }
  100% { background: transparent; }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* IMPORT WIZARD                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */
.import-wizard {
  max-width: 720px;
}

.wizard-steps {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px 0;
  gap: 0;
  position: relative;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  position: relative;
  z-index: 1;
  cursor: default;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  background: var(--color-surface);
  transition: all 0.2s;
}

.step-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  white-space: nowrap;
}

.step-indicator.active .step-num {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
.step-indicator.active .step-label {
  color: var(--color-primary);
  font-weight: 600;
}

.step-indicator.done .step-num {
  border-color: var(--color-success);
  background: var(--color-success);
  color: #fff;
}

.step-progress {
  position: absolute;
  top: 33px;
  left: 12.5%;
  height: 2px;
  background: var(--color-success);
  z-index: 0;
  transition: width 0.3s;
  border-radius: 1px;
}

.wizard-body {
  min-height: 200px;
}

/* Upload area */
.import-upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  cursor: pointer;
}
.import-upload-area.dragging {
  border-color: var(--color-primary);
  background: rgba(124, 58, 237, 0.05);
}
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--color-text-muted); }
.upload-icon { font-size: 32px; }
.upload-text { font-size: 15px; font-weight: 500; color: var(--color-text); }
.upload-hint { font-size: 12px; }
.uploaded-file-info { display: flex; align-items: center; justify-content: center; gap: 12px; }
.uploaded-file-main { display: flex; align-items: center; gap: 8px; }
.file-icon { font-size: 20px; }
.file-name { font-size: 14px; font-weight: 500; }
.file-size { font-size: 12px; color: var(--color-text-muted); }
.analyze-loading { display: flex; align-items: center; justify-content: center; }

/* Mapping */
.mapping-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}
.mapping-section { margin-bottom: 16px; }
.mapping-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.mapping-table { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
.mapping-row { display: grid; grid-template-columns: 1fr 1fr 80px; padding: 8px 12px; border-bottom: 1px solid var(--color-border); font-size: 13px; align-items: center; }
.mapping-row:last-child { border-bottom: none; }
.mapping-row.header { background: #fafafa; font-weight: 600; font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.mapping-select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  width: 100%;
  background: var(--color-surface);
}
.mapping-select:focus { outline: none; border-color: var(--color-primary); }
.mapping-high { border-color: var(--color-success); background: #f0fdf4; }
.col-source { font-family: monospace; font-size: 13px; }

/* Confidence badges */
.confidence-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}
.confidence-high { background: #d1fae5; color: #065f46; }
.confidence-mid  { background: #fef3c7; color: #92400e; }
.confidence-low  { background: #fee2e2; color: #991b1b; }

/* Preview table */
.preview-table { width: 100%; font-size: 12px; }
.preview-table th { padding: 6px 10px; text-align: left; font-size: 11px; background: #fafafa; border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; }
.preview-table td { padding: 5px 10px; border-bottom: 1px solid var(--color-border); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Options */
.options-section .form-group { margin-bottom: 16px; }
.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-right: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
  font-size: 13px;
}
.profile-chip:hover { border-color: var(--color-primary); }
.profile-name { font-weight: 500; }

/* Results */
.result-summary { text-align: center; padding: 16px 0; }
.result-icon { font-size: 48px; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 20px 0;
}
.stat-card {
  background: var(--color-surface-2, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--color-text-muted); }
.errors-section { margin-top: 16px; text-align: left; }

/* Image recovery */
.image-recovery-section {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  margin-top: 16px;
}
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.image-tile {
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  background: var(--color-surface-2);
}
.image-tile:hover { border-color: var(--color-primary-light, #93c5fd); }
.image-tile.selected { border-color: var(--color-primary); background: rgba(59,130,246,0.08); }
.image-thumb {
  width: 100%;
  height: 80px;
  background-size: cover;
  background-position: center;
  background-color: var(--color-border);
}
.image-info {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  font-size: 11px;
  overflow: hidden;
}
.image-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}
.image-linked { color: var(--color-success); font-weight: 500; }
.image-associate-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 13px;
}
.btn-xs { padding: 2px 6px; font-size: 11px; }
</style>
