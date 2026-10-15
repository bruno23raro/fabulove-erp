<template>
  <div>
    <div class="tabs" role="tablist">
      <button :class="['tab', { active: tab === 'sales' }]" @click="tab = 'sales'" role="tab">Vendas</button>
      <button :class="['tab', { active: tab === 'stock' }]" @click="tab = 'stock'" role="tab">Estoque</button>
    </div>
    <div v-if="tab === 'sales'">
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card card card-body">
          <div class="kpi-value" style="color:var(--color-success)">{{ salesKpis.totalOrders }}</div>
          <div class="kpi-label text-muted text-sm">Pedidos no período</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-value" style="color:var(--color-success)">{{ formatCurrency(salesKpis.totalRevenue) }}</div>
          <div class="kpi-label text-muted text-sm">Receita total</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-value">{{ salesKpis.avgTicket }}</div>
          <div class="kpi-label text-muted text-sm">Ticket médio</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-value" style="color:var(--color-warning)">{{ salesKpis.totalDays }}</div>
          <div class="kpi-label text-muted text-sm">Dias com vendas</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Evolução de Vendas</h2>
          <div class="card-actions">
            <input type="date" v-model="startDate" class="form-control form-control-sm" style="width:140px" @change="loadSales" />
            <span style="align-self:center;color:var(--color-text-muted)">ate</span>
            <input type="date" v-model="endDate" class="form-control form-control-sm" style="width:140px" @change="loadSales" />
          </div>
        </div>
        <div v-if="salesLoading" class="loading-center" style="padding:40px"><span class="spinner"></span></div>
        <div v-else-if="salesData.length === 0" style="padding:40px;text-align:center;color:var(--color-text-muted)">Nenhum dado de vendas.</div>
        <div v-else class="chart-area">
          <div v-for="row in salesData" :key="row.date" class="chart-bar-row">
            <div class="chart-bar-label">{{ formatDateShort(row.date) }}</div>
            <div class="chart-bar-track">
              <div class="chart-bar" :style="{ width: barWidth(row.revenue) }">
                <span class="chart-bar-value">{{ formatCurrency(row.revenue) }}</span>
              </div>
            </div>
            <div class="chart-bar-count text-muted text-sm" style="min-width:80px;text-align:right">{{ row.orders_count }} pedidos</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="tab === 'stock'">
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card card card-body">
          <div class="kpi-value">{{ stockMeta.total_products }}</div>
          <div class="kpi-label text-muted text-sm">Produtos ativos</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-value" style="color:var(--color-danger)">{{ stockMeta.low_stock_count }}</div>
          <div class="kpi-label text-muted text-sm">Estoque baixo</div>
        </div>
        <div class="kpi-card card card-body">
          <div class="kpi-value" style="color:var(--color-success)">{{ formatCurrency(stockMeta.total_stock_value) }}</div>
          <div class="kpi-label text-muted text-sm">Valor em estoque</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">Posição de Estoque</h2></div>
        <div v-if="stockLoading" class="loading-center" style="padding:40px"><span class="spinner"></span></div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU</th><th>Produto</th><th>Categoria</th><th class="text-right">Estoque</th><th class="text-right">Minimo</th><th class="text-right">Preco Custo</th><th class="text-right">Valor</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!stockData.length"><td colspan="8" style="text-align:center;color:var(--color-text-muted);padding:40px">Nenhum produto encontrado</td></tr>
              <tr v-for="p in stockData" :key="p.id">
                <td class="text-muted text-sm">{{ p.sku || '-' }}</td>
                <td class="font-semibold">{{ p.name }}</td>
                <td>{{ p.category_name || '-' }}</td>
                <td class="text-right" :style="p.is_low_stock ? 'color:var(--color-danger);font-weight:600' : ''">{{ p.stock }}</td>
                <td class="text-right text-muted">{{ p.stock_min }}</td>
                <td class="text-right text-muted">{{ formatCurrency(p.cost) }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(p.stock_value) }}</td>
                <td><span v-if="p.is_low_stock" class="badge badge-danger">Baixo</span><span v-else class="badge badge-success">OK</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/utils/api.js'

const tab = ref('sales')

const salesData = ref([])
const salesLoading = ref(false)
const startDate = ref('')
const endDate = ref('')
const salesKpis = reactive({ totalOrders: 0, totalRevenue: 0, avgTicket: '-', totalDays: 0 })

function formatDateShort(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function barWidth(value) {
  if (!salesData.value.length) return '0%'
  const max = Math.max(...salesData.value.map(r => r.revenue || 0), 1)
  return ((value / max) * 100) + '%'
}

async function loadSales() {
  salesLoading.value = true
  try {
    const params = {}
    if (startDate.value) params.start_date = startDate.value
    if (endDate.value) params.end_date = endDate.value
    const { data } = await api.get('/reports/sales', { params })
    salesData.value = data.data || []
    const totalOrders = salesData.value.reduce((s, r) => s + (r.orders_count || 0), 0)
    const totalRevenue = salesData.value.reduce((s, r) => s + parseFloat(r.revenue || 0), 0)
    salesKpis.totalOrders = totalOrders
    salesKpis.totalRevenue = totalRevenue
    salesKpis.avgTicket = totalOrders ? 'R$ ' + (totalRevenue / totalOrders).toFixed(2).replace('.', ',') : '-'
    salesKpis.totalDays = salesData.value.length
  } catch (err) { console.error('Erro ao carregar vendas:', err) }
  finally { salesLoading.value = false }
}

const stockData = ref([])
const stockMeta = reactive({ total_products: 0, low_stock_count: 0, total_stock_value: 0 })
const stockLoading = ref(false)

async function loadStock() {
  stockLoading.value = true
  try {
    const { data } = await api.get('/reports/stock')
    stockData.value = data.data || []
    stockMeta.total_products = data.meta ? data.meta.total_products : 0
    stockMeta.low_stock_count = data.meta ? data.meta.low_stock_count : 0
    stockMeta.total_stock_value = data.meta ? data.meta.total_stock_value : 0
  } catch (err) { console.error('Erro ao carregar estoque:', err) }
  finally { stockLoading.value = false }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

onMounted(() => {
  const today = new Date()
  const thirtyAgo = new Date(today.getTime() - 30 * 86400000)
  endDate.value = today.toISOString().slice(0, 10)
  startDate.value = thirtyAgo.toISOString().slice(0, 10)
  loadSales()
  loadStock()
})
</script>
<style scoped>
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid var(--color-border); padding-bottom: 0; }
.tab { padding: 10px 20px; border: none; background: transparent; font-size: 14px; font-weight: 500; color: var(--color-text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
.tab:hover { color: var(--color-text); }
.tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
.kpi-card { padding: 16px; }
.kpi-value { font-size: 22px; font-weight: 700; }
.kpi-label { font-size: 13px; }
.chart-area { display: flex; flex-direction: column; gap: 6px; padding: 16px; }
.chart-bar-row { display: flex; align-items: center; gap: 12px; }
.chart-bar-label { width: 70px; font-size: 12px; color: var(--color-text-muted); flex-shrink: 0; text-align: right; }
.chart-bar-track { flex: 1; background: var(--color-bg-secondary); border-radius: 4px; height: 24px; overflow: hidden; }
.chart-bar { height: 100%; background: linear-gradient(90deg, var(--color-primary), #7c3aed); border-radius: 4px; display: flex; align-items: center; padding-left: 8px; min-width: 40px; transition: width 0.4s ease; }
.chart-bar-value { font-size: 11px; color: #fff; font-weight: 600; white-space: nowrap; }
.chart-bar-count { width: 80px; flex-shrink: 0; font-size: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 0; }
.card-actions { display: flex; align-items: center; gap: 8px; }
@media (max-width: 600px) { .chart-bar-row { flex-wrap: wrap; } .chart-bar-label { width: 100%; text-align: left; } .card-actions { flex-wrap: wrap; } }
</style>
