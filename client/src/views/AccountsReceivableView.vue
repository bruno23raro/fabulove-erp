<template>
  <Toolbar
    :title="'Contas a Receber'"
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
    <DataTable
      :headers="tableHeaders"
      :data="items"
      :loading="loading"
      emptyMessage="Nenhuma conta a receber encontrada"
    >
      <template #cell-status="{ row }">
        <span :class="badgeClass(row.status)" class="badge">{{ statusLabel(row.status) }}</span>
      </template>
      <template #cell-due_date="{ row }">
        <span :class="{ 'text-danger': isOverdue(row.due_date, row.status) }">{{ formatDate(row.due_date) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <Button
            v-if="row.status !== 'paid' && row.status !== 'written_off'"
            variant="ghost"
            size="sm"
            icon="💵"
            @click.stop="openPay(row)"
            title="Registrar pagamento"
          />
          <Button
            v-if="row.status !== 'paid' && row.status !== 'written_off'"
            variant="ghost"
            size="sm"
            icon="🗑️"
            color="danger"
            @click.stop="openWriteOff(row)"
            title="Dar baixa"
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
          <p class="text-muted text-sm">Cliente: {{ payTarget.customer_name || "—" }}</p>
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

  <!-- Write-off modal (inline — custom flow) -->
  <div v-if="writeoffTarget" class="modal-overlay" @click.self="writeoffTarget = null">
    <div class="modal" style="max-width: 420px" role="dialog" aria-label="Dar baixa na conta">
      <div class="modal-header">
        <span class="modal-title">Dar Baixa na Conta</span>
        <button class="btn btn-ghost" @click="writeoffTarget = null" aria-label="Fechar">✕</button>
      </div>
      <form @submit.prevent="submitWriteOff">
        <div class="modal-body">
          <p>
            Confirmar baixa de <strong>{{ formatCurrency(writeoffTarget.amount) }}</strong
            >?
          </p>
          <div class="form-group">
            <label class="form-label">Motivo</label>
            <textarea
              v-model="writeoffForm.reason"
              rows="3"
              class="form-control"
              placeholder="Ex: Inadimplência, disputa…"
              required
            ></textarea>
          </div>
          <div v-if="formError" class="alert alert-danger" style="margin-top: 8px">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <Button variant="secondary" @click="writeoffTarget = null">Cancelar</Button>
          <Button variant="danger" :loading="saving" type="submit">
            {{ saving ? "Processando…" : "Confirmar Baixa" }}
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
const writeoffTarget = ref(null);
const formError = ref("");

const payForm = ref({ amount: "", payment_method: "pix" });
const writeoffForm = ref({ reason: "" });

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Quitada" },
  { value: "partial", label: "Parcial" },
  { value: "written_off", label: "Baixada" },
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
  { key: "order_number", label: "Nº Pedido" },
  { key: "customer_name", label: "Cliente" },
  { key: "amount", label: "Valor", class: "text-right" },
  { key: "due_date", label: "Vencimento" },
  { key: "status", label: "Status" },
  { key: "payment_method", label: "Pagamento" },
  { key: "created_at", label: "Criada em" },
  { key: "actions", label: "", width: "120px" },
];

const statusLabels = { pending: "Pendente", paid: "Quitada", partial: "Parcial", written_off: "Baixada" };
function statusLabel(s) {
  return statusLabels[s] || s;
}
function badgeClass(s) {
  const m = { pending: "badge-warning", paid: "badge-success", partial: "badge-info", written_off: "badge-gray" };
  return m[s] || "badge-gray";
}
function isOverdue(dueDate, status) {
  if (status === "paid" || status === "written_off") return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));
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
    const { data } = await api.get("/financial/receivable", { params });
    items.value = data.data;
    meta.value = data.meta || {};
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openPay(r) {
  payForm.value = { amount: String(r.amount), payment_method: "pix" };
  formError.value = "";
  payTarget.value = r;
}
async function submitPay() {
  if (!payTarget.value) return;
  saving.value = true;
  formError.value = "";
  try {
    const { data } = await api.post(`/financial/receivable/${payTarget.value.id}/pay`, payForm.value);
    payTarget.value = null;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error || "Erro ao registrar pagamento.";
  } finally {
    saving.value = false;
  }
}

function openWriteOff(r) {
  writeoffForm.value = { reason: "" };
  formError.value = "";
  writeoffTarget.value = r;
}
async function submitWriteOff() {
  if (!writeoffTarget.value) return;
  saving.value = true;
  formError.value = "";
  try {
    await api.post(`/financial/receivable/${writeoffTarget.value.id}/writeoff`, writeoffForm.value);
    writeoffTarget.value = null;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error || "Erro ao dar baixa.";
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
