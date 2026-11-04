<template>
  <Toolbar :title="'Movimentações de Estoque'" :subtitle="'Últimas 100 movimentações'" :showSearch="false" />

  <Card>
    <DataTable
      :headers="tableHeaders"
      :data="movements"
      :loading="loading"
      emptyMessage="Nenhuma movimentação registrada"
    >
      <template #cell-type="{ row }">
        <span :class="typeBadge(row.type)" class="badge">{{ typeLabel(row.type) }}</span>
      </template>
    </DataTable>
  </Card>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable } from "@/components/common";
import { Card } from "@/components/ui";

const movements = ref([]);
const loading = ref(true);

const tableHeaders = [
  { key: "created_at", label: "Data" },
  { key: "product_name", label: "Produto" },
  { key: "type", label: "Tipo" },
  { key: "quantity", label: "Qtd", class: "text-right" },
  { key: "balance", label: "Saldo", class: "text-right" },
  { key: "notes", label: "Observação" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function typeLabel(type) {
  const labels = { in: "Entrada", out: "Saída", adjust: "Ajuste" };
  return labels[type] || type;
}

function typeBadge(type) {
  const classes = { in: "badge-success", out: "badge-danger", adjust: "badge-warning" };
  return classes[type] || "badge-gray";
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/stock/movements");
    movements.value = data.data || [];
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
