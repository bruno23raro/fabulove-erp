<template>
  <Toolbar
    :title="'Categorias'"
    :actions="[{ key: 'create', label: '+ Nova Categoria', variant: 'primary', onClick: openCreate }]"
    @action-click="
      (action) => {
        if (action.key === 'create') openCreate();
      }
    "
  />

  <Card>
    <DataTable
      :headers="tableHeaders"
      :data="categories"
      :loading="loading"
      emptyMessage="Nenhuma categoria cadastrada"
      @row-click="({ row }) => openEdit(row)"
    >
      <template #cell-description="{ row }">
        <span
          class="text-muted text-sm"
          style="max-width: 300px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >{{ row.description || "—" }}</span
        >
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <Button variant="ghost" size="sm" icon="✏️" @click.stop="openEdit(row)" title="Editar" />
          <Button variant="ghost" size="sm" icon="🗑️" color="danger" @click.stop="confirmDelete(row)" title="Excluir" />
        </div>
      </template>
    </DataTable>
  </Card>

  <FormModal
    :title="editing ? 'Editar Categoria' : 'Nova Categoria'"
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
        <Input v-model="form.name" required placeholder="Ex: Bijuterias" />
      </div>
      <div class="form-group full-width">
        <label class="form-label">Descrição</label>
        <textarea v-model="form.description" rows="3" class="form-control" placeholder="Descrição opcional…" />
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
    :message="`Excluir a categoria <strong>${deleteTarget?.name}</strong>?`"
    :detail="'Só é possível excluir categorias sem produtos vinculados.'"
    :loading="saving"
    @update:visible="deleteTarget = null"
    @confirm="doDelete"
  />
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable, FormModal, DeleteConfirmModal } from "@/components/common";
import { Button, Input, Card } from "@/components/ui";

const categories = ref([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const editing = ref(null);
const deleteTarget = ref(null);
const formError = ref("");
const form = reactive({ name: "", description: "" });

const tableHeaders = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição" },
  { key: "created_at", label: "Criada em" },
  { key: "actions", label: "", width: "100px" },
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/categories");
    categories.value = data.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.name = "";
  form.description = "";
  formError.value = "";
  showModal.value = true;
}

function openEdit(c) {
  editing.value = c;
  form.name = c.name;
  form.description = c.description || "";
  formError.value = "";
  showModal.value = true;
}

async function submitForm() {
  saving.value = true;
  formError.value = "";
  try {
    if (editing.value) {
      await api.put(`/categories/${editing.value.id}`, { name: form.name, description: form.description });
    } else {
      await api.post("/categories", { name: form.name, description: form.description });
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
  if (!deleteTarget.value) return;
  saving.value = true;
  try {
    await api.delete(`/categories/${deleteTarget.value.id}`);
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
.form-grid .full-width {
  grid-column: 1 / -1;
}
</style>
