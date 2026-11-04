<script setup>
const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  type: { type: String, default: "text" },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
});

const model = defineModel();
const emit = defineEmits(["update:modelValue"]);

const handleInput = (e) => {
  model.value = e.target.value;
};
</script>

<template>
  <div class="input-group">
    <label v-if="label" class="input-label">{{ label }}{{ required ? " *" : "" }}</label>
    <input
      :value="modelValue"
      @input="handleInput"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="input-field"
      :aria-invalid="!!error"
      :aria-describedby="error ? 'input-error' : undefined"
    />
    <p v-if="error" class="input-error" id="input-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.input-field {
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
}

.input-field:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px #eff6ff;
}

.input-field:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
}

.input-field[aria-invalid="true"] {
  border-color: #ef4444;
}

.input-field[aria-invalid="true"]:focus {
  box-shadow: 0 0 0 3px #fef2f2;
}

.input-error {
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}
</style>
