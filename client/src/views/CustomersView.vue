<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <input v-model="search" type="search" class="form-control" placeholder="Buscar por nome, e-mail…" @input="onSearch" aria-label="Buscar clientes" />
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Novo Cliente</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>CPF/CNPJ</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!customers.length">
              <td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhum cliente encontrado</td>
            </tr>
            <tr v-for="c in customers" :key="c.id">
              <td class="font-semibold">{{ c.name }}</td>
              <td class="text-muted text-sm">{{ c.email || '—' }}</td>
              <td class="text-muted text-sm">{{ c.phone || '—' }}</td>
              <td class="text-muted text-sm">{{ c.document || '—' }}</td>
              <td>
                <span :class="c.is_active ? 'badge-success' : 'badge-gray'" class="badge">
                  {{ c.is_active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" @click="openEdit(c)" title="Editar">✏️</button>
                  <button class="btn btn-ghost" @click="confirmDelete(c)" title="Excluir" style="color:var(--color-danger)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && customers.length" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="offset === 0" @click="prevPage">← Anterior</button>
        <span class="text-muted text-sm">Página {{ currentPage }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="customers.length < limit" @click="nextPage">Próxima →</button>
      </div>
    </div>

    <!-- Modal criar/editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Cliente' : 'Novo Cliente' }}</span>
          <button class="btn btn-ghost" @click="showModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input v-model="form.name" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input v-model="form.email" type="email" class="form-control" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input v-model="form.phone" class="form-control" placeholder="(11) 99999-9999" />
              </div>
              <div class="form-group">
                <label class="form-label">CPF / CNPJ</label>
                <input v-model="form.document" class="form-control" placeholder="000.000.000-00" />
              </div>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" v-model="form.isActive" />
                <span class="form-label" style="margin:0">Cliente ativo</span>
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

    <!-- Confirmar exclusão -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Confirmar exclusão</span>
          <button class="btn btn-ghost" @click="deleteTarget = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Excluir o cliente <strong>{{ deleteTarget.name }}</strong>?</p>
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

const customers = ref([])
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
const form = reactive({ name: '', email: '', phone: '', document: '', isActive: true })

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
    const { data } = await api.get('/customers', { params })
    customers.value = data.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', phone: '', document: '', isActive: true })
  formError.value = ''
  showModal.value = true
}

function openEdit(c) {
  editing.value = c
  Object.assign(form, { name: c.name, email: c.email || '', phone: c.phone || '', document: c.document || '', isActive: c.is_active })
  formError.value = ''
  showModal.value = true
}

async function submitForm() {
  saving.value = true; formError.value = ''
  try {
    const payload = { ...form, email: form.email || undefined, document: form.document || undefined }
    if (editing.value) {
      await api.put(`/customers/${editing.value.id}`, payload)
    } else {
      await api.post('/customers', payload)
    }
    showModal.value = false
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(c) { deleteTarget.value = c }

async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/customers/${deleteTarget.value.id}`)
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
