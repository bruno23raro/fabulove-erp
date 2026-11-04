<template>
  <Toolbar
    :title="'Contas a Pagar'"
    :filters="[
      {
        key: 'status',
        component: 'Select',
        label: 'Status',
        options: statusOptions,
        modelValue: filterStatus,
        placeholder: 'Todos os status',
        onChange: (v) => {
          filterStatus = v;
          load();
        },
      },
    ]"
    subtitle="Total aberto: {{ formatCurrency(meta?.pending_total || 0) }}"
  />

  <Card>
    <DataTable :headers="tableHeaders" :data="items" :loading="loading" emptyMessage="Nenhuma conta a pagar encontrada">
      <template #cell-due_date="{ row }">
        <span :class="{ 'text-danger': isOverdue(row.due_date, row.status) }">{{ formatDate(row.due_date) }}</span>
      </template>
      <template #cell-status="{ row }">
        <span :class="badgeClass(row.status)" class="badge">{{ statusLabel(row.status) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <Button
            v-if="row.status !== 'paid'"
            variant="ghost"
            size="sm"
            icon="💵"
            @click.stop="openPay(row)"
            title="Registrar pagamento"
          />
        </div>
      </template>
    </DataTable>

    <Pagination
      v-if="!loading && items.length"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :totalItems="offset + items.length"
      :pageSize="limit"
      @change="onPageChange"
    />
  </Card>

  <!-- Pay modal (inline — custom flow) -->
  <div v-if="payTarget" class="modal-overlay" @click.self="payTarget = null">
    <div class="modal" style="max-width: 420px" role="dialog" aria-label="Registrar pagamento">
      <div class="modal-header">
        <span class="modal-title">Registrar Pagamento</span>
        <button class="btn btn-ghost" @click="payTarget = null" aria-label="Fechar">✕</button>
      </div>
      <form @submit.prevent="submitPay">
        <div class="modal-body">
          <p>
            Conta: <strong>{{ formatCurrency(payTarget.amount) }}</strong>
          </p>
          <p class="text-muted text-sm">Fornecedor: {{ payTarget.supplier_name || "—" }}</p>
          <div class="form-group">
            <label class="form-label">Valor do pagamento</label>
            <Input v-model="payForm.amount" type="number" step="0.01" min="0" required />
          </div>
          <div class="form-group">
            <label class="form-label">Forma de pagamento</label>
            <Select v-model="payForm.payment_method" :options="paymentMethods" />
          </div>
          <div v-if="formError" class="alert alert-danger" style="margin-top: 8px">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <Button variant="secondary" @click="payTarget = null">Cancelar</Button>
          <Button variant="primary" :loading="saving" type="submit">
            {{ saving ? "Registrando…" : "Confirmar" }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable, Pagination, Card } from "@/components/common";
import { Button, Input } from "@/components/ui";
import { Select } from "@/components/ui";

const items = ref([]);
const meta = ref({});
const loading = ref(true);
const saving = ref(false);
const filterStatus = ref("");
const limit = 20;
const offset = ref(0);
const currentPage = ref(1);
const payTarget = ref(null);
const formError = ref("");

const payForm = ref({ amount: "", payment_method: "transferencia" });

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Quitada" },
  { value: "partial", label: "Parcial" },
];

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

const tableHeaders = [
  { key: "purchase_number", label: "Nº Compra" },
  { key: "supplier_name", label: "Fornecedor" },
  { key: "description", label: "Descrição" },
  { key: "amount", label: "Valor", class: "text-right" },
  { key: "due_date", label: "Vencimento" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Criada em" },
  { key: "actions", label: "", width: "80px" },
];

const statusLabels = { pending: "Pendente", paid: "Quitada", partial: "Parcial" };
function statusLabel(s) {
  return statusLabels[s] || s;
}
function badgeClass(s) {
  const m = { pending: "badge-warning", paid: "badge-success", partial: "badge-info" };
  return m[s] || "badge-gray";
}
function isOverdue(dueDate, status) {
  if (status === "paid") return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));
}
function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}
function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
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
    const { data } = await api.get("/financial/payable", { params });
    items.value = data.data;
    meta.value = data.meta || {};
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openPay(p) {
  payForm.value = { amount: String(p.amount), payment_method: "transferencia" };
  formError.value = "";
  payTarget.value = p;
}
async function submitPay() {
  if (!payTarget.value) return;
  saving.value = true;
  formError.value = "";
  try {
    const payload = { amount: payForm.value.amount, payment_method: payForm.value.payment_method };
    await api.post(`/financial/payable/${payTarget.value.id}/pay`, payload);
    payTarget.value = null;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error || "Erro ao registrar pagamento.";
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
</style>
