<template>
  <div>
    <Toolbar
      :title="'Clientes'"
      :searchModel="search"
      :actions="[{ key: 'create', label: '+ Novo Cliente', variant: 'primary', onClick: openCreate }]"
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
        :data="customers"
        :loading="loading"
        emptyMessage="Nenhum cliente encontrado"
        @row-click="({ row }) => openEdit(row)"
      >
        <template #cell-status="{ row }">
          <Badge :label="row.is_active ? 'Ativo' : 'Inativo'" :variant="row.is_active ? 'success' : 'default'" />
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
        v-if="!loading && customers.length"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="offset + customers.length"
        :pageSize="limit"
        @change="onPageChange"
      />
    </Card>

    <FormModal
      :title="editing ? 'Editar Cliente' : 'Novo Cliente'"
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
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <Input v-model="form.name" required placeholder="Nome do cliente" />
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
          <label class="form-label">CPF / CNPJ</label>
          <Input v-model="form.document" placeholder="000.000.000-00" />
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
            <input type="checkbox" v-model="form.isActive" />
            <span class="form-label" style="margin: 0">Cliente ativo</span>
          </label>
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
      :message="`Excluir o cliente <strong>${deleteTarget?.name}</strong>?`"
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
import { Badge, Button, Input, Card } from "@/components/ui";

const customers = ref([]);
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
const form = reactive({ name: "", email: "", phone: "", document: "", isActive: true });

const tableHeaders = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "document", label: "CPF/CNPJ" },
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
    const { data } = await api.get("/customers", { params });
    customers.value = data.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  Object.assign(form, { name: "", email: "", phone: "", document: "", isActive: true });
  formError.value = "";
  showModal.value = true;
}

function openEdit(c) {
  editing.value = c;
  Object.assign(form, {
    name: c.name,
    email: c.email || "",
    phone: c.phone || "",
    document: c.document || "",
    isActive: c.is_active,
  });
  formError.value = "";
  showModal.value = true;
}

async function submitForm() {
  saving.value = true;
  formError.value = "";
  try {
    const payload = { ...form, email: form.email || undefined, document: form.document || undefined };
    if (editing.value) {
      await api.put(`/customers/${editing.value.id}`, payload);
    } else {
      await api.post("/customers", payload);
    }
    showModal.value = false;
    load();
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

function confirmDelete(c) {
  deleteTarget.value = c;
}

async function doDelete() {
  saving.value = true;
  try {
    await api.delete(`/customers/${deleteTarget.value.id}`);
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
.row-actions {
  display: flex;
  gap: 4px;
}
</style>
