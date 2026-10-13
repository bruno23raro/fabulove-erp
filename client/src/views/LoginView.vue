<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="login-header">
        <div class="login-logo">💜</div>
        <h1 class="login-title">Fabulove ERP</h1>
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
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

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
