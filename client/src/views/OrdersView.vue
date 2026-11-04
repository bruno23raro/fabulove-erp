<template>
  <div>
    <Toolbar
      :title="'Pedidos'"
      :filters="[
        {
          key: 'status',
          component: 'Select',
          label: 'Status',
          options: statuses,
          modelValue: filterStatus,
          placeholder: 'Todos os status',
          onChange: (v) => {
            filterStatus = v;
            load();
          },
        },
      ]"
      :actions="[{ key: 'create', label: '+ Novo Pedido', variant: 'primary', onClick: openCreate }]"
      @action-click="
        (action) => {
          if (action.key === 'create') openCreate();
        }
      "
    />

    <Card>
      <DataTable
        :headers="tableHeaders"
        :data="orders"
        :loading="loading"
        emptyMessage="Nenhum pedido encontrado"
        @row-click="({ row }) => openDetail(row)"
      >
        <template #cell-status="{ row }">
          <span :class="statusBadge(row.status)" class="badge">{{ statusLabel(row.status) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <Button variant="ghost" size="sm" icon="👁️" @click.stop="openDetail(row)" title="Ver detalhes" />
            <Button
              v-if="row.status === 'pending'"
              variant="ghost"
              size="sm"
              icon="🗑️"
              color="danger"
              @click.stop="confirmDelete(row)"
              title="Excluir"
            />
          </div>
        </template>
      </DataTable>

      <Pagination
        v-if="!loading && orders.length"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="offset + orders.length"
        :pageSize="limit"
        @change="onPageChange"
      />
    </Card>

    <!-- Create order modal (complex, kept inline) -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal" style="max-width: 640px" role="dialog" aria-label="Novo pedido">
        <div class="modal-header">
          <span class="modal-title">Novo Pedido</span>
          <button class="btn btn-ghost" @click="showCreateModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitCreate">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Cliente *</label>
              <Select
                v-model="newOrder.customerId"
                :options="customerSelectOptions"
                placeholder="Selecione um cliente…"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Forma de pagamento</label>
              <Select v-model="newOrder.paymentMethod" :options="paymentMethods" placeholder="Não informado" />
            </div>
            <div class="items-section">
              <div class="items-header">
                <span class="form-label" style="margin: 0">Itens do pedido *</span>
                <Button variant="ghost" size="sm" @click="addItem">+ Adicionar item</Button>
              </div>
              <div v-for="(item, i) in newOrder.items" :key="i" class="item-row">
                <Select
                  v-model="item.productId"
                  :options="productSelectOptions"
                  @update:model-value="fillPrice(item, $event)"
                  required
                />
                <Input v-model="item.quantity" type="number" min="1" class="qty-input" placeholder="Qtd" required />
                <Input
                  v-model="item.price"
                  type="number"
                  step="0.01"
                  min="0"
                  class="price-input"
                  placeholder="Preço"
                  required
                />
                <Button
                  variant="ghost"
                  @click="removeItem(i)"
                  style="color: var(--color-danger)"
                  aria-label="Remover item"
                  >✕</Button
                >
              </div>
              <div v-if="newOrder.items.length" class="order-total">
                Total: <strong>{{ formatCurrency(orderTotal) }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <Button variant="secondary" @click="showCreateModal = false">Cancelar</Button>
            <Button variant="primary" :loading="saving" type="submit">
              {{ saving ? "Salvando…" : "Criar Pedido" }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail modal (complex, kept inline) -->
    <div v-if="detailOrder" class="modal-overlay" @click.self="detailOrder = null">
      <div class="modal" style="max-width: 600px">
        <div class="modal-header">
          <span class="modal-title">Pedido {{ detailOrder.order_number }}</span>
          <button class="btn btn-ghost" @click="detailOrder = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span>Cliente</span><span>{{ detailOrder.customer_name }}</span>
          </div>
          <div class="detail-row">
            <span>Status</span>
            <span
              ><span :class="statusBadge(detailOrder.status)" class="badge">{{
                statusLabel(detailOrder.status)
              }}</span></span
            >
          </div>
          <div class="detail-row">
            <span>Pagamento</span><span>{{ detailOrder.payment_method || "—" }}</span>
          </div>
          <div class="detail-row">
            <span>Total</span><span class="font-semibold">{{ formatCurrency(detailOrder.total) }}</span>
          </div>
          <div class="detail-row">
            <span>Data</span><span>{{ formatDate(detailOrder.created_at) }}</span>
          </div>

          <div v-if="detailItems.length" style="margin-top: 16px">
            <div class="form-label">Itens</div>
            <table style="width: 100%; font-size: 13px; margin-top: 8px">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-right">Qtd</th>
                  <th class="text-right">Preço</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in detailItems" :key="item.id">
                  <td>{{ item.product_name }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">{{ formatCurrency(item.price) }}</td>
                  <td class="text-right">{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="!['canceled', 'delivered'].includes(detailOrder.status)" style="margin-top: 20px">
            <label class="form-label">Alterar status</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px">
              <Button
                v-for="s in nextStatuses(detailOrder.status)"
                :key="s.value"
                variant="ghost"
                @click="changeStatus(detailOrder.id, s.value)"
                :disabled="saving"
                >{{ s.label }}</Button
              >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <Button variant="secondary" @click="detailOrder = null">Fechar</Button>
        </div>
      </div>
    </div>

    <DeleteConfirmModal
      :visible="!!deleteTarget"
      :message="`Excluir o pedido <strong>${deleteTarget?.order_number}</strong>?`"
      :detail="'Apenas pedidos pendentes podem ser excluídos.'"
      :loading="saving"
      @update:visible="deleteTarget = null"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable, DeleteConfirmModal, Pagination } from "@/components/common";
import { Button, Input, Card } from "@/components/ui";
import { Select } from "@/components/ui";

const orders = ref([]);
const loading = ref(true);
const saving = ref(false);
const filterStatus = ref("");
const limit = 20;
const offset = ref(0);
const currentPage = ref(1);
const showCreateModal = ref(false);
const detailOrder = ref(null);
const detailItems = ref([]);
const deleteTarget = ref(null);
const formError = ref("");
const customerOptions = ref([]);
const productOptions = ref([]);

const statuses = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
];

const tableHeaders = [
  { key: "order_number", label: "Número" },
  { key: "customer_name", label: "Cliente" },
  { key: "status", label: "Status" },
  { key: "items_count", label: "Itens", class: "text-right" },
  { key: "total", label: "Total", class: "text-right" },
  { key: "created_at", label: "Data" },
  { key: "actions", label: "", width: "100px" },
];

const statusMap = Object.fromEntries(statuses.map((s) => [s.value, s.label]));
function statusLabel(s) {
  return statusMap[s] || s;
}
function statusBadge(s) {
  const m = {
    pending: "badge-warning",
    confirmed: "badge-info",
    processing: "badge-info",
    shipped: "badge-info",
    delivered: "badge-success",
    canceled: "badge-danger",
    refunded: "badge-gray",
  };
  return m[s] || "badge-gray";
}

function nextStatuses(current) {
  const flow = {
    pending: ["confirmed", "canceled"],
    confirmed: ["processing", "canceled"],
    processing: ["shipped", "canceled"],
    shipped: ["delivered", "canceled"],
  };
  return (flow[current] || []).map((v) => statuses.find((s) => s.value === v)).filter(Boolean);
}

const newOrder = reactive({ customerId: "", paymentMethod: "", items: [] });
const orderTotal = computed(() =>
  newOrder.items.reduce((sum, item) => sum + parseFloat(item.price || 0) * parseInt(item.quantity || 0), 0)
);

const customerSelectOptions = computed(() => customerOptions.value.map((c) => ({ value: c.id, label: c.name })));
const productSelectOptions = computed(() =>
  productOptions.value.map((p) => ({ value: p.id, label: `${p.name} (estoque: ${p.stock})` }))
);
const paymentMethods = [
  { value: "", label: "Não informado" },
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
];

function addItem() {
  newOrder.items.push({ productId: "", quantity: 1, price: "" });
}
function removeItem(i) {
  newOrder.items.splice(i, 1);
}
function fillPrice(item, val) {
  const prod = productOptions.value.find((p) => p.id == val);
  if (prod) item.price = prod.price;
}

function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

function onPageChange({ page }) {
  currentPage.value = page;
  offset.value = (page - 1) * limit;
  load();
}

async function load() {
  loading.value = true;
  try {
    const params = { limit, offset: offset.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await api.get("/orders", { params });
    orders.value = data.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  const [cRes, pRes] = await Promise.all([
    api.get("/customers", { params: { limit: 200 } }),
    api.get("/products", { params: { limit: 200 } }),
  ]).catch(() => [{ data: { data: [] } }, { data: { data: [] } }]);
  customerOptions.value = cRes.data.data;
  productOptions.value = pRes.data.data.filter((p) => p.is_active);
}

function openCreate() {
  newOrder.customerId = "";
  newOrder.paymentMethod = "";
  newOrder.items = [];
  formError.value = "";
  loadOptions();
  showCreateModal.value = true;
}

async function submitCreate() {
  if (!newOrder.customerId) {
    formError.value = "Selecione um cliente.";
    return;
  }
  if (!newOrder.items.length) {
    formError.value = "Adicione ao menos um item.";
    return;
  }
  saving.value = true;
  formError.value = "";
  try {
    const items = newOrder.items.map((i) => ({
      productId: parseInt(i.productId),
      quantity: parseInt(i.quantity),
      price: parseFloat(i.price),
    }));
    await api.post("/orders", {
      customerId: parseInt(newOrder.customerId),
      items,
      paymentMethod: newOrder.paymentMethod || undefined,
    });
    showCreateModal.value = false;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || "Erro ao criar pedido.";
  } finally {
    saving.value = false;
  }
}

async function openDetail(o) {
  detailOrder.value = o;
  detailItems.value = [];
  try {
    const { data } = await api.get(`/orders/${o.id}`);
    detailOrder.value = data.data;
    detailItems.value = data.data.items || [];
  } catch (_) {}
}

async function changeStatus(id, status) {
  saving.value = true;
  try {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    detailOrder.value = { ...detailOrder.value, status: data.data.status };
    load();
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao alterar status.");
  } finally {
    saving.value = false;
  }
}

function confirmDelete(o) {
  deleteTarget.value = o;
}
async function doDelete() {
  saving.value = true;
  try {
    await api.delete(`/orders/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    load();
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao excluir.");
    deleteTarget.value = null;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.row-actions {
  display: flex;
  gap: 4px;
}
.items-section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px;
  margin-top: 8px;
}
.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 80px 100px auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.qty-input {
  width: 80px;
}
.price-input {
  width: 100px;
}
.order-total {
  text-align: right;
  font-size: 14px;
  margin-top: 8px;
  color: var(--color-text-muted);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}
.detail-row:last-child {
  border-bottom: none;
}
</style>
