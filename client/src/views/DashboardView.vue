<template>
  <div>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>

    <div v-else>
      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card card card-body" v-for="kpi in kpis" :key="kpi.label">
          <div class="kpi-icon" :class="kpi.colorClass" aria-hidden="true">{{ kpi.icon }}</div>
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-label text-muted text-sm">{{ kpi.label }}</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Pedidos recentes -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Pedidos Recentes</h2>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data?.recent_orders?.length">
                  <td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:24px">
                    Nenhum pedido encontrado
                  </td>
                </tr>
                <tr v-for="order in data?.recent_orders" :key="order.id">
                  <td class="font-semibold">{{ order.order_number }}</td>
                  <td>{{ order.customer_name || '—' }}</td>
                  <td><span :class="statusBadgeClass(order.status)" class="badge">{{ order.status }}</span></td>
                  <td class="text-right">{{ formatCurrency(order.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:12px 16px">
            <router-link to="/orders" class="btn btn-ghost" style="font-size:13px">Ver todos →</router-link>
          </div>
        </div>

        <!-- Estoque baixo -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">⚠️ Estoque Baixo</h2>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-right">Estoque</th>
                  <th class="text-right">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data?.inventory?.low_stock_products?.length">
                  <td colspan="3" style="text-align:center;color:var(--color-text-muted);padding:24px">
                    Nenhum alerta de estoque
                  </td>
                </tr>
                <tr v-for="p in data?.inventory?.low_stock_products" :key="p.id">
                  <td>{{ p.name }}</td>
                  <td class="text-right" style="color:var(--color-danger);font-weight:600">{{ p.stock }}</td>
                  <td class="text-right text-muted">{{ p.stock_min }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:12px 16px">
            <router-link to="/products" class="btn btn-ghost" style="font-size:13px">Ver produtos →</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api.js'

const loading = ref(true)
const data = ref(null)

const kpis = computed(() => {
  if (!data.value) return []
  const d = data.value
  return [
    { icon: '🛒', label: 'Pedidos Pendentes', value: d.orders.pending, colorClass: 'kpi-warning' },
    { icon: '💰', label: 'Receita Total', value: formatCurrency(d.orders.total_revenue), colorClass: 'kpi-success' },
    { icon: '👥', label: 'Clientes', value: d.customers.total, colorClass: 'kpi-info' },
    { icon: '📦', label: 'Estoque Baixo', value: d.inventory.low_stock_count, colorClass: d.inventory.low_stock_count > 0 ? 'kpi-danger' : 'kpi-success' },
  ]
})

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

function statusBadgeClass(status) {
  const map = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    canceled: 'badge-danger',
    refunded: 'badge-gray',
  }
  return map[status] || 'badge-gray'
}

onMounted(async () => {
  try {
    const { data: res } = await api.get('/dashboard')
    data.value = res.data
  } catch (err) {
    console.error('Erro ao carregar dashboard', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-icon { font-size: 24px; margin-bottom: 4px; }
.kpi-value { font-size: 22px; font-weight: 700; }
.kpi-label { font-size: 13px; }

.kpi-success .kpi-value { color: var(--color-success); }
.kpi-warning .kpi-value { color: var(--color-warning); }
.kpi-danger  .kpi-value { color: var(--color-danger); }
.kpi-info    .kpi-value { color: var(--color-info); }

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card-header {
  padding: 16px 16px 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
