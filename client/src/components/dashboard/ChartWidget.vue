<script setup>
defineProps({
  title: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Array, required: true },
  options: { type: Object, default: {} },
});
defineEmits([]);
</script>

<template>
  <div class="chart-widget">
    <h3 class="chart-widget-title">{{ title }}</h3>
    <div class="chart-container">
      <!-- Placeholder para chart - usaria Chart.js ou vue-chartjs -->
      <canvas ref="chartCanvas" width="400" height="200"></canvas>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
const chartInstance = null;

onMounted(() => {
  // Inicializar chart quando o componente montar
  const canvas = refs.chartCanvas.value;
  if (canvas) {
    // window.chartInstance = new Chart(canvas, {
    //   type: props.type,
    //   data: props.data,
    //   options: props.options
    // })
  }
});
</script>

<style scoped>
.chart-widget {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.chart-widget-title {
  padding: 16px 24px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
}

.chart-container {
  width: 100%;
  height: 200px;
  padding: 20px;
}
</style>
