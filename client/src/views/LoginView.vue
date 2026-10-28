<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="login-header">
        <div class="login-logo">💜</div>
        <h1 class="login-title">SIZEN ERP</h1>
        <p class="login-subtitle">Faça login para continuar</p>
      </div>

      <div class="card-body">
        <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

        <form @submit.prevent="handleLogin" novalidate>
          <div class="form-group">
            <label for="email" class="form-label">E-mail</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-control"
              :class="{ 'is-invalid': errors.email }"
              autocomplete="email"
              placeholder="seu@email.com"
              required
            />
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Senha</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.password }"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            <span>{{ loading ? 'Entrando…' : 'Entrar' }}</span>
          </button>

          <div class="forgot-link" style="margin-top: 14px; text-align: center; font-size: 13px;">
            <router-link to="/reset-password">Esqueceu a senha? Recupere aqui</router-link>
          </div>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <h3 style="font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px;">Solicitar link de recuperação</h3>
            <form @submit.prevent="handleForgot" novalidate>
              <input v-model="forgotEmail" type="email" placeholder="seu@email.com" required style="width: 100%; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box;" />
              <button type="submit" :disabled="forgotLoading" style="width: 100%; margin-top: 8px; padding: 10px; border: none; border-radius: 8px; background: #6366f1; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer;">Enviar link</button>
            </form>
            <div v-if="forgotMessage" style="margin-top: 8px; font-size: 13px; color: #16a34a;">{{ forgotMessage }}</div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const loading = ref(false)
const error = ref('')
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

function validate() {
  errors.email = ''
  errors.password = ''
  let ok = true
  if (!form.email) { errors.email = 'E-mail é obrigatório.'; ok = false }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { errors.email = 'E-mail inválido.'; ok = false }
  if (!form.password) { errors.password = 'Senha é obrigatória.'; ok = false }
  return ok
}

const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotMessage = ref('')

async function handleForgot() {
  forgotMessage.value = ''
  if (!forgotEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.value)) {
    forgotMessage.value = 'Informe um e-mail válido.'
    return
  }
  forgotLoading.value = true
  try {
    await axios.post('/api/auth/forgot-password', { email: forgotEmail.value })
    forgotMessage.value = 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'
  } catch (e) {
    forgotMessage.value = 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'
  } finally {
    forgotLoading.value = false
  }
}

async function handleLogin() {
  if (!validate()) return
  loading.value = true
  error.value = ''
  try {
    await auth.login(form.email, form.password)
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (err) {
    error.value = err?.response?.data?.error?.message || 'Erro ao fazer login. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ede9fe 0%, #fce7f3 100%);
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-header {
  padding: 32px 20px 0;
  text-align: center;
}

.login-logo {
  font-size: 40px;
  margin-bottom: 8px;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 10px;
  font-size: 15px;
}
</style>
