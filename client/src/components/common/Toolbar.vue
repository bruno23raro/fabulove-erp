<script setup>
const props = defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  actions: { type: Array, default: () => [] },
  filters: { type: Array, default: () => [] },
  showSearch: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Buscar…" },
  searchModel: { type: String, default: "" },
  loading: { type: Boolean, default: false },
});
defineEmits(["update:searchModel", "search", "action-click"]);

import SearchInput from "@/components/ui/SearchInput.vue";

const handleActionClick = (action) => {
  action.onClick?.(action);
  $emit("action-click", action);
};

const handleSearch = (value) => {
  $emit("search", value);
};
</script>

<template>
  <div class="toolbar" :class="{ 'toolbar-has-title': title }">
    <div v-if="title" class="toolbar-title-section">
      <div class="toolbar-title">
        <h2>{{ title }}</h2>
        <p v-if="subtitle" class="toolbar-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="toolbar-content">
      <div v-if="filters.length" class="toolbar-filters">
        <component
          v-for="filter in filters"
          :key="filter.key"
          :is="filter.component || 'Select'"
          :model-value="filter.modelValue"
          :label="filter.label"
          :options="filter.options"
          :placeholder="filter.placeholder"
          :disabled="loading"
          @update:model-value="filter.onChange"
        />
      </div>

      <div v-if="showSearch" class="toolbar-search">
        <SearchInput
          :model-value="searchModel"
          :placeholder="searchPlaceholder"
          :debounce="300"
          @search="handleSearch"
          @update:model-value="$emit('update:searchModel', $event)"
        />
      </div>

      <div class="toolbar-actions">
        <component
          v-for="action in actions"
          :key="action.key"
          :is="action.component || 'Button'"
          :label="action.label"
          :variant="action.variant"
          :size="action.size"
          :icon="action.icon"
          :disabled="action.disabled || loading"
          @click="() => handleActionClick(action)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.toolbar-has-title {
  padding-bottom: 8px;
}

.toolbar-title-section {
  flex-shrink: 0;
}

.toolbar-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.toolbar-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.toolbar-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}

.toolbar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.toolbar-search {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-search {
    max-width: none;
    width: 100%;
  }

  .toolbar-actions {
    justify-content: stretch;
  }

  .toolbar-actions > * {
    flex: 1;
  }
}
</style>
