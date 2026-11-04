<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "Selecione…" },
  options: { type: Array, default: () => [] },
  optionLabel: { type: String, default: "name" },
  optionValue: { type: String, default: "id" },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
  size: { type: String, default: "md", validator: (v) => ["sm", "md", "lg"].includes(v) },
});

const model = defineModel();
const emit = defineEmits(["update:modelValue", "change", "blur", "focus"]);

const selectRef = ref(null);
const isFocused = ref(false);

const handleChange = (e) => {
  const value = e.target.value === "" ? null : e.target.value;
  model.value = value;
  emit("change", value);
};

const handleBlur = (e) => {
  isFocused.value = false;
  emit("blur", e);
};

const handleFocus = (e) => {
  isFocused.value = true;
  emit("focus", e);
};

const handleClear = () => {
  model.value = null;
  emit("change", null);
  selectRef.value?.focus();
};
</script>

<template>
  <div class="select-wrapper" :class="{ 'has-error': error, focused: isFocused }">
    <label v-if="label" class="select-label">{{ label }}{{ required ? " *" : "" }}</label>
    <div class="select-field-container" :class="['select-size-' + size]">
      <select
        ref="selectRef"
        :value="modelValue"
        @change="handleChange"
        :disabled="disabled"
        :placeholder="placeholder"
        class="select-field"
        @blur="handleBlur"
        @focus="handleFocus"
        :aria-invalid="!!error"
        :aria-describedby="error ? 'select-error' : undefined"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt[optionValue]" :value="opt[optionValue]">
          {{ opt[optionLabel] }}
        </option>
      </select>
      <button
        v-if="clearable && modelValue !== '' && modelValue !== null && !disabled"
        type="button"
        class="select-clear"
        @click="handleClear"
        aria-label="Limpar seleção"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="18" x2="18" y2="6"></line>
        </svg>
      </button>
    </div>
    <p v-if="error" class="select-error" id="select-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.select-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.select-field-container {
  position: relative;
  display: flex;
  align-items: center;
}

.select-field {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #1e293b;
  background-color: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  appearance: none;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

.select-field:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px #eff6ff;
}

.select-field:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.select-field.has-error {
  border-color: #ef4444;
}

.select-field.has-error:focus {
  box-shadow: 0 0 0 3px #fef2f2;
}

.select-size-sm .select-field {
  padding: 6px 10px;
  font-size: 12px;
  padding-right: 32px;
}
.select-size-md .select-field {
  padding: 10px 12px;
  font-size: 14px;
  padding-right: 40px;
}
.select-size-lg .select-field {
  padding: 12px 16px;
  font-size: 15px;
  padding-right: 44px;
}

.select-clear {
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

.select-clear:hover {
  background: #f1f5f9;
  color: #ef4444;
}

.select-error {
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}

.select-wrapper.focused .select-label {
  color: #6366f1;
}
</style>
