<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-logo">💜</span>
        <span class="sidebar-brand">Fabulove ERP</span>
      </div>

      <nav class="sidebar-nav" aria-label="Navegação principal">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          active-class="nav-item-active"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" aria-hidden="true">{{ userInitial }}</div>
          <div>
            <div class="user-name">{{ auth.user?.name }}</div>
            <div class="user-role text-muted text-sm">{{ auth.user?.role }}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="handleLogout" title="Sair">⎋</button>
      </div>
    </aside>

    <!-- Overlay mobile -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" aria-hidden="true"></div>

    <!-- Conteúdo principal -->
    <div class="main-content">
      <header class="top-bar">
        <button class="menu-toggle btn btn-ghost" @click="sidebarOpen = !sidebarOpen" aria-label="Abrir menu">
          ☰
        </button>
        <h1 class="page-title">{{ currentPageTitle }}</h1>
      </header>

      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const sidebarOpen = ref(false)

const navItems = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/products',   icon: '📦', label: 'Produtos' },
  { to: '/categories', icon: '🏷️', label: 'Categorias' },
  { to: '/customers',  icon: '👥', label: 'Clientes' },
  { to: '/orders',     icon: '🛒', label: 'Pedidos' },
  { to: '/suppliers',  icon: '🚚', label: 'Fornecedores' },
  { to: '/purchases',  icon: '📋', label: 'Compras' },
  { to: '/stock',      icon: '📦', label: 'Estoque' },
  { to: '/reports',    icon: '📈', label: 'Relatórios' },
  { to: '/config',     icon: '⚙️', label: 'Configurações' },
]

const titles = {
  '/dashboard':  'Dashboard',
  '/products':   'Produtos',
  '/categories': 'Categorias',
  '/customers':  'Clientes',
  '/orders':     'Pedidos',
  '/suppliers':  'Fornecedores',
  '/purchases':  'Compras',
  '/stock':      'Estoque',
  '/reports':    'Relatórios',
  '/config':     'Configurações',
}

const currentPageTitle = computed(() => titles[route.path] || 'Fabulove ERP')
const userInitial = computed(() => auth.user?.name?.charAt(0).toUpperCase() || 'U')

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: #1e1b4b;
  color: #e0e7ff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 200;
  transition: transform 0.25s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
}

.sidebar-logo { font-size: 24px; }
.sidebar-brand { font-size: 16px; font-weight: 700; color: #fff; }

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  color: #c7d2fe;
  transition: background 0.15s, color 0.15s;
  margin-bottom: 2px;
}

.nav-item:hover { background: rgb(255 255 255 / 0.08); color: #fff; }
.nav-item-active { background: var(--color-primary) !important; color: #fff !important; }

.nav-icon { font-size: 16px; width: 20px; text-align: center; }

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgb(255 255 255 / 0.08);
}

.user-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.user-name { font-size: 13px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { color: #a5b4fc; }

/* Main */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  flex-shrink: 0;
}

.menu-toggle { display: none; }
.page-title { font-size: 18px; font-weight: 600; }

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Mobile */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  z-index: 150;
}

.btn-sm { padding: 4px 8px; font-size: 16px; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-100%);
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  .sidebar-overlay { display: block; }
  .menu-toggle { display: inline-flex; }
  .page-content { padding: 16px; }
}
</style>
