<template>
  <div>
    <Toolbar
      :title="'Fornecedores'"
      :searchModel="search"
      :actions="[{ key: 'create', label: '+ Novo Fornecedor', variant: 'primary', onClick: openCreate }]"
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
        :data="suppliers"
        :loading="loading"
        emptyMessage="Nenhum fornecedor encontrado"
        @row-click="({ row }) => openEdit(row)"
      >
        <template #cell-status="{ row }">
          <span :class="statusClass(row.status)" class="badge">{{ row.status || "pending" }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <Button variant="ghost" size="sm" icon="✏️" @click.stop="openEdit(row)" title="Editar" />
            <Button
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
        v-if="!loading && suppliers.length"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="offset + suppliers.length"
        :pageSize="limit"
        @change="onPageChange"
      />
    </Card>

    <FormModal
      :title="editing ? 'Editar Fornecedor' : 'Novo Fornecedor'"
      :visible="showModal"
      :loading="saving"
      @update:visible="showModal = $event"
      @submit="submitForm"
      @cancel="showModal = false"
    >
      <template #error>
        <div v-if="formError" class="alert alert-danger">{{ formError }}</div>
      </template>

      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Nome *</label>
          <Input v-model="form.name" required placeholder="Razão social" />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <Input v-model="form.email" type="email" placeholder="email@exemplo.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <Input v-model="form.phone" placeholder="(11) 99999-9999" />
        </div>
        <div class="form-group">
          <label class="form-label">Documento (CNPJ/CPF)</label>
          <Input v-model="form.document" placeholder="00.000.000/0000-00" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <Select v-model="form.status" :options="statusOptions" />
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showModal = false">Cancelar</Button>
        <Button variant="primary" :loading="saving" type="submit">
          {{ saving ? "Salvando…" : "Salvar" }}
        </Button>
      </template>
    </FormModal>

    <DeleteConfirmModal
      :visible="!!deleteTarget"
      :message="`Excluir o fornecedor <strong>${deleteTarget?.name}</strong>?`"
      :detail="'Esta ação não pode ser desfeita.'"
      :loading="saving"
      @update:visible="deleteTarget = null"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable, FormModal, DeleteConfirmModal, Pagination } from "@/components/common";
import { Button, Input, Select, Card } from "@/components/ui";

const suppliers = ref([]);
const loading = ref(true);
const saving = ref(false);
const search = ref("");
const limit = 20;
const offset = ref(0);
const currentPage = ref(1);
const editing = ref(null);
const deleteTarget = ref(null);
const formError = ref("");
const showModal = ref(false);
const form = reactive({ name: "", email: "", phone: "", document: "", status: "pending" });

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const tableHeaders = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "document", label: "Documento" },
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

async function load() {
  loading.value = true;
  try {
    const params = { limit, offset: offset.value };
    if (search.value) params.search = search.value;
    const { data } = await api.get("/suppliers", { params });
    suppliers.value = data.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function statusClass(s) {
  const c = { active: "badge-success", inactive: "badge-danger" };
  return c[s] || "badge-gray";
}

function openCreate() {
  editing.value = null;
  Object.assign(form, { name: "", email: "", phone: "", document: "", status: "pending" });
  formError.value = "";
  showModal.value = true;
}

function openEdit(s) {
  editing.value = s;
  Object.assign(form, {
    name: s.name,
    email: s.email || "",
    phone: s.phone || "",
    document: s.document || "",
    status: s.status || "pending",
  });
  formError.value = "";
  showModal.value = true;
}

async function submitForm() {
  saving.value = true;
  formError.value = "";
  try {
    const payload = {
      ...form,
      email: form.email || undefined,
      document: form.document || undefined,
      phone: form.phone || undefined,
    };
    if (editing.value) {
      await api.put("/suppliers/" + editing.value.id, payload);
    } else {
      await api.post("/suppliers", payload);
    }
    showModal.value = false;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

function confirmDelete(s) {
  deleteTarget.value = s;
}

async function doDelete() {
  saving.value = true;
  try {
    await api.delete("/suppliers/" + deleteTarget.value.id);
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
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-grid .full-width {
  grid-column: 1 / -1;
}
.row-actions {
  display: flex;
  gap: 4px;
}
</style>
