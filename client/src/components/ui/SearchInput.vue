<script setup>
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Buscar…" },
  debounce: { type: Number, default: 300 },
  clearable: { type: Boolean, default: true },
  size: { type: String, default: "md", validator: (v) => ["sm", "md", "lg"].includes(v) },
});
defineEmits(["update:modelValue", "search", "clear"]);

import { ref, watch, onUnmounted } from "vue";

const internalValue = ref(props.modelValue);
let debounceTimer = null;

watch(
  () => props.modelValue,
  (val) => {
    internalValue.value = val;
  },
  { immediate: true }
);

const emitUpdate = (val) => {
  internalValue.value = val;
  $emit("update:modelValue", val);
};

const handleInput = (e) => {
  const val = e.target.value;
  emitUpdate(val);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    $emit("search", val);
  }, props.debounce);
};

const handleClear = () => {
  emitUpdate("");
  $emit("search", "");
  $emit("clear");
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const handleKeydown = (e) => {
  if (e.key === "Escape") {
    handleClear();
  }
};

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="search-input-wrapper" :class="['search-size-' + size]">
    <input
      ref="inputRef"
      v-model="internalValue"
      type="search"
      :placeholder="placeholder"
      class="search-field"
      @input="handleInput"
      @keydown="handleKeydown"
    />
    <button
      v-if="clearable && internalValue"
      type="button"
      class="search-clear"
      @click="handleClear"
      aria-label="Limpar busca"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="18" x2="18" y2="6"></line>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-field {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #1e293b;
  background-color: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  padding-right: 40px;
}

.search-field:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px #eff6ff;
}

.search-size-sm .search-field {
  padding: 6px 10px;
  font-size: 12px;
  padding-right: 32px;
}
.search-size-md .search-field {
  padding: 10px 12px;
  font-size: 14px;
  padding-right: 40px;
}
.search-size-lg .search-field {
  padding: 12px 16px;
  font-size: 15px;
  padding-right: 44px;
}

.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #94a3b8;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover {
  background: #f1f5f9;
  color: #ef4444;
}
</style>
