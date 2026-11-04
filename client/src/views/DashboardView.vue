<template>
  <div>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
    <template v-else>
      <!-- KPIs -->
      <div class="kpi-grid">
        <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card card card-body">
          <div class="kpi-icon" :class="kpi.colorClass" aria-hidden="true">{{ kpi.icon }}</div>
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-label text-muted text-sm">{{ kpi.label }}</div>
        </div>
      </div>

      <!-- Pedidos recentes -->
      <Card>
        <div class="card-header">
          <h2 class="card-title">Pedidos Recentes</h2>
        </div>
        <DataTable :headers="ordersHeaders" :data="data?.recent_orders || []"
          empty-message="Nenhum pedido encontrado" />
        <div style="padding: 12px 16px">
          <router-link to="/orders" class="btn btn-ghost" style="font-size: 13px">Ver todos →</router-link>
        </div>
      </Card>

      <!-- Estoque baixo -->
      <Card>
        <div class="card-header">
          <h2 class="card-title">⚠️ Estoque Baixo</h2>
        </div>
        <DataTable :headers="stockHeaders" :data="data?.inventory?.low_stock_products || []"
          empty-message="Nenhum alerta de estoque" />
        <div style="padding: 12px 16px">
          <router-link to="/products" class="btn btn-ghost" style="font-size: 13px">Ver produtos →</router-link>
        </div>
      </Card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api.js';
import { Card } from '@/components/ui';
import { DataTable } from '@/components/common';

const loading = ref(true);
const data = ref(null);

const kpis = computed(() => {
  if (!data.value) return [];
  const d = data.value;
  return [
    { icon: '🛒', label: 'Pedidos Pendentes', value: d.orders?.pending ?? 0, colorClass: 'kpi-warning' },
    { icon: '💰', label: 'Receita Total', value: formatCurrency(d.orders?.total_revenue ?? 0), colorClass: 'kpi-success' },
    { icon: '👥', label: 'Clientes', value: d.customers?.total ?? 0, colorClass: 'kpi-info' },
    { icon: '📦', label: 'Estoque Baixo', value: d.inventory?.low_stock_count ?? 0,
      colorClass: (d.inventory?.low_stock_count ?? 0) > 0 ? 'kpi-danger' : 'kpi-success' },
  ];
});

const ordersHeaders = [
  { key: 'order_number', label: 'Número' },
  { key: 'customer_name', label: 'Cliente' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total', class: 'text-right' },
];

const stockHeaders = [
  { key: 'name', label: 'Produto' },
  { key: 'stock', label: 'Estoque', class: 'text-right' },
  { key: 'stock_min', label: 'Mínimo', class: 'text-right' },
];

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

onMounted(async () => {
  try {
    const { data: res } = await api.get('/dashboard');
    data.value = res.data;
  } catch (err) {
    console.error('Erro ao carregar dashboard', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }
</style>
