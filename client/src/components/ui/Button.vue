<script setup>
const props = defineProps({
  label: { type: String, required: true },
  variant: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "secondary", "danger", "link"].includes(v),
  },
  size: { type: String, default: "md", validator: (v) => ["sm", "md", "lg"].includes(v) },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  icon: { type: String, default: null },
});
</script>

<template>
  <button
    class="btn"
    :class="['btn-' + variant, 'btn-' + size, disabled && 'disabled', block && 'btn-block']"
    :disabled="disabled"
  >
    <span v-if="icon">{{ icon }} </span>
    <slot></slot>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--btn-padding, 8px 16px);
  font-size: var(--btn-font-size, 14px);
  font-weight: 500;
  border-radius: var(--btn-border-radius, 6px);
  border: var(--btn-border, 1px solid transparent);
  cursor: pointer;
  transition: var(--btn-transition, all 0.2s ease);
}

.btn-primary {
  --btn-padding: 8px 16px;
  --btn-font-size: 14px;
  --btn-border-radius: 6px;
  --btn-background: #6366f1;
  --btn-color: #fff;
  --btn-hover-background: #4f46e5;
}

.btn-primary:hover:not(:disabled) {
  --btn-background: #4f46e5;
}

.btn-secondary {
  --btn-background: #8b5cf6;
  --btn-color: #fff;
  --btn-hover-background: #7c3aed;
}

.btn-secondary:hover:not(:disabled) {
  --btn-background: #7c3aed;
}

.btn-danger {
  --btn-background: #ef4444;
  --btn-color: #fff;
  --btn-hover-background: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  --btn-background: #dc2626;
}

.btn-link {
  --btn-background: transparent;
  --btn-color: #6366f1;
  --btn-border: 1px solid #6366f1;
  --btn-color: #6366f1;
}

.btn-link:hover:not(:disabled) {
  --btn-background: #eff6ff;
}

.btn-sm {
  --btn-padding: 6px 12px;
  --btn-font-size: 12px;
}
.btn-md {
  --btn-padding: 8px 16px;
  --btn-font-size: 14px;
} /* default */
.btn-lg {
  --btn-padding: 10px 20px;
  --btn-font-size: 15px;
}

.btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
