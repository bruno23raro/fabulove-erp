<template>
  <div>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
    <template v-else>
      <!-- KPIs -->
      <div class="kpi-grid">
        <div v-for="(kpi, i) in kpis" :key="i" class="kpi-card card card-body">
          <div class="kpi-icon">{{ kpi.icon }}</div>
          <div class="kpi-value" :class="kpi.colorClass">{{ kpi.value }}</div>
          <div class="kpi-label text-muted text-sm">{{ kpi.label }}</div>
          <div v-if="kpi.sub" class="text-muted text-xs" style="margin-top: 4px">{{ kpi.sub }}</div>
        </div>
      </div>

      <!-- Duas colunas: AR e AP recentes -->
      <div class="dashboard-grid">
        <Card>
          <div class="card-header">
            <h2 class="card-title">Contas a Receber Recentes</h2>
          </div>
          <DataTable :headers="arHeaders" :data="receivables" empty-message="Nenhuma conta a receber" />
          <div style="padding: 12px 16px">
            <router-link to="/financial/receivables" class="btn btn-ghost" style="font-size: 13px">Ver todas →</router-link>
          </div>
        </Card>

        <Card>
          <div class="card-header">
            <h2 class="card-title">Contas a Pagar Recentes</h2>
          </div>
          <DataTable :headers="apHeaders" :data="payables" empty-message="Nenhuma conta a pagar" />
          <div style="padding: 12px 16px">
            <router-link to="/financial/payable" class="btn btn-ghost" style="font-size: 13px">Ver todas →</router-link>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api.js';
import { Card } from '@/components/ui';
import { DataTable } from '@/components/common';

const loading = ref(true);
const summary = ref(null);
const receivables = ref([]);
const payables = ref([]);

const arStatusMap = { pending: 'Pendente', paid: 'Quitada', partial: 'Parcial', written_off: 'Baixada' };
const apStatusMap = { pending: 'Pendente', paid: 'Quitada', partial: 'Parcial' };
const statusBadge = { Pendente: 'badge-warning', Quitada: 'badge-success', Parcial: 'badge-info', Baixada: 'badge-gray' };

const kpis = computed(() => {
  const s = summary.value || {};
  return [
    { icon: '💰', label: 'A Receber (abertas)', value: formatCurrency(s.accounts_receivable?.pending_total || 0), sub: `${s.accounts_receivable?.total_count || 0} registros`, colorClass: 'kpi-info' },
    { icon: '💳', label: 'A Pagar (abertas)', value: formatCurrency(s.accounts_payable?.pending_total || 0), sub: `${s.accounts_payable?.total_count || 0} registros`, colorClass: 'kpi-warning' },
    { icon: '📊', label: 'Posição Líquida', value: formatCurrency(s.net_position || 0), sub: 'Receber − Pagar', colorClass: (s.net_position || 0) >= 0 ? 'kpi-success' : 'kpi-danger' },
    { icon: '📈', label: 'Entradas (30d)', value: formatCurrency(s.cashflow_30d?.inflows || 0), sub: '', colorClass: 'kpi-success' },
    { icon: '📉', label: 'Saídas (30d)', value: formatCurrency(s.cashflow_30d?.outflows || 0), sub: '', colorClass: 'kpi-danger' },
  ];
});

const arHeaders = [
  { key: 'due_date', label: 'Vencimento' },
  { key: 'amount', label: 'Valor', class: 'text-right' },
  { key: 'status', label: 'Status' },
];

const apHeaders = [
  { key: 'due_date', label: 'Vencimento' },
  { key: 'amount', label: 'Valor', class: 'text-right' },
  { key: 'status', label: 'Status' },
];

function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; }
function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function badgeClass(status) { return statusBadge[status] || 'badge-gray'; }
function statusLabel(status) { return arStatusMap[status] || apStatusMap[status] || status; }

onMounted(async () => {
  loading.value = true;
  try {
    const [sumRes, recRes, payRes] = await Promise.all([
      api.get('/financial/summary'),
      api.get('/financial/receivable', { params: { limit: 5 } }),
      api.get('/financial/payable', { params: { limit: 5 } }),
    ]);
    summary.value = sumRes.data.data;
    receivables.value = recRes.data.data;
    payables.value = payRes.data.data;
  } catch (e) {
    console.error('Erro ao carregar dashboard financeiro:', e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }
</style>
