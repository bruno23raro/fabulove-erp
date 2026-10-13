<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Nova Categoria</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Criada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!categories.length">
              <td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:40px">
                Nenhuma categoria cadastrada
              </td>
            </tr>
            <tr v-for="c in categories" :key="c.id">
              <td class="font-semibold">{{ c.name }}</td>
              <td class="text-muted text-sm truncate" style="max-width:300px">{{ c.description || '—' }}</td>
              <td class="text-muted text-sm">{{ formatDate(c.created_at) }}</td>
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
    </div>

    <!-- Modal criar/editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" role="dialog" :aria-label="editing ? 'Editar categoria' : 'Nova categoria'">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Categoria' : 'Nova Categoria' }}</span>
          <button class="btn btn-ghost" @click="showModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input v-model="form.name" class="form-control" required placeholder="Ex: Bijuterias" />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <textarea v-model="form.description" class="form-control" rows="3" placeholder="Descrição opcional…"></textarea>
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
          <p>Excluir a categoria <strong>{{ deleteTarget.name }}</strong>?</p>
          <p class="text-muted text-sm" style="margin-top:8px">Só é possível excluir categorias sem produtos vinculados.</p>
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

const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref(null)
const deleteTarget = ref(null)
const formError = ref('')
const form = reactive({ name: '', description: '' })

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/categories')
    categories.value = data.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''; form.description = ''
  formError.value = ''
  showModal.value = true
}

function openEdit(c) {
  editing.value = c
  form.name = c.name; form.description = c.description || ''
  formError.value = ''
  showModal.value = true
}

async function submitForm() {
  saving.value = true; formError.value = ''
  try {
    if (editing.value) {
      await api.put(`/categories/${editing.value.id}`, { name: form.name, description: form.description })
    } else {
      await api.post('/categories', { name: form.name, description: form.description })
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
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await api.delete(`/categories/${deleteTarget.value.id}`)
    deleteTarget.value = null
    load()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao excluir.')
    deleteTarget.value = null
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.row-actions { display: flex; gap: 4px; }
</style>
