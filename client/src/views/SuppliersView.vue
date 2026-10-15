<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <input v-model="search" type="search" class="form-control" placeholder="Buscar por nome…" @input="onSearch" aria-label="Buscar fornecedores" />
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Novo Fornecedor</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>E-mail</th><th>Telefone</th><th>Documento</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!suppliers.length">
              <td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhum fornecedor encontrado</td>
            </tr>
            <tr v-for="s in suppliers" :key="s.id">
              <td class="font-semibold">{{ s.name }}</td>
              <td class="text-muted text-sm">{{ s.email || '—' }}</td>
              <td class="text-muted text-sm">{{ s.phone || '—' }}</td>
              <td class="text-muted text-sm">{{ s.document || '—' }}</td>
              <td><span :class="statusClass(s.status)" class="badge">{{ s.status || 'pending' }}</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" @click="openEdit(s)" title="Editar">✏️</button>
                  <button class="btn btn-ghost" @click="confirmDelete(s)" title="Excluir" style="color:var(--color-danger)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && suppliers.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="suppliers.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>

    <!-- Modal criar/editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Fornecedor' : 'Novo Fornecedor' }}</span>
          <button class="btn btn-ghost" @click="showModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input v-model="form.name" class="form-control" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input v-model="form.email" type="email" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input v-model="form.phone" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Documento (CNPJ/CPF)</label>
              <input v-model="form.document" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-control">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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

    <!-- Confirmar exclusão -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Confirmar exclusão</span>
          <button class="btn btn-ghost" @click="deleteTarget = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Excluir o fornecedor <strong>{{ deleteTarget.name }}</strong>?</p>
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
import { ref, reactive, onMounted } from 'vue'
import api from '@/utils/api.js'

const suppliers = ref([])
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
const form = reactive({ name: '', email: '', phone: '', document: '', status: 'pending' })

let searchTimer = null

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; currentPage.value = 1; load() }, 400)
}

async function load() {
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (search.value) params.search = search.value
    const { data } = await api.get('/suppliers', { params })
    suppliers.value = data.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function statusClass(s) {
  const c = { active: 'badge-success', inactive: 'badge-danger' }
  return c[s] || 'badge-gray'
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', phone: '', document: '', status: 'pending' })
  formError.value = ''
  showModal.value = true
}

function openEdit(s) {
  editing.value = s
  Object.assign(form, { name: s.name, email: s.email || '', phone: s.phone || '', document: s.document || '', status: s.status || 'pending' })
  formError.value = ''
  showModal.value = true
}

async function submitForm() {
  saving.value = true; formError.value = ''
  try {
    const payload = { ...form, email: form.email || undefined, document: form.document || undefined, phone: form.phone || undefined }
    if (editing.value) {
      await api.put('/suppliers/' + editing.value.id, payload)
    } else {
      await api.post('/suppliers', payload)
    }
    showModal.value = false
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(s) { deleteTarget.value = s }

async function doDelete() {
  saving.value = true
  try {
    await api.delete('/suppliers/' + deleteTarget.value.id)
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
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-sm { padding: 4px 10px; font-size: 13px; }
</style>
