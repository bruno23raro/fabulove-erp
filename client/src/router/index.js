import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/views/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/ProductsView.vue'),
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/CategoriesView.vue'),
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/CustomersView.vue'),
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/OrdersView.vue'),
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/ConfigView.vue'),
        meta: { role: 'admin' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Flag para garantir que restoreSession rode apenas uma vez
let sessionRestored = false

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // Restaura sessão na primeira navegação (token no localStorage → user preenchido)
  if (!sessionRestored) {
    sessionRestored = true
    await auth.restoreSession()
  }

  if (to.meta.public) {
    // Já logado? Redireciona para o dashboard
    if (auth.isAuthenticated) return next('/dashboard')
    return next()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (to.meta.role && auth.user?.role !== to.meta.role && auth.user?.role !== 'admin') {
    return next('/dashboard')
  }

  next()
})

export default router
