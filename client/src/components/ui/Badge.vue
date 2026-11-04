<script setup>
const props = defineProps({
  label: { type: String, required: true },
  variant: {
    type: String,
    default: "default",
    validator: (v) => ["default", "success", "warning", "danger", "info", "primary", "secondary"].includes(v),
  },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
  dot: { type: Boolean, default: false },
});
</script>

<template>
  <span :class="['badge', 'badge-' + variant, 'badge-' + size]">
    <span v-if="dot" class="badge-dot"></span>
    {{ label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  border-radius: 9999px;
  white-space: nowrap;
}

.badge-sm {
  padding: 2px 8px;
  font-size: 11px;
}
.badge-md {
  padding: 4px 10px;
  font-size: 12px;
}
.badge-lg {
  padding: 6px 12px;
  font-size: 13px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.badge-default {
  background: #f1f5f9;
  color: #475569;
}
.badge-success {
  background: #dcfce7;
  color: #166534;
}
.badge-warning {
  background: #fef3c7;
  color: #92400e;
}
.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}
.badge-info {
  background: #dbeafe;
  color: #1e40af;
}
.badge-primary {
  background: #e0e7ff;
  color: #3730a3;
}
.badge-secondary {
  background: #f3e8ff;
  color: #6b21a8;
}
</style>
