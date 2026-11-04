<template>
  <div class="search-results card">
    <div v-if="results.length" class="search-results-header">
      <span>{{ results.length }} produto(s)</span>
      <span class="text-muted text-sm">Enter para adicionar</span>
    </div>
    <div v-else-if="!empty" class="search-empty text-muted text-sm" style="padding: 12px; text-align: center">
      Digite para buscar um produto
    </div>
    <div v-else class="search-results-list">
      <div
        v-for="p in results"
        :key="p.id"
        class="search-result-item"
        :class="{ 'low-stock': p.stock <= p.stock_min, 'flash-add': p.id === lastAddedId }"
        @click="$emit('add', p)"
        tabindex="0"
        @keydown.enter.prevent="$emit('add', p)"
      >
        <div class="sr-info">
          <span class="sr-name">{{ p.name }}</span>
          <span v-if="p.sku" class="sr-sku">{{ p.sku }}</span>
          <span v-if="p.barcode" class="sr-barcode">{{ p.barcode }}</span>
        </div>
        <div class="sr-right">
          <span class="sr-price">{{ formatCurrency(p.price) }}</span>
          <span v-if="p.price_shopee" class="sr-shopee">Shopee: {{ formatCurrency(p.price_shopee) }}</span>
          <span class="sr-stock" :class="{ 'stock-ok': p.stock > p.stock_min }">Est: {{ p.stock }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  results: { type: Array, default: () => [] },
  lastAddedId: { type: [String, Number, null], default: null },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Nenhum produto encontrado' },
});
defineEmits(['add']);

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.search-results { margin-top: 8px; max-height: 240px; overflow-y: auto; }
.search-results-header {
  padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between;
}
.search-results-list { max-height: 200px; overflow-y: auto; }
.search-result-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.1s;
}
.search-result-item:hover { background: #f0f0ff; }
.search-result-item:last-child { border-bottom: none; }
.search-result-item.low-stock { background: #fef2f2; }
.search-result-item.flash-add { animation: flashGreen 0.7s ease-out; }
@keyframes flashGreen { 0% { background: #86efac; } 100% { background: transparent; } }
.sr-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sr-name { font-weight: 600; font-size: 14px; }
.sr-sku, .sr-barcode { font-size: 12px; color: var(--color-text-muted); }
.sr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.sr-price { font-weight: 600; font-size: 14px; }
.sr-shopee { font-size: 11px; color: var(--color-success); }
.sr-stock { font-size: 12px; }
.stock-ok { color: var(--color-success); }
</style>
