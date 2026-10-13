<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-right">
        <button class="btn btn-primary" @click="openCreate">+ Nova Configuração</button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else-if="!configList.length" style="padding:40px;text-align:center;color:var(--color-text-muted)">
        Nenhuma configuração cadastrada
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Chave</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in configList" :key="c.key">
              <td class="font-semibold text-sm" style="font-family:monospace">{{ c.key }}</td>
              <td class="text-sm truncate" style="max-width:300px">{{ displayValue(c) }}</td>
              <td><span class="badge badge-info">{{ c.type }}</span></td>
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
      <div class="modal" role="dialog">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Editar Configuração' : 'Nova Configuração' }}</span>
          <button class="btn btn-ghost" @click="showModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Chave *</label>
              <input v-model="form.key" class="form-control" :readonly="Boolean(editing)" required placeholder="ex: max_orders_per_day" style="font-family:monospace" />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select v-model="form.type" class="form-control">
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor *</label>
              <textarea v-if="form.type === 'json'" v-model="form.value" class="form-control" rows="4" placeholder='{"key":"value"}' required></textarea>
              <select v-else-if="form.type === 'boolean'" v-model="form.value" class="form-control" required>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
              <input v-else v-model="form.value" :type="form.type === 'number' ? 'number' : 'text'" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <input v-model="form.description" class="form-control" placeholder="Descrição opcional" />
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
          <p>Excluir a configuração <strong style="font-family:monospace">{{ deleteTarget.key }}</strong>?</p>
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

const configList = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref(null)
const deleteTarget = ref(null)
const formError = ref('')
const form = reactive({ key: '', value: '', type: 'string', description: '' })

function displayValue(c) {
  const v = c.value
  if (typeof v === 'string' && v.length > 80) return v.slice(0, 80) + '…'
  return v
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/config')
    // API returns key-value map; convert to array for table display
    configList.value = Object.entries(data.data || {}).map(([key, value]) => ({ key, value }))
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { key: '', value: '', type: 'string', description: '' })
  formError.value = ''
  showModal.value = true
}

function openEdit(c) {
  editing.value = c
  Object.assign(form, { key: c.key, value: String(c.value), type: c.type || 'string', description: c.description || '' })
  formError.value = ''
  showModal.value = true
}

async function submitForm() {
  saving.value = true; formError.value = ''
  try {
    const payload = { value: form.value, type: form.type, description: form.description || undefined }
    await api.put(`/config/${form.key}`, payload)
    showModal.value = false
    load()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || 'Erro ao salvar.'
  } finally { saving.value = false }
}

function confirmDelete(c) { deleteTarget.value = c }

async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/config/${deleteTarget.value.key}`)
    deleteTarget.value = null
    load()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao excluir.')
    deleteTarget.value = null
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.row-actions { display: flex; gap: 4px; }
</style>
