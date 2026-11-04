<template>
  <div class="pdv">
    <!-- ── Barra de caixa ── -->
    <div class="cash-bar" :class="{ 'cash-open': activeRegister }">
      <span v-if="!activeRegister" class="cash-status cash-closed">⚠ Caixa não aberto</span>
      <span v-else class="cash-status cash-active">
        🗃 Caixa #{{ activeRegister.id }} — {{ formatCurrency(activeRegister.opening_balance) }}
        <button class="btn btn-ghost btn-sm cash-close-btn" @click="openCloseRegisterModal">Fechar</button>
      </span>
      <button v-if="!activeRegister" class="btn btn-primary btn-sm" @click="openCloseRegisterModal" style="margin-left: auto">
        🔓 Abrir Caixa
      </button>
      <span class="cash-operator">{{ auth.user?.name }}</span>
    </div>

    <!-- ── Toolbar principal ── -->
    <Toolbar title="PDV — Ponto de Venda" subtitle="Busque produtos e finalize vendas rapidamente" :loading="loadingSearch"
      :actions="[
        { key: 'nova-venda', label: '🆕 Nova Venda', variant: 'primary', icon: '🆕', onClick: startNewSale }
      ]"
      :filters="[
        { key: 'busca', component: 'SearchInput', modelValue: searchQuery, placeholder: 'Buscar produto (nome, SKU, barcode) — F2', onChange: debouncedSearch }
      ]"
      @update:searchModel="searchQuery = $event; debouncedSearch()"
    />

    <!-- ── Grid: busca + carrinho | totais + pagamento ── -->
    <div class="pdv-grid">
      <!-- Painel esquerdo -->
      <div class="pdv-left">
        <!-- Resultados da busca -->
        <SearchResults
          :results="searchResults"
          :last-added-id="lastAddedId"
          :empty="!searchQuery || loadingSearch || toastMessage"
          empty-text="Nenhum produto encontrado"
          @add="addToCart"
        />

        <!-- Toast -->
        <div v-if="toastMessage" :class="['search-toast', toastType]">{{ toastMessage }}</div>

        <!-- Carrinho -->
        <Card>
          <div class="cart-header">
            <span class="cart-title">🛒 Carrinho</span>
            <span v-if="cartItems.length" class="cart-count">{{ cartItems.length }} item(ns)</span>
            <span v-else class="cart-empty-hint">Vazio — busque um produto</span>
          </div>

          <div v-if="cartLoading" class="loading-center"><span class="spinner"></span></div>

          <div v-else-if="!cartItems.length" class="cart-empty">
            <div class="cart-empty-icon">🛒</div>
            <div class="text-muted">Carrinho vazio</div>
          </div>

          <DataTable v-else :headers="cartHeaders" :data="cartItems" :loading="false" emptyMessage="Carrinho vazio">
            <template #cell-product="{ row }">
              <div class="product-cell">
                <div class="font-semibold text-sm">{{ row.product_name }}</div>
                <div class="text-muted text-xs">{{ row.sku || '' }}{{ row.sku && row.barcode ? ' | ' : '' }}{{ row.barcode || '' }}</div>
              </div>
            </template>
            <template #cell-quantity="{ row }">
              <div class="qty-controls">
                <button class="qty-btn" :disabled="row.quantity <= 1" @click="decreaseQty(row)">−</button>
                <input type="number" min="1" :value="row.quantity" class="qty-input"
                  @change="updateQty(row, parseInt($event.target.value) || 1)" />
                <button class="qty-btn" @click="increaseQty(row)">+</button>
              </div>
            </template>
            <template #cell-price="{ row }">
              <span class="text-right">{{ formatCurrency(row.price) }}</span>
            </template>
            <template #cell-subtotal="{ row }">
              <span class="text-right font-semibold">{{ formatCurrency(row.subtotal) }}</span>
            </template>
            <template #cell-actions="{ row }">
              <Button variant="ghost" size="sm" color="danger" icon="✕" @click.stop="removeItem(row)" title="Remover" />
            </template>
          </DataTable>

          <!-- Desconto -->
          <div class="discount-row">
            <label class="form-label" style="margin:0">Desconto:</label>
            <div class="discount-input-group">
              <input v-model="discountValue" type="number" step="0.01" min="0" class="form-control discount-input"
                @input="onDiscountInput" />
              <button class="btn btn-ghost btn-sm discount-type-btn"
                :class="{ 'btn-primary': discountIsPercent }"
                @click="toggleDiscountType">{{ discountIsPercent ? '%' : 'R$' }}</button>
            </div>
          </div>
        </Card>
      </div>

      <!-- Painel direito -->
      <div class="pdv-right">
        <!-- Totais + cliente -->
        <Card class="totals-card">
          <div class="customer-section">
            <label class="form-label">Cliente (opcional)</label>
            <div class="customer-select-row">
              <select v-model="selectedCustomerId" class="form-control customer-select">
                <option value="">Consumidor final</option>
                <option v-for="c in customerList" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <Button variant="ghost" size="sm" icon="👤" @click="openCustomerModal">+ Novo</Button>
            </div>
          </div>

          <div class="totals-table">
            <div class="total-row"><span>Subtotal</span><span>{{ formatCurrency(cartTotals.subtotal) }}</span></div>
            <div v-if="cartTotals.discount > 0" class="total-row discount-row-total">
              <span>Desconto</span><span class="text-danger">− {{ formatCurrency(cartTotals.discount) }}</span>
            </div>
            <div class="total-row total-final">
              <span>Total</span><span class="total-value">{{ formatCurrency(cartTotals.total) }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <Button variant="secondary" :disabled="!canSavePreSale" @click="savePreSale">📋 Pré-venda</Button>
            <Button variant="primary" class="pay-btn" :disabled="!canComplete" @click="openPaymentModal">
              💰 Pagamento (F4)
            </Button>
          </div>

          <div class="shortcuts">
            <span class="shortcut"><kbd>F2</kbd> Buscar</span>
            <span class="shortcut"><kbd>F4</kbd> Pagamento</span>
            <span class="shortcut"><kbd>Esc</kbd> Nova venda</span>
          </div>
        </Card>

        <!-- Pré-vendas salvas -->
        <Card v-if="savedCarts.length" class="saved-carts">
          <div class="saved-carts-header">
            <span>📋 Pré-vendas salvas</span>
            <span class="text-muted text-sm">{{ savedCarts.length }}</span>
          </div>
          <div class="saved-carts-list">
            <div v-for="sc in savedCarts" :key="sc.id" class="saved-cart-item" @click="loadSavedCart(sc)">
              <div class="sc-info">
                <span class="sc-number">{{ sc.operation_number }}</span>
                <span class="text-muted text-sm">{{ sc.customer_name || 'Consumidor' }}</span>
              </div>
              <span class="sc-total">{{ formatCurrency(sc.total) }}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Modal de pagamento -->
    <PaymentModal
      :visible="showPaymentModal"
      :total="cartTotals.total"
      :payment-method="paymentMethod"
      :cash-received="cashReceived"
      :cash-change="cashChange"
      :installments="installments"
      :payment-notes="paymentNotes"
      :payment-splits="paymentSplits"
      :split-total="splitTotal"
      :errors="payError"
      @update:visible="showPaymentModal = $event"
      @update:payment-method="paymentMethod = $event; onPaymentMethodChange()"
      @update:cash-received="cashReceived = $event"
      @update:installments="installments = $event"
      @update:payment-notes="paymentNotes = $event"
      @update:payment-splits="paymentSplits = $event"
      @add-split="addSplit"
      @remove-split="(i) => paymentSplits.splice(i, 1)"
      @submit="submitPayment"
      @cancel="showPaymentModal = false"
    />

    <!-- Modal abrir/fechar caixa -->
    <CashModal
      :visible="showCashModal"
      :active-register="activeRegister"
      :cash-initial-balance="cashInitialBalance"
      :cash-final-balance="cashFinalBalance"
      :loading="cashModalLoading"
      :errors="cashModalError"
      @update:visible="showCashModal = $event"
      @update:cash-initial-balance="cashInitialBalance = $event"
      @update:cash-final-balance="cashFinalBalance = $event"
      @submit="submitCashAction"
      @cancel="showCashModal = false"
    />

    <!-- Modal nova venda (confirmar descarte) -->
    <DeleteConfirmModal
      :visible="showNewSaleConfirm"
      title="🆕 Nova Venda"
      message="Descartar o carrinho atual e iniciar uma nova venda?"
      confirm-text="Descartar e iniciar"
      @update:visible="showNewSaleConfirm = $event"
      @confirm="confirmNewSale"
      @cancel="showNewSaleConfirm = false"
    />

    <!-- Modal criar cliente -->
    <CustomerModal
      :visible="showCustomerModal"
      :new-customer="newCustomer"
      @update:visible="showCustomerModal = $event"
      @update:name="newCustomer.name = $event"
      @update:email="newCustomer.email = $event"
      @update:phone="newCustomer.phone = $event"
      @update:document="newCustomer.document = $event"
      @submit="submitCustomer"
      @cancel="showCustomerModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import api from '@/utils/api.js';
import { Toolbar, DataTable, DeleteConfirmModal } from '@/components/common';
import { Card, Button } from '@/components/ui';
import SearchResults from '@/components/pdv/SearchResults.vue';
import PaymentModal from '@/components/pdv/PaymentModal.vue';
import CashModal from '@/components/pdv/CashModal.vue';
import CustomerModal from '@/components/pdv/CustomerModal.vue';

const auth = useAuthStore();

// ── Estado ─────────────────────────────────────────────────────────────────────
const searchQuery = ref('');
const searchResults = ref([]);
const loadingSearch = ref(false);
const searchTimeout = ref(null);
const cart = ref(null);
const cartItems = ref([]);
const cartLoading = ref(false);
const customerList = ref([]);
const selectedCustomerId = ref('');
const discountValue = ref(0);
const discountIsPercent = ref(false);
const showPaymentModal = ref(false);
const showCashModal = ref(false);
const showNewSaleConfirm = ref(false);
const payError = ref('');
const cashModalError = ref('');
const cashModalLoading = ref(false);
const savedCarts = ref([]);
const searchInput = ref(null);

// Pagamento
const paymentMethod = ref('');
const cashReceived = ref(0);
const installments = ref(1);
const paymentNotes = ref('');
let paymentSplits = [{ method: 'cash', amount: 0 }];

// Caixa
const activeRegister = ref(null);
const cashInitialBalance = ref(0);
const cashFinalBalance = ref(0);

// Barcode auto-add flash
const lastAddedId = ref(null);
const toastMessage = ref('');
const toastType = ref('');
let toastTimer = null;

// ── Totais ─────────────────────────────────────────────────────────────────────
const cartTotals = reactive({ subtotal: 0, discount: 0, total: 0 });

const canComplete = computed(() => cartItems.value.length > 0 && cartTotals.total > 0);
const canSavePreSale = computed(() => cartItems.value.length > 0 && cartTotals.total > 0);
const splitTotal = computed(() => paymentSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0));

// ── Tabelas ────────────────────────────────────────────────────────────────────
const cartHeaders = [
  { key: 'product', label: 'Produto' },
  { key: 'quantity', label: 'Qtd', class: 'text-right' },
  { key: 'price', label: 'Preço', class: 'text-right' },
  { key: 'subtotal', label: 'Subtotal', class: 'text-right' },
  { key: 'actions', label: '', class: 'w-16' },
];

// ── Formatação ─────────────────────────────────────────────────────────────────
function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

// ── Busca de produtos ──────────────────────────────────────────────────────────
function debouncedSearch() {
  clearTimeout(searchTimeout.value);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searchTimeout.value = setTimeout(async () => {
    loadingSearch.value = true;
    try {
      const { data } = await api.get('/pos/products/search', { params: { q: searchQuery.value, limit: 10 } });
      searchResults.value = data.data || [];
    } catch (_) {}
    finally {
      loadingSearch.value = false;
    }
  }, 250);
}

async function exactBarcodeSearch(query) {
  const q = (query || '').trim();
  if (!q || /\s/.test(q)) return null;
  try {
    const { data } = await api.get(`/pos/products/by-barcode/${encodeURIComponent(q)}`);
    return data.data || null;
  } catch (_) {
    return null;
  }
}

function showToast(msg, type = 'error') {
  clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastTimer = setTimeout(() => { toastMessage.value = ''; toastType.value = ''; }, 2500);
}

async function handleSearchEnter() {
  const q = searchQuery.value.trim();
  if (!q) return;

  // Prioridade 1: busca exata por barcode (scanner)
  const product = await exactBarcodeSearch(q);
  if (product) {
    searchResults.value = [];
    searchQuery.value = '';
    clearTimeout(searchTimeout.value);
    showToast(`✓ ${product.name} adicionado`, 'success');
    await addToCart(product);
    return;
  }

  // Prioridade 2: primeiro resultado da busca
  if (searchResults.value.length > 0) {
    addToCart(searchResults.value[0]);
    searchQuery.value = '';
    searchResults.value = [];
    return;
  }

  // Prioridade 3: não encontrado
  showToast('Produto não encontrado', 'error');
}

function focusSearch() {
  searchInput.value?.focus();
}

// ── Carrinho ───────────────────────────────────────────────────────────────────
async function loadOrCreateCart() {
  cartLoading.value = true;
  try {
    const { data } = await api.get('/pos/carts');
    const openCarts = data.data.filter(c => c.status === 'cart');
    if (openCarts.length > 0) {
      await loadCart(openCarts[0].id);
      return;
    }
    await createCart();
  } catch (err) {
    console.error('Erro ao carregar carrinho:', err);
  } finally {
    cartLoading.value = false;
  }
}

async function createCart() {
  try {
    const payload = {};
    if (selectedCustomerId.value) payload.customerId = parseInt(selectedCustomerId.value);
    const { data } = await api.post('/pos/carts', payload);
    cart.value = data.data;
    cartItems.value = data.data.items || [];
    recalcTotals();
  } catch (err) {
    console.error('Erro ao criar carrinho:', err);
  }
}

async function loadCart(id) {
  try {
    const { data } = await api.get(`/pos/carts/${id}`);
    cart.value = data.data;
    cartItems.value = data.data.items || [];
    selectedCustomerId.value = data.data.customer_id || '';
    discountValue.value = data.data.discount || 0;
    recalcTotals();
  } catch (err) {
    alert('Erro ao carregar carrinho: ' + (err?.response?.data?.error?.message || err.message));
  }
}

async function addToCart(product) {
  if (!cart.value) { await createCart(); if (!cart.value) return; }
  try {
    const { data } = await api.post(`/pos/carts/${cart.value.id}/items`, {
      productId: product.id, quantity: 1,
      barcodeScanned: product.barcode || null,
    });
    cart.value = data.data;
    cartItems.value = data.data.items || [];
    discountValue.value = data.data.discount || 0;
    recalcTotals();
    // Flash visual
    lastAddedId.value = product.id;
    setTimeout(() => { lastAddedId.value = null; }, 800);
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao adicionar item');
  }
}

async function updateQty(item, quantity) {
  if (quantity < 1) return;
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/items/${item.id}`, { quantity });
    cartItems.value = data.data.items || [];
    discountValue.value = data.data.discount || 0;
    recalcTotals();
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao atualizar quantidade');
  }
}

function decreaseQty(item) { if (item.quantity > 1) updateQty(item, item.quantity - 1); }
function increaseQty(item) { updateQty(item, item.quantity + 1); }

async function removeItem(item) {
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/items/${item.id}`, { quantity: 0 });
    cartItems.value = data.data.items || [];
    discountValue.value = data.data.discount || 0;
    recalcTotals();
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao remover item');
  }
}

function recalcTotals() {
  const subtotal = cartItems.value.reduce((s, i) => s + (i.subtotal || 0), 0);
  const discountInput = parseFloat(discountValue.value) || 0;
  let discount = discountInput;
  if (discountIsPercent.value && subtotal > 0) {
    discount = Math.min(subtotal, subtotal * (discountInput / 100));
  }
  discount = Math.max(0, discount);
  const total = Math.max(0, subtotal - discount);
  cartTotals.subtotal = subtotal;
  cartTotals.discount = discount;
  cartTotals.total = total;
}

function onDiscountInput() {
  recalcTotals();
  if (cart.value) {
    api.patch(`/pos/carts/${cart.value.id}/discount`, { discount: cartTotals.discount }).catch(() => {});
  }
}

function toggleDiscountType() {
  discountIsPercent.value = !discountIsPercent.value;
  onDiscountInput();
}

// ── Pré-venda ──────────────────────────────────────────────────────────────────
async function savePreSale() {
  if (!cart.value || !canSavePreSale.value) return;
  const customerId = selectedCustomerId.value ? parseInt(selectedCustomerId.value) : null;
  if (!customerId) { alert('Pré-venda requer identificação do cliente.'); return; }
  try {
    const { data } = await api.patch(`/pos/carts/${cart.value.id}/save`, { customerId });
    cart.value = null;
    cartItems.value = [];
    discountValue.value = 0;
    recalcTotals();
    await loadSavedCarts();
    alert(`Pré-venda ${data.data.operation_number} salva com sucesso!`);
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao salvar pré-venda');
  }
}

async function loadSavedCarts() {
  try {
    const { data } = await api.get('/pos/sales/saved', { params: { limit: 10 } });
    savedCarts.value = data.data || [];
  } catch (_) {}
}

async function loadSavedCart(saved) {
  try {
    const { data } = await api.get(`/pos/carts/${saved.id}`);
    cart.value = data.data;
    cartItems.value = data.data.items || [];
    selectedCustomerId.value = data.data.customer_id || '';
    discountValue.value = data.data.discount || 0;
    recalcTotals();
    searchQuery.value = '';
    searchResults.value = [];
  } catch (err) {
    alert('Erro ao recuperar pré-venda: ' + (err?.response?.data?.error?.message || err.message));
  }
}

// ── Pagamento ──────────────────────────────────────────────────────────────────
function openPaymentModal() {
  if (!canComplete.value) return;
  payError.value = '';
  paymentMethod.value = '';
  cashReceived.value = 0;
  installments.value = 1;
  paymentNotes.value = '';
  paymentSplits.length = 0;
  paymentSplits.push({ method: 'cash', amount: 0 });
  showPaymentModal.value = true;
}

function onPaymentMethodChange() {
  payError.value = '';
  if (paymentMethod.value === 'mixed') {
    paymentSplits.length = 0;
    paymentSplits.push({ method: 'cash', amount: 0 });
  }
}

function addSplit() { paymentSplits.push({ method: 'cash', amount: 0 }); }

const cashChange = computed(() => {
  const received = parseFloat(cashReceived.value) || 0;
  const change = received - cartTotals.total;
  return change >= 0 ? change : -1;
});

const canSubmitPayment = computed(() => {
  if (!paymentMethod.value) return false;
  if (paymentMethod.value === 'cash') return (parseFloat(cashReceived.value) || 0) >= cartTotals.total;
  if (paymentMethod.value === 'mixed') return splitTotal.value >= cartTotals.total;
  return true;
});

async function submitPayment() {
  if (!canSubmitPayment.value) return;
  payError.value = '';
  let paymentDetails = { notes: paymentNotes.value };
  if (paymentMethod.value === 'cash') {
    paymentDetails.received = parseFloat(cashReceived.value) || 0;
    paymentDetails.change = cashChange.value;
  } else if (paymentMethod.value === 'credit_card') {
    paymentDetails.installments = parseInt(installments.value) || 1;
  } else if (paymentMethod.value === 'mixed') {
    paymentDetails.splits = paymentSplits.map(s => ({ method: s.method, amount: parseFloat(s.amount) || 0 }));
  }
  try {
    const payload = {
      paymentMethod: paymentMethod.value,
      paymentDetails,
      cashRegisterId: activeRegister.value?.id || null,
    };
    const { data } = await api.post(`/pos/carts/${cart.value.id}/complete`, payload);
    showPaymentModal.value = false;
    cart.value = null;
    cartItems.value = [];
    discountValue.value = 0;
    selectedCustomerId.value = '';
    recalcTotals();
    await loadSavedCarts();
    alert(`✅ Venda ${data.data.operation_number} finalizada com sucesso!`);
  } catch (err) {
    payError.value = err?.response?.data?.error?.message || 'Erro ao finalizar venda';
  }
}

// ── Caixa ──────────────────────────────────────────────────────────────────────
async function loadActiveRegister() {
  try {
    const { data } = await api.get('/pos/cash/register/active');
    activeRegister.value = data.data || null;
  } catch (_) {}
}

function openCloseRegisterModal() {
  cashModalError.value = '';
  cashFinalBalance.value = '';
  showCashModal.value = true;
}

async function submitCashAction() {
  cashModalError.value = '';
  cashModalLoading.value = true;
  try {
    if (!activeRegister.value) {
      // Abrir caixa
      if (!cashInitialBalance.value || cashInitialBalance.value < 0) {
        cashModalError.value = 'Informe um saldo inicial válido.';
        return;
      }
      const { data } = await api.post('/pos/cash/register/open', { initialBalance: parseFloat(cashInitialBalance.value) });
      activeRegister.value = data.data;
      showCashModal.value = false;
      cashInitialBalance.value = 0;
      alert(`Caixa aberto com sucesso! Saldo inicial: ${formatCurrency(data.data.opening_balance)}`);
    } else {
      // Fechar caixa
      if (!cashFinalBalance.value) {
        cashModalError.value = 'Informe o saldo final (contagem).';
        return;
      }
      const { data } = await api.post(`/pos/cash/register/${activeRegister.value.id}/close`, { finalBalance: parseFloat(cashFinalBalance.value) });
      activeRegister.value = null;
      showCashModal.value = false;
      const diff = (parseFloat(cashFinalBalance.value) || 0) - (data.data?.expected_balance || 0);
      alert(`Caixa fechado!\nSaldo esperado: ${formatCurrency(data.data?.expected_balance)}\nSaldo contado: ${formatCurrency(cashFinalBalance.value)}\nDiferença: ${formatCurrency(diff)}`);
    }
    await loadActiveRegister();
  } catch (err) {
    cashModalError.value = err?.response?.data?.error?.message || 'Erro ao manipular caixa';
  } finally {
    cashModalLoading.value = false;
  }
}

// ── Cliente ────────────────────────────────────────────────────────────────────
const showCustomerModal = ref(false);
const newCustomer = reactive({ name: '', email: '', phone: '', document: '' });

async function loadCustomers() {
  try {
    const { data } = await api.get('/customers', { params: { limit: 200 } });
    customerList.value = data.data || [];
  } catch (_) {}
}

function openCustomerModal() {
  newCustomer.name = '';
  newCustomer.email = '';
  newCustomer.phone = '';
  newCustomer.document = '';
  showCustomerModal.value = true;
}

async function submitCustomer() {
  if (!newCustomer.name) { alert('Nome é obrigatório'); return; }
  try {
    const { data } = await api.post('/customers', newCustomer);
    customerList.value.push(data.data);
    selectedCustomerId.value = data.data.id;
    showCustomerModal.value = false;
  } catch (err) {
    alert(err?.response?.data?.error?.message || 'Erro ao criar cliente');
  }
}

// ── Nova venda ─────────────────────────────────────────────────────────────────
function startNewSale() {
  if (cartItems.value.length > 0) {
    showNewSaleConfirm.value = true;
  } else {
    confirmNewSale();
  }
}

async function confirmNewSale() {
  showNewSaleConfirm.value = false;
  cart.value = null;
  cartItems.value = [];
  discountValue.value = 0;
  selectedCustomerId.value = '';
  searchQuery.value = '';
  searchResults.value = [];
  recalcTotals();
  await loadOrCreateCart();
  focusSearch();
}

// ── Atalhos de teclado ─────────────────────────────────────────────────────────
function handleKeydown(e) {
  if (e.key === 'F2') { e.preventDefault(); focusSearch(); return; }
  if (e.key === 'F4') { e.preventDefault(); openPaymentModal(); return; }
  if (e.key === 'Escape') {
    if (showPaymentModal.value || showCashModal.value || showNewSaleConfirm.value) return;
    e.preventDefault();
    startNewSale();
    return;
  }
  if (e.key === 'Enter' && document.activeElement === searchInput.value) {
    e.preventDefault();
    handleSearchEnter();
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadOrCreateCart(), loadCustomers(), loadActiveRegister(), loadSavedCarts()]);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  clearTimeout(searchTimeout.value);
});

watch(discountValue, () => recalcTotals());

watch(selectedCustomerId, async (newVal) => {
  if (cart.value && newVal) {
    try { await api.patch(`/pos/carts/${cart.value.id}`, { customerId: parseInt(newVal) }); }
    catch (_) {}
  }
});
</script>

<style scoped>
/* ── Caixa ── */
.cash-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 16px; border-radius: var(--radius);
  font-size: 13px; background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.cash-closed { color: var(--color-warning); font-weight: 600; }
.cash-active { color: var(--color-success); font-weight: 600; }
.cash-operator { margin-left: auto; color: var(--color-text-muted); font-size: 12px; }
.cash-close-btn { font-size: 12px; padding: 2px 8px; margin-left: 8px; }

/* ── Grid principal ── */
.pdv-grid {
  display: grid; grid-template-columns: 1fr 380px;
  gap: 12px; flex: 1; min-height: 0;
}
.pdv-left, .pdv-right { display: flex; flex-direction: column; gap: 12px; }
.pdv-left { min-height: 0; }

/* ── Toast ── */
.search-toast {
  margin-top: 8px; padding: 8px 12px; border-radius: var(--radius);
  font-size: 13px; font-weight: 500;
}
.search-toast.toast-success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
.search-toast.toast-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

/* ── Carrinho ── */
.cart-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--color-border); font-weight: 600;
}
.cart-title { font-size: 15px; }
.cart-count { font-size: 12px; color: var(--color-text-muted); background: var(--color-border); padding: 2px 8px; border-radius: 99px; }
.cart-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--color-text-muted); padding: 40px; }
.cart-empty-icon { font-size: 48px; opacity: 0.4; }
.product-cell { max-width: 180px; }

.discount-row {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-top: 1px solid var(--color-border); background: #fafafa;
}
.discount-input-group { display: flex; align-items: center; gap: 0; }
.discount-input { width: 100px; border-radius: var(--radius) 0 0 var(--radius); text-align: right; }
.discount-type-btn { border-radius: 0 var(--radius) var(--radius) 0 !important; border-left: none !important; padding: 0 10px; }

/* ── Totais ── */
.customer-select-row { display: flex; gap: 8px; align-items: center; }
.customer-select { flex: 1; }
.totals-table { display: flex; flex-direction: column; gap: 6px; }
.total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.total-final { border-top: 2px solid var(--color-text); margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
.total-value { color: var(--color-primary); }
.action-buttons { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
.pay-btn { background: var(--color-success); color: #fff; font-size: 16px; font-weight: 700; padding: 14px; }
.pay-btn:hover:not(:disabled) { background: #059669; }
.shortcuts { display: flex; gap: 12px; justify-content: center; font-size: 11px; color: var(--color-text-muted); padding-top: 8px; border-top: 1px solid var(--color-border); }
.shortcut kbd { background: var(--color-border); border: 1px solid #d1d5db; border-radius: 3px; padding: 1px 5px; font-family: monospace; font-size: 11px; }

/* ── Pré-vendas salvas ── */
.saved-carts { padding: 12px 16px; }
.saved-carts-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.saved-carts-list { max-height: 140px; overflow-y: auto; }
.saved-cart-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 6px; cursor: pointer; transition: background 0.1s; font-size: 13px; }
.saved-cart-item:hover { background: #f0f0ff; }
.sc-info { display: flex; flex-direction: column; gap: 2px; }
.sc-number { font-weight: 600; }

.text-danger { color: var(--color-danger); }
.text-right { text-align: right; }
.w-16 { width: 16px; }
</style>
