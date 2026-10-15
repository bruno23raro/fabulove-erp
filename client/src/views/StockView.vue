<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="text-muted">Movimentações de estoque (últimas 100)</span>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">Saldo</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!movements.length">
              <td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhuma movimentação registrada</td>
            </tr>
            <tr v-for="m in movements" :key="m.id">
              <td class="text-muted text-sm">{{ formatDate(m.created_at) }}</td>
              <td class="font-semibold">{{ m.product_name || `#${m.product_id}` }}</td>
              <td>
                <span :class="typeBadge(m.type)" class="badge">{{ typeLabel(m.type) }}</span>
              </td>
              <td class="text-right">{{ m.quantity }}</td>
              <td class="text-right">{{ m.balance ?? '—' }}</td>
              <td class="text-muted text-sm">{{ m.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

const movements = ref([])
const loading = ref(true)

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

function typeLabel(type) {
  const labels = { in: 'Entrada', out: 'Saída', adjust: 'Ajuste' }
  return labels[type] || type
}

function typeBadge(type) {
  const classes = { in: 'badge-success', out: 'badge-danger', adjust: 'badge-warning' }
  return classes[type] || 'badge-gray'
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/stock/movements')
    movements.value = data.data || []
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
</style>
