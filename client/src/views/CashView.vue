<template>
  <div>
    <Toolbar
      :title="'Caixa'"
      :filters="[
        { key: 'tipo', component: 'Select', label: 'Tipo', options: typeOptions, modelValue: filterType, placeholder: 'Todos os tipos', onChange: (v) => { filterType = v; load(); } }
      ]"
    />

    <Card>
      <DataTable
        :headers="tableHeaders"
        :data="items"
        :loading="loading"
        empty-message="Nenhuma movimentação encontrada"
      >
        <template #cell-created_at="{ row }">
          <span class="text-muted text-sm">{{ formatDateTime(row.created_at) }}</span>
        </template>
        <template #cell-type="{ row }">
          <span :class="typeBadge(row.type)" class="badge">{{ typeLabel(row.type) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <span class="font-semibold text-right" :style="{ color: isOutflow(row.type) ? 'var(--color-danger)' : 'var(--color-success)' }">
            {{ isOutflow(row.type) ? '-' : '+' }}{{ formatCurrency(row.amount) }}
          </span>
        </template>
        <template #cell-notes="{ row }">
          <span class="text-sm text-muted">{{ truncate(row.notes, 30) }}</span>
        </template>
      </DataTable>

      <Pagination
        v-if="!loading && items.length"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="totalItems"
        :pageSize="limit"
        @change="onPageChange"
      />
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api.js';
import { Toolbar, DataTable, Pagination } from '@/components/common';
import { Card } from '@/components/ui';

const items = ref([]);
const loading = ref(true);
const filterType = ref('');
const limit = 50;
const offset = ref(0);
const currentPage = ref(1);

const typeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'sale', label: 'Venda' },
  { value: 'suprimento', label: 'Suprimento' },
  { value: 'sangria', label: 'Sangria' },
  { value: 'entry', label: 'Entrada' },
  { value: 'exit', label: 'Saída' },
];

const tableHeaders = [
  { key: 'created_at', label: 'Data/Hora' },
  { key: 'type', label: 'Tipo' },
  { key: 'amount', label: 'Valor', class: 'text-right' },
  { key: 'reference_label', label: 'Referência' },
  { key: 'payment_method', label: 'Pagamento' },
  { key: 'operator_name', label: 'Operador' },
  { key: 'notes', label: 'Observação' },
];

const totalItems = computed(() => items.value.length + offset.value);
const totalPages = computed(() => Math.ceil(totalItems.value / limit));

const typeLabels = { sale: 'Venda', suprimento: 'Suprimento', sangria: 'Sangria', entry: 'Entrada', exit: 'Saída' };
const typeBadges = { sale: 'badge-success', suprimento: 'badge-info', sangria: 'badge-danger', entry: 'badge-success', exit: 'badge-danger' };

function typeLabel(t) { return typeLabels[t] || t; }
function typeBadge(t) { return typeBadges[t] || 'badge-gray'; }
function isOutflow(t) { return ['sangria', 'exit'].includes(t); }
function truncate(str, n) { if (!str) return ''; return str.length > n ? str.slice(0, n) + '…' : str; }
function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('pt-BR') : '—'; }

async function load() {
  loading.value = true;
  try {
    const params = { limit, offset: offset.value };
    if (filterType.value) params.type = filterType.value;
    const { data } = await api.get('/financial/cash', { params });
    items.value = data.data || [];
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
}

function onPageChange({ page }) {
  currentPage.value = page;
  offset.value = (page - 1) * limit;
  load();
}

onMounted(load);
</script>
