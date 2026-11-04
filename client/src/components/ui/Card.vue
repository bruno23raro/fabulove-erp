<script setup>
const props = defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  bordered: { type: Boolean, default: true },
  padded: { type: Boolean, default: true },
});
</script>

<template>
  <div class="card" :class="['card', bordered && 'card-bordered', padded && 'card-padded']">
    <header v-if="title || subtitle" class="card-header">
      <h3 v-if="title" class="card-header-title">{{ title }}</h3>
      <p v-if="subtitle" class="card-header-subtitle">{{ subtitle }}</p>
    </header>
    <main class="card-content">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.card {
  width: 100%;
  background-color: #fff;
  border-radius: 10px;
  overflow: hidden;
}

.card-bordered {
  border: 1px solid #e2e8f0;
}

.card-padded {
  padding: 24px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 24px 16px;
}

.card-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.card-header-subtitle {
  font-size: 14px;
  color: #64748b;
}

.card-content {
  padding: 24px;
}
</style>
