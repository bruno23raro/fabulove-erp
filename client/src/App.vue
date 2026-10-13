<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()

// Tentar restaurar sessão ao carregar o app
onMounted(() => {
  auth.restoreSession()
})
</script>
