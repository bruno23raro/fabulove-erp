<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('update:visible', false)">
    <div class="modal" style="max-width: 480px" role="dialog" aria-label="Novo cliente">
      <div class="modal-header">
        <span class="modal-title">👤 Novo Cliente</span>
        <button class="btn btn-ghost" @click="$emit('update:visible', false)" aria-label="Fechar">✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <input class="form-control" placeholder="Nome do cliente"
            :value="newCustomer.name" @input="$emit('update:name', $event.target.value)" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" placeholder="email@exemplo.com"
            :value="newCustomer.email" @input="$emit('update:email', $event.target.value)" />
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px">
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input class="form-control" placeholder="(00) 00000-0000"
              :value="newCustomer.phone" @input="$emit('update:phone', $event.target.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Documento</label>
            <input class="form-control" placeholder="CPF/CNPJ"
              :value="newCustomer.document" @input="$emit('update:document', $event.target.value)" />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancelar</button>
        <button class="btn btn-primary" @click="$emit('submit')">Criar Cliente</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  newCustomer: { type: Object, required: true },
});
defineEmits(['update:visible', 'update:name', 'update:email', 'update:phone', 'update:document', 'submit', 'cancel']);
</script>
