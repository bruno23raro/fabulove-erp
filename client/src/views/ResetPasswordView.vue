<template>
  <section class="auth-wrapper" aria-label="Redefinir senha">
    <div class="auth-card">
      <h1>Redefinir senha</h1>
      <p class="subtitle">Crie uma nova senha para acessar o sistema.</p>

      <form @submit.prevent="handleReset" class="auth-form" novalidate>
        <label for="password">Nova senha</label>
        <input id="password" v-model="password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required />
        <label for="confirm">Confirmar senha</label>
        <input id="confirm" v-model="confirm" type="password" placeholder="Repita a nova senha" autocomplete="new-password" required />

        <div v-if="error" class="error-msg" role="alert">{{ error }}</div>

        <button type="submit" :disabled="loading || !validForm">Salvar nova senha</button>
      </form>

      <div v-if="success" class="success-msg" role="status">
        Senha atualizada com sucesso! Redirecionando para login...
      </div>

      <div class="back-link">
        <router-link to="/login">← Voltar ao login</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirm = ref('');
const error = ref('');
const loading = ref(false);
const success = ref(false);

const token = computed(() => route.query.token || '');

const validForm = computed(() => {
  return (!!token.value) && password.value.length >= 8 && password.value === confirm.value;
});

async function handleReset() {
  error.value = '';
  if (!token.value) {
    error.value = 'Token de recuperação ausente. Acesse pelo link enviado no email.';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres.';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.';
    return;
  }
  loading.value = true;
  try {
    await axios.post('/api/auth/reset-password', {
      token: token.value,
      password: password.value,
    });
    success.value = true;
    setTimeout(() => router.push('/login'), 2500);
  } catch (e) {
    error.value = e.response?.data?.error || 'Não foi possível atualizar a senha. O link pode ter expirado ou já ter sido usado.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f4ff 0%, #e8eaff 100%); padding: 24px; }
.auth-card { background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,.08); padding: 40px 32px; max-width: 420px; width: 100%; }
h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 6px; letter-spacing: -.02em; }
.subtitle { color: #64748b; margin-bottom: 22px; font-size: 14px; }
.auth-form label { display: block; margin-top: 14px; font-weight: 600; color: #334155; font-size: 13px; }
.auth-form input { width: 100%; padding: 12px 14px; margin-top: 6px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 15px; transition: border-color .15s; box-sizing: border-box; }
.auth-form input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.auth-form button { width: 100%; margin-top: 24px; padding: 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; transition: transform .08s ease, box-shadow .15s ease; }
.auth-form button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,.35); }
.auth-form button:disabled { opacity: .5; cursor: not-allowed; }
.error-msg { color: #dc2626; font-size: 13px; margin-top: 8px; }
.success-msg { color: #16a34a; font-size: 14px; margin-top: 14px; font-weight: 600; }
.back-link { margin-top: 20px; text-align: center; font-size: 13px; }
.back-link a { color: #6366f1; text-decoration: none; }
.back-link a:hover { text-decoration: underline; }
</style>
