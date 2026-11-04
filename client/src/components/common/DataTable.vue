<script setup>
const props = defineProps({
  headers: { type: Array, required: true },
  data: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "Nenhum dado disponível" },
  selectable: { type: Boolean, default: false },
  rowKey: { type: String, default: "id" },
  showIndex: { type: Boolean, default: false },
});
defineEmits(["row-click", "selection-change"]);

import { ref, computed } from "vue";

const selectAll = ref(false);
const rowSelected = ref({});

const toggleSelectAll = () => {
  selectAll.value = !selectAll.value;
  rowSelected.value = selectAll.value ? props.data.reduce((acc, _, i) => ({ ...acc, [i]: true }), {}) : {};
  emitSelectionChange();
};

const toggleRow = (index) => {
  rowSelected.value = { ...rowSelected.value, [index]: !rowSelected.value[index] };
  selectAll.value = props.data.length > 0 && props.data.every((_, i) => rowSelected.value[i]);
  emitSelectionChange();
};

const emitSelectionChange = () => {
  const selected = Object.keys(rowSelected.value)
    .filter((k) => rowSelected.value[k])
    .map((k) => props.data[parseInt(k)]);
  $emit("selection-change", selected);
};

const handleRowClick = (row, index) => {
  $emit("row-click", { row, index });
};

const getSelectedRows = () => {
  return Object.keys(rowSelected.value)
    .filter((k) => rowSelected.value[k])
    .map((k) => props.data[parseInt(k)]);
};
</script>

<template>
  <div class="data-table-wrapper">
    <div v-if="loading" class="data-table-loading">
      <span class="spinner"></span>
      <span>Carregando…</span>
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th v-if="selectable" class="th-select">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" :disabled="loading" />
          </th>
          <th v-if="showIndex" class="th-index">#</th>
          <th v-for="header in headers" :key="header.key" :class="['th-' + header.key, header.class]">
            {{ header.label || header.key }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!data.length" class="empty-row">
          <td :colspan="headers.length + (selectable ? 1 : 0) + (showIndex ? 1 : 0)" class="empty-state">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr
          v-for="(row, index) in data"
          :key="row[rowKey] || index"
          :class="['data-row', { selected: rowSelected.value[index] }]"
          @click="handleRowClick(row, index)"
        >
          <td v-if="selectable" class="td-select">
            <input type="checkbox" :id="`row-${index}`" v-model="rowSelected[index]" :disabled="loading" @click.stop />
            <label :for="`row-${index}`"></label>
          </td>
          <td v-if="showIndex" class="td-index">{{ index + 1 }}</td>
          <td v-for="header in headers" :key="header.key" :class="['td-' + header.key, header.class]">
            <slot :name="`cell-${header.key}`" :row="row" :index="index">
              <component v-if="header.component" :is="header.component" :value="row[header.key]" :row="row" />
              <template v-else>
                <span v-if="row[header.key] !== undefined && row[header.key] !== null">{{ row[header.key] }}</span>
                <span v-else class="text-muted">—</span>
              </template>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.data-table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #64748b;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  background-color: #f8f9fa;
  color: #334155;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr {
  transition: background-color 0.15s ease;
}

.data-table tbody tr:hover {
  background-color: #f8f9fa;
}

.data-table tbody tr.selected {
  background-color: #eff6ff;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.th-select,
.td-select {
  width: 48px;
  text-align: center;
}

.th-index,
.td-index {
  width: 48px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.empty-row td {
  padding: 40px 20px !important;
  text-align: center;
  color: #64748b;
}

.empty-state {
  font-size: 14px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
