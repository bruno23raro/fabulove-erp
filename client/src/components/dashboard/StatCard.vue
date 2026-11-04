<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  suffix: { type: String, default: '' },
  prefix: { type: String, default: '' },
  trend: { type: Object, default: null },
  color: { type: String, default: 'primary' }
})
defineEmits([])
</script>

<template>
  <div class="stat-card" :class="['stat-card', 'stat-card-' + color]">
    <div class="stat-card-value">{{ prefix }}{{ value }}{{ suffix }}</div>
    <div class="stat-card-title">{{ title }}</div>
    <div v-if="trend" class="stat-card-trend">
      <span v-if="trend.change >= 0" class="stat-card-trend-up">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 18l6-6-6-6m12 6l-6 6 6 6" />
        </span>
        <span v-else class="stat-card-trend-down">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6l-6 6 6 6" />
          </span>
        </span>
        <span>{{ trend.change > 0 ? '+' : '' }}{{ trend.change }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 140px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-primary { --stat-color: #6366f1; }
.stat-card-secondary { --stat-color: #8b5cf6; }
.stat-card-success { --stat-color: #10b981; }
.stat-card-danger { --stat-color: #ef4444; }
.stat-card-warning { --stat-color: #f59e0b; }

.stat-card-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--stat-color);
  margin-bottom: 4px;
}

.stat-card-title {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  gap: 4px;
}

.stat-card-trend-up { color: #10b981; }
.stat-card-trend-down { color: #ef4444; }
</style>
