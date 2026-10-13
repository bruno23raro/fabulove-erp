import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken') || null)

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    const d = data.data
    accessToken.value = d.accessToken
    user.value = d.user
    localStorage.setItem('accessToken', d.accessToken)
    localStorage.setItem('refreshToken', d.refreshToken)
    return d.user
  }

  async function logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout', { refreshToken })
    } catch (_) {
      // ignora erros no logout
    } finally {
      accessToken.value = null
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  async function restoreSession() {
    if (!accessToken.value) return
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.data.user
    } catch (_) {
      accessToken.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  return { user, accessToken, isAuthenticated, login, logout, restoreSession }
})
