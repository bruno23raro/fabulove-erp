<template>
  <div>
    <div class="fin-tabs" role="tablist" aria-label="Módulos financeiros">
      <router-link to="/financial" class="fin-tab" active-class="fin-tab-active" @click="active='dash'">Resumo</router-link>
      <router-link to="/financial/receivables" class="fin-tab" active-class="fin-tab-active" @click="active='recv'">Contas a Receber</router-link>
      <router-link to="/financial/payable" class="fin-tab" active-class="fin-tab-active" @click="active='pay'">Contas a Pagar</router-link>
      <router-link to="/financial/cash" class="fin-tab" active-class="fin-tab-active" @click="active='cash'">Caixa</router-link>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref('dash')

watch(() => route.path, (path) => {
  if (path.includes('receivables')) active.value = 'recv'
  else if (path.includes('payable')) active.value = 'pay'
  else if (path.includes('cash')) active.value = 'cash'
  else active.value = 'dash'
}, { immediate: true })
</script>

<style scoped>
.fin-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 20px;
}
.fin-tab {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.fin-tab:hover { color: var(--color-text); }
.fin-tab-active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
</style>
