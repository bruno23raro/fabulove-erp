<script setup>
const props = defineProps({
  title: { type: String, required: true },
  visible: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
  destroyOnClose: { type: Boolean, default: false },
  width: { type: String, default: "600px" },
});
defineEmits(["update:visible", "submit", "cancel", "close"]);
defineOptions({ inheritAttrs: false });

import { ref } from "vue";

const isMounted = ref(true);

const onClose = () => {
  $emit("update:visible", false);
  $emit("close");
};

const onBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    onClose();
  }
};

const onSubmit = (e) => {
  e.preventDefault();
  $emit("submit");
};

const onCancel = () => {
  $emit("cancel");
  $emit("update:visible", false);
};
</script>

<template>
  <Transition name="modal">
    <div
      v-if="visible && isMounted"
      class="modal-backdrop"
      @click.self="onBackdropClick"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-content" :style="{ maxWidth: width }" role="document">
        <header class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button type="button" class="modal-close-btn" @click="onClose" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="18" x2="18" y2="6"></line>
            </svg>
          </button>
        </header>
        <main class="modal-body">
          <slot name="error">
            <div v-if="$slots.error" class="alert alert-danger"><slot name="error" /></div>
          </slot>
          <slot name="default"></slot>
        </main>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer"></slot>
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
  max-width: 600px;
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

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.alert-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
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
