<template>
  <div>
    <Toolbar
      :title="'Compras'"
      :searchModel="search"
      :actions="[{ key: 'create', label: '+ Nova Compra', variant: 'primary', onClick: openCreate }]"
      @update:searchModel="
        search = $event;
        onSearch();
      "
      @action-click="
        (action) => {
          if (action.key === 'create') openCreate();
        }
      "
    />

    <Card>
      <DataTable
        :headers="tableHeaders"
        :data="purchases"
        :loading="loading"
        emptyMessage="Nenhuma compra encontrada"
        @row-click="({ row }) => viewDetails(row)"
      >
        <template #cell-status="{ row }">
          <span :class="statusBadge(row.status)" class="badge">{{ statusLabel(row.status) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <Button variant="ghost" size="sm" icon="👁️" @click.stop="viewDetails(row)" title="Detalhes" />
            <Button
              v-if="row.status !== 'completed' && row.status !== 'cancelled'"
              variant="ghost"
              size="sm"
              icon="✏️"
              @click.stop="openEdit(row)"
              title="Editar"
            />
            <Button
              v-if="row.status !== 'completed'"
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
        v-if="!loading && purchases.length"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="offset + purchases.length"
        :pageSize="limit"
        @change="onPageChange"
      />
    </Card>

    <!-- Create / Edit modal (complex, kept inline) -->
    <div v-if="showFormModal" class="modal-overlay" @click.self="showFormModal = false">
      <div class="modal" style="max-width: 680px" role="dialog">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? "Editar Compra" : "Nova Compra" }}</span>
          <button class="btn btn-ghost" @click="showFormModal = false" aria-label="Fechar">✕</button>
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Fornecedor *</label>
              <Select
                v-model="form.supplierId"
                :options="supplierSelectOptions"
                placeholder="Selecione um fornecedor…"
                required
                :disabled="!!editing"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <Select v-model="form.status" :options="statusOptions" :disabled="!!editing" />
            </div>
            <div class="items-section">
              <div class="items-header">
                <span class="form-label" style="margin: 0">Itens *</span>
                <Button v-if="!editing" variant="ghost" size="sm" @click="addItem">+ Adicionar item</Button>
              </div>
              <div v-for="(item, i) in form.items" :key="i" class="item-row">
                <Select
                  v-model="item.productId"
                  :options="productSelectOptions"
                  @update:model-value="fillCost(item, $event)"
                  required
                />
                <Input
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  class="qty-input"
                  placeholder="Qtd"
                  required
                />
                <Input
                  v-model.number="item.cost"
                  type="number"
                  step="0.01"
                  min="0"
                  class="price-input"
                  placeholder="Preço unit."
                  required
                />
                <Button
                  v-if="!editing"
                  variant="ghost"
                  @click="removeItem(i)"
                  style="color: var(--color-danger)"
                  aria-label="Remover item"
                  >✕</Button
                >
              </div>
              <div class="order-total">
                Total: <strong>{{ formatCurrency(itemsTotal) }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <Button variant="secondary" @click="showFormModal = false">Cancelar</Button>
            <Button variant="primary" :loading="saving" type="submit">
              {{ saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar Compra" }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Details modal (kept inline) -->
    <div v-if="detailPurchase" class="modal-overlay" @click.self="detailPurchase = null">
      <div class="modal" style="max-width: 600px">
        <div class="modal-header">
          <span class="modal-title">Compra #{{ detailPurchase.number || detailPurchase.id }}</span>
          <button class="btn btn-ghost" @click="detailPurchase = null" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span>Fornecedor</span><span>{{ detailPurchase.supplier_name || "—" }}</span>
          </div>
          <div class="detail-row">
            <span>Status</span
            ><span
              ><span :class="statusBadge(detailPurchase.status)" class="badge">{{
                statusLabel(detailPurchase.status)
              }}</span></span
            >
          </div>
          <div class="detail-row">
            <span>Total</span><span class="font-semibold">{{ formatCurrency(detailPurchase.total_amount) }}</span>
          </div>
          <div class="detail-row">
            <span>Data</span><span>{{ formatDate(detailPurchase.created_at) }}</span>
          </div>
          <div v-if="detailItems.length" style="margin-top: 16px">
            <div class="form-label">Itens</div>
            <table style="width: 100%; font-size: 13px; margin-top: 8px">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-right">Qtd</th>
                  <th class="text-right">Preço unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in detailItems" :key="item.id">
                  <td>{{ item.product_name }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">{{ formatCurrency(item.unit_price) }}</td>
                  <td class="text-right">{{ formatCurrency(item.total_price) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <Button variant="secondary" @click="detailPurchase = null">Fechar</Button>
        </div>
      </div>
    </div>

    <DeleteConfirmModal
      :visible="!!deleteTarget"
      :message="`Excluir compra #${deleteTarget?.number || deleteTarget?.id}?`"
      :detail="'Esta ação não pode ser desfeita.'"
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
import { Button, Input, Select, Card } from "@/components/ui";

const purchases = ref([]);
const loading = ref(true);
const saving = ref(false);
const search = ref("");
const limit = 20;
const offset = ref(0);
const currentPage = ref(1);
const showFormModal = ref(false);
const detailPurchase = ref(null);
const detailItems = ref([]);
const deleteTarget = ref(null);
const formError = ref("");
const editing = ref(null);
const supplierOptions = ref([]);
const productOptions = ref([]);

const statusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

const tableHeaders = [
  { key: "number", label: "Nº" },
  { key: "supplier_name", label: "Fornecedor" },
  { key: "created_at", label: "Data" },
  { key: "total_amount", label: "Total", class: "text-right" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", width: "100px" },
];

let searchTimer = null;

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    offset.value = 0;
    currentPage.value = 1;
    load();
  }, 400);
}

function onPageChange({ page }) {
  currentPage.value = page;
  offset.value = (page - 1) * limit;
  load();
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatCurrency(val) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
}

function statusLabel(s) {
  const labels = { pending: "Pendente", approved: "Aprovado", completed: "Concluído", cancelled: "Cancelado" };
  return labels[s] || s || "—";
}

function statusBadge(s) {
  const classes = {
    pending: "badge-warning",
    approved: "badge-success",
    completed: "badge-success",
    cancelled: "badge-danger",
  };
  return classes[s] || "badge-gray";
}

const form = reactive({ supplierId: "", status: "pending", items: [] });

const supplierSelectOptions = computed(() => supplierOptions.value.map((s) => ({ value: s.id, label: s.name })));
const productSelectOptions = computed(() => productOptions.value.map((p) => ({ value: p.id, label: p.name })));

const itemsTotal = computed(() =>
  form.items.reduce((sum, item) => sum + parseFloat(item.cost || 0) * parseInt(item.quantity || 0), 0)
);

function addItem() {
  form.items.push({ productId: "", quantity: 1, cost: "" });
}

function removeItem(i) {
  form.items.splice(i, 1);
}

function fillCost(item) {
  // no default cost fill — user enters manually
}

async function load() {
  loading.value = true;
  try {
    const params = { limit, offset: offset.value };
    if (search.value) params.search = search.value;
    const { data } = await api.get("/purchases", { params });
    purchases.value = data.data || [];
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  const [sRes, pRes] = await Promise.all([
    api.get("/suppliers", { params: { limit: 200 } }),
    api.get("/products", { params: { limit: 200 } }),
  ]).catch(() => [{ data: { data: [] } }, { data: { data: [] } }]);
  supplierOptions.value = sRes.data.data.filter((s) => s.status !== "inactive");
  productOptions.value = pRes.data.data;
}

function openCreate() {
  editing.value = null;
  Object.assign(form, { supplierId: "", status: "pending", items: [] });
  formError.value = "";
  loadOptions();
  showFormModal.value = true;
}

function openEdit(p) {
  editing.value = p;
  form.supplierId = p.supplier_id;
  form.status = p.status;
  form.items = [];
  formError.value = "";
  loadOptions().then(() => {
    showFormModal.value = true;
  });
}

async function submitForm() {
  if (!form.supplierId) {
    formError.value = "Selecione um fornecedor.";
    return;
  }
  if (!form.items.length) {
    formError.value = "Adicione ao menos um item.";
    return;
  }
  saving.value = true;
  formError.value = "";
  try {
    const items = form.items.map((i) => ({
      product_id: parseInt(i.productId),
      quantity: parseInt(i.quantity),
      cost: parseFloat(i.cost),
    }));
    if (editing.value) {
      await api.put("/purchases/" + editing.value.id, {
        supplier_id: parseInt(form.supplierId),
        status: form.status,
        items,
      });
    } else {
      await api.post("/purchases", {
        supplier_id: parseInt(form.supplierId),
        status: form.status,
        items,
      });
    }
    showFormModal.value = false;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function viewDetails(p) {
  detailPurchase.value = p;
  detailItems.value = [];
  try {
    const { data } = await api.get("/purchases/" + p.id);
    detailPurchase.value = data.data;
    detailItems.value = data.data.items || [];
  } catch (_) {}
}

function confirmDelete(p) {
  deleteTarget.value = p;
}

async function doDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;
  try {
    await api.delete("/purchases/" + deleteTarget.value.id);
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
  grid-template-columns: 1fr 80px 110px auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.qty-input {
  width: 80px;
}
.price-input {
  width: 110px;
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
