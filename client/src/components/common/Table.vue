<script setup>
const props = defineProps({
  headers: { type: Array, required: true },
  data: { type: Array, required: true },
  selectable: { type: Boolean, default: false },
  selectAllLabel: { type: String, default: "Selecionar todos" },
  loading: { type: Boolean, default: false },
});
defineEmits(["row-click"]);
</script>

<template>
  <div class="table-wrapper">
    <table v-if="data.length > 0" class="main-table">
      <thead>
        <tr>
          <th v-if="selectable" class="th-select">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
          </th>
          <th v-for="header in headers" :key="header.key">
            {{ header.label || header.key }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="row.id || index" @click="emitRowClick(index)">
          <td v-if="selectable" class="td-select">
            <input type="checkbox" :id="`row-${index}`" v-model="rowSelected[index]" :disabled="loading" />
            <label :for="`row-${index}`"></label>
          </td>
          <td v-for="header in headers" :key="header.key">
            <span v-if="row[header.key] !== undefined">{{ row[header.key] }}</span>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty-state">Nenhum dado disponível</p>
  </div>
</template>

<script setup>
import { ref, computed, emit } from "vue";

const selectAll = ref(false);
const rowSelected = ref({});

const emitRowClick = (index) => {
  emit("row-click", index);
};

const toggleSelectAll = () => {
  selectAll.value = !selectAll.value;
  rowSelected.value = selectAll.value ? data.map((_, i) => ({ [i]: true })) : {};
};
</script>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.main-table {
  width: 100%;
  border-collapse: collapse;
}

.main-table th,
.main-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.main-table th {
  background-color: #f8f9fa;
  color: #334155;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
}

.main-table tbody tr {
  transition: background-color 0.15s ease;
}

.main-table tbody tr:hover {
  background-color: #f8f9fa;
}

.main-table tbody tr:last-child td {
  border-bottom: none;
}

th:first-child,
td:first-child {
  padding-left: 20px;
}

th:last-child,
td:last-child {
  padding-right: 20px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}
</style>
