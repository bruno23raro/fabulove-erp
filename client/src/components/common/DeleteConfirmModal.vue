<script setup>
const props = defineProps({
  title: { type: String, default: "Confirmar exclusão" },
  message: { type: String, required: true },
  detail: { type: String, default: "" },
  visible: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
  confirmText: { type: String, default: "Excluir" },
  cancelText: { type: String, default: "Cancelar" },
  variant: { type: String, default: "danger", validator: (v) => ["danger", "warning", "primary"].includes(v) },
});
defineEmits(["update:visible", "confirm", "cancel"]);
defineOptions({ inheritAttrs: false });

const onConfirm = () => {
  $emit("confirm");
  $emit("update:visible", false);
};

const onCancel = () => {
  $emit("cancel");
  $emit("update:visible", false);
};

const onBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    onCancel();
  }
};
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-backdrop" @click.self="onBackdropClick" role="dialog" aria-modal="true">
      <div class="modal-content" role="document">
        <header class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button type="button" class="modal-close-btn" @click="onCancel" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="18" x2="18" y2="6"></line>
            </svg>
          </button>
        </header>
        <main class="modal-body">
          <p>{{ message }}</p>
          <p v-if="detail" class="modal-detail">{{ detail }}</p>
        </main>
        <footer class="modal-footer">
          <button
            type="button"
            :class="['btn', 'btn-' + variant === 'danger' ? 'btn-secondary' : 'btn-' + variant]"
            @click="onCancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button type="button" :class="['btn', 'btn-' + variant]" @click="onConfirm" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ confirmText }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  width: 90%;
  max-width: 480px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  animation: modalIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #64748b;
  font-size: 20px;
  line-height: 1;
  transition: color 0.15s ease;
}

.modal-close-btn:hover {
  color: #ef4444;
}

.modal-body {
  padding: 24px;
}

.modal-detail {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
