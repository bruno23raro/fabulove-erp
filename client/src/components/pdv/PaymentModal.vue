<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('update:visible', false)">
    <div class="modal payment-modal" role="dialog" aria-label="Pagamento">
      <div class="modal-header">
        <span class="modal-title">💰 Pagamento</span>
        <button class="btn btn-ghost" @click="$emit('update:visible', false)" aria-label="Fechar">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="errors" class="alert alert-danger">{{ errors }}</div>

        <!-- Total a receber -->
        <div class="pay-total-display">
          <span class="pay-total-label">Total a receber</span>
          <span class="pay-total-value">{{ formatCurrency(total) }}</span>
        </div>

        <!-- Forma de pagamento -->
        <div class="form-group">
          <label class="form-label">Forma de pagamento *</label>
          <select class="form-control" :value="paymentMethod" @change="$emit('update:payment-method', $event.target.value)">
            <option value="">Selecione…</option>
            <option value="cash">💵 Dinheiro</option>
            <option value="pix">📱 Pix</option>
            <option value="debit_card">💳 Cartão de débito</option>
            <option value="credit_card">💳 Cartão de crédito</option>
            <option value="voucher">🎫 Voucher/vale</option>
            <option value="mixed">🔀 Pagamento dividido</option>
          </select>
        </div>

        <!-- Dinheiro -->
        <template v-if="paymentMethod === 'cash'">
          <div class="form-group">
            <label class="form-label">Valor recebido</label>
            <input class="form-control" type="number" step="0.01" min="0" placeholder="0,00"
              :value="cashReceived" @input="$emit('update:cash-received', $event.target.value)" />
          </div>
          <div v-if="cashChange >= 0" class="cash-change-alert alert alert-success">
            Troco: <strong>{{ formatCurrency(cashChange) }}</strong>
          </div>
        </template>

        <!-- Crédito -->
        <template v-if="paymentMethod === 'credit_card'">
          <div class="form-group">
            <label class="form-label">Parcelas</label>
            <select class="form-control" style="width: 120px" :value="installments"
              @change="$emit('update:installments', $event.target.value)">
              <option v-for="n in 6" :key="n" :value="n">{{ n }}x {{ n === 1 ? 'sem juros' : 'x' }}</option>
            </select>
          </div>
        </template>

        <!-- Pagamento dividido -->
        <template v-if="paymentMethod === 'mixed'">
          <div v-for="(split, i) in paymentSplits" :key="i" class="split-row">
            <select class="form-control split-method" :value="split.method"
              @change="$emit('update:payment-splits', paymentSplits.map((s, j) => j === i ? { ...s, method: $event.target.value } : s))">
              <option value="cash">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="debit_card">Débito</option>
              <option value="credit_card">Crédito</option>
            </select>
            <input class="form-control split-amount" type="number" step="0.01" min="0" placeholder="Valor"
              :value="split.amount" @input="$emit('update:payment-splits', paymentSplits.map((s, j) => j === i ? { ...s, amount: $event.target.value } : s))" />
            <button class="btn btn-ghost btn-sm" @click="$emit('remove-split', i)">✕</button>
          </div>
          <button class="btn btn-ghost btn-sm" @click="$emit('add-split')">+ Adicionar parcela</button>
          <div class="split-summary text-sm text-muted">
            Soma: {{ formatCurrency(splitTotal) }} / {{ formatCurrency(total) }}
            <span :class="splitTotal >= total ? 'text-success' : 'text-danger'">
              {{ splitTotal >= total ? '✓ Completo' : 'Falta ' + formatCurrency(total - splitTotal) }}
            </span>
          </div>
        </template>

        <!-- Observação -->
        <div class="form-group">
          <label class="form-label">Observação</label>
          <input class="form-control" placeholder="Nota fiscal, etc."
            :value="paymentNotes" @input="$emit('update:payment-notes', $event.target.value)" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancelar</button>
        <button class="btn btn-primary" :disabled="!canSubmit" @click="$emit('submit')">
          ✅ Confirmar Pagamento
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, default: '' },
  cashReceived: { type: [Number, String], default: 0 },
  cashChange: { type: Number, default: -1 },
  installments: { type: Number, default: 1 },
  paymentNotes: { type: String, default: '' },
  paymentSplits: { type: Array, default: () => [] },
  splitTotal: { type: Number, default: 0 },
  errors: { type: String, default: '' },
});
defineEmits([
  'update:visible', 'update:payment-method', 'update:cash-received',
  'update:installments', 'update:payment-notes', 'update:payment-splits',
  'add-split', 'remove-split', 'submit', 'cancel',
]);

const canSubmit = computed(() => {
  if (!props.paymentMethod) return false;
  if (props.paymentMethod === 'cash') return (parseFloat(props.cashReceived) || 0) >= props.total;
  if (props.paymentMethod === 'mixed') return props.splitTotal >= props.total;
  return true;
});

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.payment-modal { max-width: 480px; }
.pay-total-display {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: var(--radius); margin-bottom: 16px;
}
.pay-total-label { font-size: 14px; color: var(--color-text-muted); }
.pay-total-value { font-size: 24px; font-weight: 700; color: var(--color-success); }
.split-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.split-method { width: 140px; }
.split-amount { flex: 1; }
.split-summary { margin-top: 8px; }
.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }
</style>
