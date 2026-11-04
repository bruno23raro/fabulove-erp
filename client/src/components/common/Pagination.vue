<script setup>
const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, default: 1 },
  totalItems: { type: Number, default: 0 },
  pageSize: { type: Number, default: 20 },
  showPageSizes: { type: Boolean, default: true },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50, 100] },
  loading: { type: Boolean, default: false },
});
defineEmits(["update:currentPage", "update:pageSize", "change"]);

import { computed, ref } from "vue";

const localPageSize = ref(props.pageSize);

const pages = computed(() => {
  const result = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) result.push(i);
  } else {
    result.push(1);
    if (current > 3) result.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      result.push(i);
    }
    if (current < total - 2) result.push("...");
    result.push(total);
  }
  return result;
});

const onPageClick = (page) => {
  if (page === "..." || page === props.currentPage) return;
  $emit("update:currentPage", page);
  $emit("change", { page, pageSize: localPageSize.value });
};

const onPrev = () => {
  if (props.currentPage > 1) {
    $emit("update:currentPage", props.currentPage - 1);
    $emit("change", { page: props.currentPage - 1, pageSize: localPageSize.value });
  }
};

const onNext = () => {
  if (props.currentPage < props.totalPages) {
    $emit("update:currentPage", props.currentPage + 1);
    $emit("change", { page: props.currentPage + 1, pageSize: localPageSize.value });
  }
};

const onPageSizeChange = (e) => {
  const newSize = parseInt(e.target.value);
  localPageSize.value = newSize;
  $emit("update:pageSize", newSize);
  $emit("update:currentPage", 1);
  $emit("change", { page: 1, pageSize: newSize });
};

const startItem = computed(() => (props.currentPage - 1) * localPageSize.value + 1);
const endItem = computed(() => Math.min(props.currentPage * localPageSize.value, props.totalItems));
</script>

<template>
  <div class="pagination-bar" v-if="totalPages > 1">
    <div class="pagination-info">
      <span v-if="totalItems > 0"> Mostrando {{ startItem }} a {{ endItem }} de {{ totalItems }} itens </span>
      <span v-else>Nenhum item</span>
    </div>

    <div class="pagination-controls">
      <select
        v-if="showPageSizes"
        class="pagination-size-select"
        :value="localPageSize"
        @change="onPageSizeChange"
        :disabled="loading"
      >
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} por página</option>
      </select>

      <div class="pagination-buttons">
        <button
          class="btn btn-ghost btn-sm"
          @click="onPrev"
          :disabled="currentPage === 1 || loading"
          aria-label="Página anterior"
        >
          ← Anterior
        </button>

        <button
          v-for="page in pages"
          :key="page"
          :class="[
            'btn',
            'btn-ghost',
            'btn-sm',
            'pagination-page',
            page === currentPage && 'active',
            page === '...' && 'disabled',
          ]"
          @click="onPageClick(page)"
          :disabled="page === '...' || loading"
        >
          {{ page }}
        </button>

        <button
          class="btn btn-ghost btn-sm"
          @click="onNext"
          :disabled="currentPage >= totalPages || loading"
          aria-label="Próxima página"
        >
          Próxima →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
  margin-top: 8px;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-size-select {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  min-width: 140px;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  font-size: 13px;
}

.pagination-page.active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.pagination-page.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
