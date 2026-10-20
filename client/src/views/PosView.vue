<template>
  <div class="pdv">
    <!-- Barra de status do caixa -->
    <div class="cash-bar" :class="{ 'cash-open': activeRegister }">
      <span v-if="!activeRegister" class="cash-status cash-closed">⚠ Caixa não aberto</span>
      <span v-else class="cash-status cash-active">
        🗃 Caixa #{{ activeRegister.id }} — {{ formatCurrency(activeRegister.opening_balance) }}
        <button class="btn btn-ghost btn-sm cash-close-btn" @click="openCloseRegisterModal">Fechar</button>
      </span>
      <button v-if="!activeRegister" class="btn btn-primary btn-sm" @click="openCloseRegisterModal" style="margin-left:auto">
        🔓 Abrir Caixa
      </button>
      <span class="cash-operator">{{ auth.user?.name }}</span>
    </div>

    <div class="pdv-grid">
      <!-- ── Painel esquerdo: busca + carrinho ── -->
      <div class="pdv-left">
        <!-- Busca -->
        <div class="search-panel">
          <div class="search-row">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                class="form-control search-input"
                placeholder="Buscar produto (nome, SKU, código, barcode) — F2"
                @input="debouncedSearch"
                @keydown.enter.prevent="handleSearchEnter"
                aria-label="Buscar produto"
              />
            </div>
            <button class="btn btn-secondary" @click="startNewSale" title="Nova venda (Esc)">
              🆕 Nova
            </button>
            <button class="btn btn-ghost" @click="focusSearch" title="F2">F2</button>
          </div>

          <!-- Toast de feedback -->
          <div v-if="toastMessage" :class="['search-toast', toastType]">
            {{ toastMessage }}
          </div>

          <!-- Resultados da busca -->
          <div v-if="searchResults.length" class="search-results card">
            <div class="search-results-header">
              <span>{{ searchResults.length }} produto(s)</span>
              <span class="text-muted text-sm">Enter para adicionar</span>
            </div>
            <div class="search-results-list">
              <div
                v-for="p in searchResults"
                :key="p.id"
                class="search-result-item"
                :class="{ 'low-stock': p.stock <= p.stock_min, 'flash-add': p.id === lastAddedId }"
                @click="addToCart(p)"
                tabindex="0"
                @keydown.enter.prevent="addToCart(p)"
              >
                <div class="sr-info">
                  <span class="sr-name">{{ p.name }}</span>
                  <span v-if="p.sku" class="sr-sku">{{ p.sku }}</span>
                  <span v-if="p.barcode" class="sr-barcode">{{ p.barcode }}</span>
                </div>
                <div class="sr-right">
                  <span class="sr-price">{{ formatCurrency(p.price) }}</span>
                  <span class="sr-shopee" v-if="p.price_shopee">Shopee: {{ formatCurrency(p.price_shopee) }}</span>
                  <span class="sr-stock" :class="{ 'stock-ok': p.stock > p.stock_min }">
                    Est: {{ p.stock }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="searchQuery && !loadingSearch && !toastMessage" class="text-muted text-sm search-empty">
            Nenhum produto encontrado para "{{ searchQuery }}"
          </div>
        </div>

        <!-- Carrinho -->
        <div class="cart-panel card">
          <div class="cart-header">
            <span class="cart-title">Carrinho</span>
            <span v-if="cartItems.length" class="cart-count">{{ cartItems.length }} item(ns)</span>
          </div>

          <div v-if="cartLoading" class="loading-center"><span class="spinner"></span></div>

          <div v-else-if="!cartItems.length" class="cart-empty">
            <div class="cart-empty-icon">🛒</div>
            <div class="text-muted">Carrinho vazio — busque um produto acima</div>
          </div>

          <div v-else class="cart-items">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-right">Qtd</th>
                  <th class="text-right">Preço</th>
                  <th class="text-right">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in cartItems" :key="item.id">
                  <td class="product-cell">
                    <div class="product-name">{{ item.product_name }}</div>
                    <div class="text-muted text-sm" v-if="item.sku || item.barcode">
                      {{ item.sku || '' }}{{ item.sku && item.barcode ? ' | ' : '' }}{{ item.barcode || '' }}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="qty-controls">
                      <button class="qty-btn" @click="decreaseQty(item)" :disabled="item.quantity <= 1">−</button>
                      <input
                        type="number"
                        min="1"
                        :value="item.quantity"
                        class="qty-input"
                        @change="updateQty(item, parseInt($event.target.value) || 1)"
                      />
                      <button class="qty-btn" @click="increaseQty(item)">+</button>
                    </div>
                  </td>
                  <td class="text-right">{{ formatCurrency(item.price) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(item.subtotal) }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm cart-remove" @click="removeItem(item)" title="Remover">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Desconto -->
            <div class="discount-row">
              <label class="form-label" style="margin:0">Desconto:</label>
              <div class="discount-input-group">
                <input
                  v-model="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control discount-input"
                  @input="onDiscountInput"
                />
                <button
                  class="btn btn-ghost btn-sm discount-type-btn"
                  :class="{ 'btn-primary': discountIsPercent }"
                  @click="toggleDiscountType"
                >
                  {{ discountIsPercent ? '%' : 'R$' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Painel direito: totais + pagamento ── -->
      <div class="pdv-right">
        <div class="totals-card card">
          <!-- Cliente -->
          <div class="customer-section">
            <label class="form-label">Cliente (opcional)</label>
            <div class="customer-select-row">
              <select v-model="selectedCustomerId" class="form-control customer-select">
                <option value="">Consumidor final</option>
                <option v-for="c in customerList" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
              <button class="btn btn-ghost btn-sm" @click="openCustomerModal">+ Novo</button>
            </div>
          </div>

          <!-- Tabela de totais -->
          <div class="totals-table">
            <div class="total-row">
              <span>Subtotal</span>
              <span>{{ formatCurrency(cartTotals.subtotal) }}</span>
            </div>
            <div class="total-row discount-row-total" v-if="cartTotals.discount > 0">
              <span>Desconto</span>
              <span class="text-danger">− {{ formatCurrency(cartTotals.discount) }}</span>
            </div>
            <div class="total-row total-final">
              <span>Total</span>
              <span class="total-value">{{ formatCurrency(cartTotals.total) }}</span>
            </div>
          </div>

          <!-- Botões de ação -->
          <div class="action-buttons">
            <button
              class="btn btn-secondary w-full"
              :disabled="!canSavePreSale"
              @click="savePreSale"
              title="Pré-venda salva (sem deduzir estoque)"
            >
              📋 Pré-venda
            </button>
            <button
              class="btn btn-primary w-full pay-btn"
              :disabled="!canComplete"
              @click="openPaymentModal"
              title="Finalizar venda (F4)"
            >
              💰 Pagamento (F4)
            </button>
          </div>

          <!-- Atalhos -->
          <div class="shortcuts">
            <span class="shortcut"><kbd>F2</kbd> Buscar</span>
            <span class="shortcut"><kbd>F4</kbd> Pagamento</span>
            <span class="shortcut"><kbd>Esc</kbd> Nova venda</span>
          </div>
        </div>

        <!-- Carrinhos abertos recuperáveis -->
        <div v-if="savedCarts.length" class="saved-carts card">
          <div class="saved-carts-header">
            <span>Pré-vendas salvas</span>
            <span class="text-muted text-sm">{{ savedCarts.length }}</span>
          </div>
          <div class="saved-carts-list">
            <div
              v-for="sc in savedCarts"
              :key="sc.id"
              class="saved-cart-item"
              @click="loadSavedCart(sc)"
            >
              <div class="sc-info">
                <span class="sc-number">{{ sc.operation_number }}</span>
                <span class="text-muted text-sm">{{ sc.customer_name || 'Consumidor' }}</span>
              </div>
              <span class="sc-total">{{ formatCurrency(sc.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de pagamento -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal payment-modal" role="dialog" aria-label="Pagamento">
        <div class="modal-header">
          <span class="modal-title">💰 Pagamento</span>
          <button class="btn btn-ghost" @click="showPaymentModal = false" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="payError" class="alert alert-danger">{{ payError }}</div>

          <!-- Total a receber -->
          <div class="pay-total-display">
            <span class="pay-total-label">Total a receber</span>
            <span class="pay-total-value">{{ formatCurrency(cartTotals.total) }}</span>
          </div>

          <!-- Método de pagamento -->
          <div class="form-group">
            <label class="form-label">Forma de pagamento *</label>
            <select v-model="paymentMethod" class="form-control" @change="onPaymentMethodChange">
              <option value="">Selecione…</option>
              <option value="cash">💵 Dinheiro</option>
              <option value="pix">📱 Pix</option>
              <option value="debit_card">💳 Cartão de débito</option>
              <option value="credit_card">💳 Cartão de crédito</option>
              <option value="voucher">🎫 Voucher/vale</option>
              <option value="mixed">🔀 Pagamento dividido</option>
            </select>
          </div>

          <!-- Campos específicos por método -->
          <template v-if="paymentMethod === 'cash'">
            <div class="form-group">
              <label class="form-label">Valor recebido</label>
              <input
                v-model="cashReceived"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                placeholder="0,00"
              />
            </div>
            <div v-if="cashChange >= 0" class="cash-change-alert alert alert-success">
              Troco: <strong>{{ formatCurrency(cashChange) }}</strong>
            </div>
          </template>

          <template v-if="paymentMethod === 'credit_card'">
            <div class="form-group">
              <label class="form-label">Parcelas</label>
              <select v-model="installments" class="form-control" style="width:120px">
                <option value="1">1x sem juros</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
                <option value="5">5x</option>
                <option value="6">6x</option>
              </select>
            </div>
          </template>

          <!-- Split payment -->
          <template v-if="paymentMethod === 'mixed'">
            <div v-for="(split, i) in paymentSplits" :key="i" class="split-row">
              <select v-model="split.method" class="form-control split-method">
                <option value="cash">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debit_card">Débito</option>
                <option value="credit_card">Crédito</option>
              </select>
              <input
                v-model="split.amount"
                type="number"
                step="0.01"
                min="0"
                class="form-control split-amount"
                placeholder="Valor"
              />
              <button class="btn btn-ghost btn-sm" @click="removeSplit(i)">✕</button>
            </div>
            <button class="btn btn-ghost btn-sm" @click="addSplit">+ Adicionar parcela</button>
            <div class="split-summary text-sm text-muted">
              Soma: {{ formatCurrency(splitTotal) }} / {{ formatCurrency(cartTotals.total) }}
              <span :class="splitTotal >= cartTotals.total ? 'text-success' : 'text-danger'">
                {{ splitTotal >= cartTotals.total ? '✓ Completo' : 'Falta ' + formatCurrency(cartTotals.total - splitTotal) }}
              </span>
            </div>
          </template>

          <!-- Observações -->
          <div class="form-group">
            <label class="form-label">Observação</label>
            <input v-model="paymentNotes" class="form-control" placeholder="Nota fiscal, etc." />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPaymentModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            :disabled="!canSubmitPayment"
            @click="submitPayment"
          >
            ✅ Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>

    <!-- Modal abrir/fechar caixa -->
    <div v-if="showCashModal" class="modal-overlay" @click.self="showCashModal = false">
      <div class="modal" role="dialog" aria-label="Caixa">
        <div class="modal-header">
          <span class="modal-title">{{ activeRegister ? '🔒 Fechar Caixa' : '🔓 Abrir Caixa' }}</span>
          <button class="btn btn-ghost" @click="showCashModal = false" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="cashModalError" class="alert alert-danger">{{ cashModalError }}</div>
          <template v-if="!activeRegister">
            <div class="form-group">
              <label class="form-label">Saldo inicial (R$)</label>
              <input v-model="cashInitialBalance" type="number" step="0.01" min="0" class="form-control" placeholder="0,00" />
            </div>
          </template>
          <template v-else>
            <div class="detail-row"><span>Abertura</span><span>{{ formatDate(activeRegister.opened_at) }}</span></div>
            <div class="detail-row"><span>Saldo inicial</span><span>{{ formatCurrency(activeRegister.opening_balance) }}</span></div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Saldo final (contagem)</label>
              <input v-model="cashFinalBalance" type="number" step="0.01" min="0" class="form-control" placeholder="0,00" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCashModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            :disabled="cashModalLoading"
            @click="submitCashAction"
          >
            {{ activeRegister ? 'Fechar Caixa' : 'Abrir Caixa' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal nova venda (recuperar pré-venda) -->
    <div v-if="showNewSaleConfirm" class="modal-overlay" @click.self="showNewSaleConfirm = false">
      <div class="modal" style="max-width:400px" role="dialog" aria-label="Nova venda">
        <div class="modal-header">
          <span class="modal-title">🆕 Nova Venda</span>
          <button class="btn btn-ghost" @click="showNewSaleConfirm = false" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p>Descartar o carrinho atual e iniciar uma nova venda?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNewSaleConfirm = false">Cancelar</button>
          <button class="btn btn-danger" @click="confirmNewSale">Descartar e iniciar</button>
        </div>
      </div>
    </div>

    <!-- Modal criar cliente -->
    <div v-if="showCustomerModal" class="modal-overlay" @click.self="showCustomerModal = false">
      <div class="modal" style="max-width:480px" role="dialog" aria-label="Novo cliente">
        <div class="modal-header">
          <span class="modal-title">👤 Novo Cliente</span>
          <button class="btn btn-ghost" @click="showCustomerModal = false" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nome *</label>
            <input v-model="newCustomer.name" class="form-control" placeholder="Nome do cliente" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="newCustomer.email" class="form-control" type="email" placeholder="email@exemplo.com" />
          </div>
          <div class="form-row" style="grid-template-columns:1fr 1fr;margin-top:8px">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input v-model="newCustomer.phone" class="form-control" placeholder="(00) 00000-0000" />
            </div>
            <div class="form-group">
              <label class="form-label">Documento</label>
              <input v-model="newCustomer.document" class="form-control" placeholder="CPF/CNPJ" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCustomerModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="submitCustomer">Criar Cliente</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import api from '@/utils/api.js'

const auth = useAuthStore()

// ── Estado ─────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const searchResults = ref([])
const loadingSearch = ref(false)
const searchTimeout = ref(null)
const cart = ref(null)
const cartItems = ref([])
const cartLoading = ref(false)
const customerList = ref([])
const selectedCustomerId = ref('')
const discountValue = ref(0)
const discountIsPercent = ref(false)
const showPaymentModal = ref(false)
const showCashModal = ref(false)
const showNewSaleConfirm = ref(false)
const payError = ref('')
const cashModalError = ref('')
const cashModalLoading = ref(false)
const savedCarts = ref([])
const searchInput = ref(null)

// Pagamento
const paymentMethod = ref('')
const cashReceived = ref(0)
const installments = ref(1)
const paymentNotes = ref('')
const paymentSplits = reactive([{ method: 'cash', amount: 0 }])

// Caixa
const activeRegister = ref(null)
const cashInitialBalance = ref(0)
const cashFinalBalance = ref(0)

// Clique duplo
const lastAddTime = ref(0)
const LAST_ADD_MS = 500

// Barcode auto-add flash
const lastAddedId = ref(null)
const toastMessage = ref('')
const toastType = ref('')
let toastTimer = null

// ── Totais ──────────────────────────────────────────────────────────────────
const cartTotals = reactive({ subtotal: 0, discount: 0, total: 0 })

const canComplete = computed(() =>
  cartItems.value.length > 0 && cartTotals.total > 0
)

const canSavePreSale = computed(() =>
  cartItems.value.length > 0 && cartTotals.total > 0
)

const splitTotal = computed(() =>
  paymentSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
)

// ── Formatação ──────────────────────────────────────────────────────────────
function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

// ── Busca de produtos ────────────────────────────────────────────────────────
function debouncedSearch() {
  clearTimeout(searchTimeout.value)
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimeout.value = setTimeout(async () => {
    loadingSearch.value = true
    try {
      const { data } = await api.get('/pos/products/search', {
        params: { q: searchQuery.value, limit: 10 }
      })
      searchResults.value = data.data || []
    } catch (_) {
      // ignora
    } finally {
      loadingSearch.value = false
    }
  }, 250)
}

function selectFirstResult() {
  if (searchResults.value.length > 0) {
    addToCart(searchResults.value[0])
    searchQuery.value = ''
    searchResults.value = []
  }
}

// Tenta busca exata por barcode; se não encontrar, retorna null
async function exactBarcodeSearch(query) {
  const q = (query || '').trim()
  if (!q) return null
  // Scanner gera strings curtas/digitais — se tiver espaço ou pontuação improvável para barcode, ignora
  if (/\s/.test(q)) return null
  try {
    const { data } = await api.get(`/pos/products/by-barcode/${encodeURIComponent(q)}`)
    return data.data || null
  } catch (_) {
    return null
  }
}

// Mostra toast temporário (sucesso ou erro)
function showToast(msg, type = 'error') {
  clearTimeout(toastTimer)
  toastMessage.value = msg
  toastType.value = type
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastType.value = ''
  }, 2500)
}

// Enter no campo de busca: tenta barcode primeiro, depois fallback para resultados
async function handleSearchEnter() {
  const q = searchQuery.value.trim()
  if (!q) return

  // Prioridade 1: busca exata por barcode (scanner)
  const product = await exactBarcodeSearch(q)
  if (product) {
    searchResults.value = []
    searchQuery.value = ''
    clearTimeout(searchTimeout.value)
    showToast(`✓ ${product.name} adicionado`, 'success')
    await addToCart(product)
    return
  }

  // Prioridade 2: se há resultados visíveis, seleciona o primeiro
  if (searchResults.value.length > 0) {
    addToCart(searchResults.value[0])
    searchQuery.value = ''
    searchResults.value = []
    return
  }

  // Prioridade 3: barcode não encontrado — mostra mensagem
  showToast('Produto não encontrado', 'error')
}

function focusSearch() {
  searchInput.value?.focus()
}

// ── Carrinho ─────────────────────────────────────────────────────────────────
async function loadOrCreateCart() {
  cartLoading.value = true
  try {
    const { data } = await api.get('/pos/carts')
    const openCarts = data.data.filter(c => c.status === 'cart')
    if (openCarts.length > 0) {
      await loadCart(openCarts[0].id)
      return
    }
    await createCart()
  } catch (err) {
    console.error('Erro ao carregar carrinho:', err)
  } finally {
    cartLoading.value = false
  }
}

async function createCart() {
  try {
    const payload = {}
    if (selectedCustomerId.value) payload.customerId = parseInt(selectedCustomerId.value)
    const { data } = await api.post('/pos/carts', payload)
    cart.value = data.data
    cartItems.value = data.data.items || []
    recalcTotals()
  } catch (err) {
    console.error('Erro ao criar carrinho:', err)
  }
}

async function loadCart(id) {
  try {
    const { data } = await api.get(`/pos/carts/${id}`)
    cart.value = data.data
    cartItems.value = data.data.items || []
    selectedCustomerId.value = data.data.customer_id || ''
    discountValue.value = data.data.discount || 0
    recalcTotals()
  } catch (err) {
    console.error('Erro ao carregar carrinho:', err)
    alert('Erro ao carregar carrinho: ' + (err?.response?.data?.error?.message || err.message))
  }
}

async function addToCart(product) {
  // Prevenção de clique duplo
  const now = Date.now()
  if (now - lastAddTime.value < LAST_ADD_MS) return
  lastAddTime.value = now

  if (!cart.value) {
    await createCart()
    if (!cart.value) return
  }

  try {
    const { data } = await api.post(`/pos/carts/${cart.value.id}/items`, {
      productId: product.id,
      quantity: 1,
      barcodeScanned: product.barcode || null
    })
    cart.value = data.data
    cartItems.value = data.data.items || []
    discountValue.value = data.data.discount || 0
    recalcTotals()
    // Flash visual no item adicionado
    lastAddedId.value = product.id
    setTimeout(() => { lastAddedId.value = null }, 800)
  } catch (err) {
    const msg = err?.response?.data?.error?.message || 'Erro ao adicionar item'
    alert(msg)
  }
}

async function updateQty(item, quantity) {
  if (quantity < 1) return
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/items/${item.id}`, { quantity })
    cartItems.value = data.data.items || []
    discountValue.value = data.data.discount || 0
    recalcTotals()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao atualizar quantidade')
  }
}

function decreaseQty(item) {
  if (item.quantity > 1) updateQty(item, item.quantity - 1)
}

function increaseQty(item) {
  updateQty(item, item.quantity + 1)
}

async function removeItem(item) {
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/items/${item.id}`, { quantity: 0 })
    cartItems.value = data.data.items || []
    discountValue.value = data.data.discount || 0
    recalcTotals()
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao remover item')
  }
}

function recalcTotals() {
  const subtotal = cartItems.value.reduce((s, i) => s + (i.subtotal || 0), 0)
  const discountInput = parseFloat(discountValue.value) || 0
  let discount = discountInput
  if (discountIsPercent.value && subtotal > 0) {
    discount = Math.min(subtotal, subtotal * (discountInput / 100))
  }
  discount = Math.max(0, discount)
  const total = Math.max(0, subtotal - discount)
  cartTotals.subtotal = subtotal
  cartTotals.discount = discount
  cartTotals.total = total
}

function onDiscountInput() {
  recalcTotals()
  if (cart.value) {
    api.patch(`/pos/carts/${cart.value.id}/discount`, { discount: cartTotals.discount })
      .catch(() => {})
  }
}

function toggleDiscountType() {
  discountIsPercent.value = !discountIsPercent.value
  onDiscountInput()
}

// ── Pré-venda ────────────────────────────────────────────────────────────────
async function savePreSale() {
  if (!cart.value || !canSavePreSale.value) return
  const customerId = selectedCustomerId.value ? parseInt(selectedCustomerId.value) : null
  if (!customerId) {
    alert('Pré-venda requer identificação do cliente.')
    return
  }
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/save`, { customerId })
    cart.value = null
    cartItems.value = []
    discountValue.value = 0
    recalcTotals()
    await loadSavedCarts()
    alert(`Pré-venda ${data.data.operation_number} salva com sucesso!`)
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao salvar pré-venda')
  }
}

async function loadSavedCarts() {
  try {
    const { data } = await api.get('/pos/sales/saved', { params: { limit: 10 } })
    savedCarts.value = data.data || []
  } catch (_) {}
}

async function loadSavedCart(saved) {
  try {
    const { data } = await api.get(`/pos/carts/${saved.id}`)
    cart.value = data.data
    cartItems.value = data.data.items || []
    selectedCustomerId.value = data.data.customer_id || ''
    discountValue.value = data.data.discount || 0
    recalcTotals()
    searchQuery.value = ''
    searchResults.value = []
  } catch (err) {
    alert('Erro ao recuperar pré-venda: ' + (err?.response?.data?.error?.message || err.message))
  }
}

// ── Pagamento ────────────────────────────────────────────────────────────────
function openPaymentModal() {
  if (!canComplete.value) return
  payError.value = ''
  paymentMethod.value = ''
  cashReceived.value = 0
  installments.value = 1
  paymentNotes.value = ''
  paymentSplits.length = 0
  paymentSplits.push({ method: 'cash', amount: 0 })
  showPaymentModal.value = true
}

function onPaymentMethodChange() {
  payError.value = ''
  if (paymentMethod.value === 'mixed') {
    paymentSplits.length = 0
    paymentSplits.push({ method: 'cash', amount: 0 })
  }
}

function addSplit() {
  paymentSplits.push({ method: 'cash', amount: 0 })
}

function removeSplit(i) {
  paymentSplits.splice(i, 1)
  if (paymentSplits.length === 0) addSplit()
}

const cashChange = computed(() => {
  const received = parseFloat(cashReceived.value) || 0
  const change = received - cartTotals.total
  return change >= 0 ? change : -1
})

const canSubmitPayment = computed(() => {
  if (!paymentMethod.value) return false
  if (paymentMethod.value === 'cash') {
    return (parseFloat(cashReceived.value) || 0) >= cartTotals.total
  }
  if (paymentMethod.value === 'mixed') {
    return splitTotal.value >= cartTotals.total
  }
  return true
})

async function submitPayment() {
  if (!canSubmitPayment.value) return
  payError.value = ''

  let paymentDetails = { notes: paymentNotes.value }

  if (paymentMethod.value === 'cash') {
    paymentDetails.received = parseFloat(cashReceived.value) || 0
    paymentDetails.change = cashChange.value
  } else if (paymentMethod.value === 'credit_card') {
    paymentDetails.installments = parseInt(installments.value) || 1
  } else if (paymentMethod.value === 'mixed') {
    paymentDetails.splits = paymentSplits.map(s => ({
      method: s.method,
      amount: parseFloat(s.amount) || 0
    }))
  }

  try {
    const payload = {
      paymentMethod: paymentMethod.value,
      paymentDetails,
      cashRegisterId: activeRegister.value?.id || null
    }
    const { data } = await api.post(`/pos/carts/${cart.value.id}/complete`, payload)
    showPaymentModal.value = false
    cart.value = null
    cartItems.value = []
    discountValue.value = 0
    selectedCustomerId.value = ''
    recalcTotals()
    await loadSavedCarts()
    alert(`✅ Venda ${data.data.operation_number} finalizada com sucesso!`)
  } catch (err) {
    payError.value = err?.response?.data?.error?.message || 'Erro ao finalizar venda'
  }
}

// ── Caixa ────────────────────────────────────────────────────────────────────
async function loadActiveRegister() {
  try {
    const { data } = await api.get('/pos/cash/register/active')
    activeRegister.value = data.data || null
  } catch (_) {}
}

function openCloseRegisterModal() {
  cashModalError.value = ''
  cashFinalBalance.value = ''
  showCashModal.value = true
}

async function submitCashAction() {
  cashModalError.value = ''
  cashModalLoading.value = true
  try {
    if (!activeRegister.value) {
      // Abrir caixa
      if (!cashInitialBalance.value || cashInitialBalance.value < 0) {
        cashModalError.value = 'Informe um saldo inicial válido.'
        return
      }
      const { data } = await api.post('/pos/cash/register/open', {
        initialBalance: parseFloat(cashInitialBalance.value)
      })
      activeRegister.value = data.data
      showCashModal.value = false
      cashInitialBalance.value = 0
      alert(`Caixa aberto com sucesso! Saldo inicial: ${formatCurrency(data.data.opening_balance)}`)
    } else {
      // Fechar caixa
      if (!cashFinalBalance.value) {
        cashModalError.value = 'Informe o saldo final (contagem).'
        return
      }
      const { data } = await api.post(`/pos/cash/register/${activeRegister.value.id}/close`, {
        finalBalance: parseFloat(cashFinalBalance.value)
      })
      activeRegister.value = null
      showCashModal.value = false
      const diff = (parseFloat(cashFinalBalance.value) || 0) - (data.data?.expected_balance || 0)
      alert(`Caixa fechado!\nSaldo esperado: ${formatCurrency(data.data?.expected_balance)}\nSaldo contado: ${formatCurrency(cashFinalBalance.value)}\nDiferença: ${formatCurrency(diff)}`)
    }
    await loadActiveRegister()
  } catch (err) {
    cashModalError.value = err?.response?.data?.error?.message || 'Erro ao manipular caixa'
  } finally {
    cashModalLoading.value = false
  }
}

// ── Cliente ──────────────────────────────────────────────────────────────────
const showCustomerModal = ref(false)
const newCustomer = reactive({ name: '', email: '', phone: '', document: '' })

async function loadCustomers() {
  try {
    const { data } = await api.get('/customers', { params: { limit: 200 } })
    customerList.value = data.data || []
  } catch (_) {}
}

function openCustomerModal() {
  newCustomer.name = ''
  newCustomer.email = ''
  newCustomer.phone = ''
  newCustomer.document = ''
  showCustomerModal.value = true
}

async function submitCustomer() {
  if (!newCustomer.name) { alert('Nome é obrigatório'); return }
  try {
    const { data } = await api.post('/customers', newCustomer)
    customerList.value.push(data.data)
    selectedCustomerId.value = data.data.id
    showCustomerModal.value = false
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao criar cliente')
  }
}

// ── Nova venda ───────────────────────────────────────────────────────────────
function startNewSale() {
  if (cartItems.value.length > 0) {
    showNewSaleConfirm.value = true
  } else {
    confirmNewSale()
  }
}

async function confirmNewSale() {
  showNewSaleConfirm.value = false
  cart.value = null
  cartItems.value = []
  discountValue.value = 0
  selectedCustomerId.value = ''
  searchQuery.value = ''
  searchResults.value = []
  recalcTotals()
  await loadOrCreateCart()
  focusSearch()
}

// ── Atalhos de teclado ───────────────────────────────────────────────────────
function handleKeydown(e) {
  // F2 — foco na busca
  if (e.key === 'F2') {
    e.preventDefault()
    focusSearch()
    return
  }
  // F4 — abrir modal de pagamento
  if (e.key === 'F4') {
    e.preventDefault()
    openPaymentModal()
    return
  }
  // Esc — nova venda (só se não estiver em modal)
  if (e.key === 'Escape') {
    if (showPaymentModal.value || showCashModal.value || showNewSaleConfirm.value) return
    e.preventDefault()
    startNewSale()
    return
  }
  // Enter — tente barcode exato primeiro, depois primeiro resultado da busca
  if (e.key === 'Enter' && document.activeElement === searchInput.value) {
    e.preventDefault()
    handleSearchEnter()
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadOrCreateCart(), loadCustomers(), loadActiveRegister(), loadSavedCarts()])
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(searchTimeout.value)
})

watch(discountValue, () => recalcTotals())
watch(selectedCustomerId, async (newVal) => {
  if (cart.value && newVal) {
    try {
      await api.patch(`/pos/carts/${cart.value.id}`, { customerId: parseInt(newVal) })
    } catch (_) {}
  }
})
</script>

<style scoped>
.pdv {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - 48px);
  gap: 12px;
}

/* Barra de caixa */
.cash-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.cash-closed { color: var(--color-warning); font-weight: 600; }
.cash-active { color: var(--color-success); font-weight: 600; }
.cash-operator { margin-left: auto; color: var(--color-text-muted); font-size: 12px; }
.cash-close-btn { font-size: 12px; padding: 2px 8px; margin-left: 8px; }

/* Grid principal */
.pdv-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.pdv-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.pdv-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Busca */
.search-panel {
  flex-shrink: 0;
}
.search-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  pointer-events: none;
}
.search-input {
  padding-left: 38px;
  font-size: 15px;
  height: 44px;
}
.search-results {
  margin-top: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.search-results-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
}
.search-results-list {
  max-height: 200px;
  overflow-y: auto;
}
.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.1s;
}
.search-result-item:hover { background: #f0f0ff; }
.search-result-item:last-child { border-bottom: none; }
.search-result-item.low-stock { background: #fef2f2; }
.sr-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sr-name { font-weight: 600; font-size: 14px; }
.sr-sku, .sr-barcode { font-size: 12px; color: var(--color-text-muted); }
.sr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.sr-price { font-weight: 600; font-size: 14px; }
.sr-shopee { font-size: 11px; color: var(--color-success); }
.sr-stock { font-size: 12px; }
.stock-ok { color: var(--color-success); }

.search-empty {
  padding: 12px;
  text-align: center;
}

/* Toast de feedback */
.search-toast {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
}
.search-toast.toast-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}
.search-toast.toast-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Flash verde no item adicionado via barcode */
.search-result-item.flash-add {
  animation: flashGreen 0.7s ease-out;
}
@keyframes flashGreen {
  0% { background: #86efac; }
  100% { background: transparent; }
}

/* Carrinho */
.cart-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}
.cart-title { font-size: 15px; }
.cart-count { font-size: 12px; color: var(--color-text-muted); background: var(--color-border); padding: 2px 8px; border-radius: 99px; }
.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-muted);
  padding: 40px;
}
.cart-empty-icon { font-size: 48px; opacity: 0.4; }
.cart-items { flex: 1; overflow-y: auto; padding: 8px 0; }
.product-cell { max-width: 180px; }
.product-name { font-size: 13px; font-weight: 500; }
.qty-controls { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.qty-btn {
  width: 24px; height: 24px; border: 1px solid var(--color-border);
  border-radius: 4px; background: var(--color-surface); cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.qty-btn:disabled { opacity: 0.4; }
.qty-btn:hover:not(:disabled) { background: var(--color-border); }
.qty-input {
  width: 44px; text-align: center; border: 1px solid var(--color-border);
  border-radius: 4px; font-size: 13px; padding: 2px 4px;
}
.cart-remove { color: var(--color-danger); padding: 2px 6px; }

.discount-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background: #fafafa;
}
.discount-input-group { display: flex; align-items: center; gap: 0; }
.discount-input {
  width: 100px; border-radius: var(--radius) 0 0 var(--radius);
  text-align: right;
}
.discount-type-btn {
  border-radius: 0 var(--radius) var(--radius) 0 !important;
  border-left: none !important;
  padding: 0 10px;
}
.discount-row-total { color: var(--color-danger); }

/* Painel direito */
.totals-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.customer-section { }
.customer-select-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.customer-select { flex: 1; }

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}
.total-final {
  border-top: 2px solid var(--color-text);
  margin-top: 8px;
  padding-top: 12px;
  font-size: 18px;
  font-weight: 700;
}
.total-value { color: var(--color-primary); }

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
.w-full { width: 100%; }
.pay-btn {
  background: var(--color-success);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  padding: 14px;
}
.pay-btn:hover:not(:disabled) { background: #059669; }

.shortcuts {
  display: flex;
  gap: 12px;
  justify-content: center;
  font-size: 11px;
  color: var(--color-text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
.shortcut kbd {
  background: var(--color-border);
  border: 1px solid #d1d5db;
  border-radius: 3px;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 11px;
}

/* Pré-vendas salvas */
.saved-carts {
  padding: 12px 16px;
}
.saved-carts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
.saved-carts-list { max-height: 140px; overflow-y: auto; }
.saved-cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 13px;
}
.saved-cart-item:hover { background: #f0f0ff; }
.sc-info { display: flex; flex-direction: column; gap: 2px; }
.sc-number { font-weight: 600; }

/* Modal pagamento */
.payment-modal { max-width: 480px; }
.pay-total-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.pay-total-label { font-size: 14px; color: var(--color-text-muted); }
.pay-total-value { font-size: 24px; font-weight: 700; color: var(--color-success); }

.split-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.split-method { width: 140px; }
.split-amount { flex: 1; }
.split-summary { margin-top: 8px; }

.detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.detail-row:last-child { border-bottom: none; }

.text-danger { color: var(--color-danger); }
.text-success { color: var(--color-success); }
</style>
