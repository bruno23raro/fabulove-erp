<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('update:visible', false)">
    <div class="modal" style="max-width: 440px" role="dialog" aria-label="Caixa">
      <div class="modal-header">
        <span class="modal-title">{{ activeRegister ? '🔒 Fechar Caixa' : '🔓 Abrir Caixa' }}</span>
        <button class="btn btn-ghost" @click="$emit('update:visible', false)" aria-label="Fechar">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="errors" class="alert alert-danger">{{ errors }}</div>

        <template v-if="!activeRegister">
          <div class="form-group">
            <label class="form-label">Saldo inicial (R$)</label>
            <input class="form-control" type="number" step="0.01" min="0" placeholder="0,00"
              :value="cashInitialBalance" @input="$emit('update:cash-initial-balance', $event.target.value)" />
          </div>
        </template>

        <template v-else>
          <div class="detail-row"><span>Abertura</span><span>{{ formatDate(activeRegister.opened_at) }}</span></div>
          <div class="detail-row"><span>Saldo inicial</span><span>{{ formatCurrency(activeRegister.opening_balance) }}</span></div>
          <div class="form-group" style="margin-top: 12px">
            <label class="form-label">Saldo final (contagem)</label>
            <input class="form-control" type="number" step="0.01" min="0" placeholder="0,00"
              :value="cashFinalBalance" @input="$emit('update:cash-final-balance', $event.target.value)" />
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancelar</button>
        <button class="btn btn-primary" :disabled="loading" @click="$emit('submit')">
          {{ activeRegister ? 'Fechar Caixa' : 'Abrir Caixa' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  activeRegister: { type: Object, default: null },
  cashInitialBalance: { type: [Number, String], default: 0 },
  cashFinalBalance: { type: [Number, String], default: '' },
  loading: { type: Boolean, default: false },
  errors: { type: String, default: '' },
});
defineEmits(['update:visible', 'update:cash-initial-balance', 'update:cash-final-balance', 'submit', 'cancel']);

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.detail-row:last-child { border-bottom: none; }
</style>
