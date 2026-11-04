<template>
  <div class="crm-view">
    <!-- Header with tabs -->
    <div class="crm-header">
      <div class="crm-header-left">
        <h1>CRM</h1>
        <div class="crm-tabs">
          <button :class="{ active: tab === 'leads' }" @click="tab = 'leads'">Leads</button>
          <button :class="{ active: tab === 'deals' }" @click="tab = 'deals'">Negócios</button>
          <button :class="{ active: tab === 'activities' }" @click="tab = 'activities'">Atividades</button>
        </div>
      </div>
      <Button variant="primary" @click="openNewLead">+ Novo Lead</Button>
    </div>

    <!-- Pipeline Stats -->
    <div class="crm-stats">
      <div class="stat-card" v-for="(stat, stage) in pipelineStats.stages" :key="stage">
        <div class="stat-value">{{ stat.count }}</div>
        <div class="stat-label">{{ stageLabels[stage] }}</div>
        <div class="stat-value-small">{{ formatCurrency(stat.total_value) }}</div>
      </div>
    </div>

    <!-- Leads Tab -->
    <template v-if="tab === 'leads'">
      <Toolbar
        :searchModel="search"
        :filters="[
          {
            key: 'status',
            component: 'Select',
            label: 'Status',
            options: leadStatusOptions,
            modelValue: filterStatus,
            placeholder: 'Todos os status',
            onChange: (v) => {
              filterStatus = v;
              fetchLeads();
            },
          },
        ]"
        @update:searchModel="
          search = $event;
          fetchLeads();
        "
      />

      <Card>
        <DataTable :headers="leadHeaders" :data="leads" :loading="false" emptyMessage="Nenhum lead encontrado">
          <template #cell-status="{ row }">
            <span class="badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <Button variant="ghost" size="sm" icon="✏️" @click.stop="editLead(row)" />
              <Button variant="ghost" size="sm" icon="🗑️" color="danger" @click.stop="deleteLead(row)" />
            </div>
          </template>
        </DataTable>
      </Card>

      <FormModal
        :title="editingLead ? 'Editar Lead' : 'Novo Lead'"
        :visible="showLeadModal"
        :loading="saving"
        @update:visible="closeModal"
        @submit="saveLead"
        @cancel="closeModal"
      >
        <template #error>
          <div v-if="leadFormError" class="alert alert-danger">{{ leadFormError }}</div>
        </template>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Nome de Contato *</label>
            <Input v-model="leadForm.contact_name" required placeholder="Nome completo" />
          </div>
          <div class="form-group">
            <label class="form-label">Empresa</label>
            <Input v-model="leadForm.company" placeholder="Empresa" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <Input v-model="leadForm.email" type="email" placeholder="email@exemplo.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <Input v-model="leadForm.phone" placeholder="(11) 99999-9999" />
          </div>
          <div class="form-group">
            <label class="form-label">Valor</label>
            <Input v-model.number="leadForm.value" type="number" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <Select v-model="leadForm.status" :options="leadStatusOptions" />
          </div>
          <div class="form-group">
            <label class="form-label">Fonte</label>
            <Select v-model="leadForm.source" :options="leadSourceOptions" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">Notas</label>
            <textarea v-model="leadForm.notes" rows="3" class="form-control" placeholder="Anotações sobre o lead…" />
          </div>
        </div>

        <template #footer>
          <Button variant="secondary" @click="closeModal">Cancelar</Button>
          <Button variant="primary" :loading="saving" type="submit">
            {{ saving ? "Salvando…" : editingLead ? "Salvar" : "Criar" }}
          </Button>
        </template>
      </FormModal>

      <DeleteConfirmModal
        :visible="!!deleteLeadTarget"
        :message="`Excluir o lead <strong>${deleteLeadTarget?.contact_name}</strong>?`"
        :detail="'Esta ação não pode ser desfeita.'"
        @update:visible="deleteLeadTarget = null"
        @confirm="doDeleteLead"
      />
    </template>

    <!-- Deals Tab -->
    <template v-if="tab === 'deals'">
      <Toolbar
        :searchModel="dealSearch"
        :filters="[
          {
            key: 'stage',
            component: 'Select',
            label: 'Estágio',
            options: dealStageOptions,
            modelValue: filterStage,
            placeholder: 'Todos os estágios',
            onChange: (v) => {
              filterStage = v;
              fetchDeals();
            },
          },
        ]"
        :actions="[{ key: 'create', label: '+ Novo Negócio', variant: 'primary', onClick: openNewDeal }]"
        @update:searchModel="
          dealSearch = $event;
          fetchDeals();
        "
        @action-click="
          (action) => {
            if (action.key === 'create') openNewDeal();
          }
        "
      />

      <Card>
        <DataTable :headers="dealHeaders" :data="deals" :loading="false" emptyMessage="Nenhum negócio encontrado">
          <template #cell-pipeline_stage="{ row }">
            <span class="badge" :class="stageClass(row.pipeline_stage)">{{ stageLabel(row.pipeline_stage) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <Button variant="ghost" size="sm" icon="✏️" @click.stop="editDeal(row)" />
              <Button variant="ghost" size="sm" icon="🗑️" color="danger" @click.stop="deleteDeal(row)" />
            </div>
          </template>
        </DataTable>
      </Card>

      <FormModal
        :title="editingDeal ? 'Editar Negócio' : 'Novo Negócio'"
        :visible="showDealModal"
        :loading="saving"
        @update:visible="closeModal"
        @submit="saveDeal"
        @cancel="closeModal"
      >
        <template #error>
          <div v-if="dealFormError" class="alert alert-danger">{{ dealFormError }}</div>
        </template>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Título *</label>
            <Input v-model="dealForm.title" required placeholder="Título do negócio" />
          </div>
          <div class="form-group">
            <label class="form-label">Lead *</label>
            <Select v-model="dealForm.lead_id" :options="leadSelectOptions" placeholder="Selecione um lead…" required />
          </div>
          <div class="form-group">
            <label class="form-label">Estágio</label>
            <Select v-model="dealForm.pipeline_stage" :options="dealStageOptions" />
          </div>
          <div class="form-group">
            <label class="form-label">Valor esperado</label>
            <Input v-model.number="dealForm.expected_value" type="number" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Probabilidade (%)</label>
            <Input v-model.number="dealForm.probability" type="number" min="0" max="100" />
          </div>
          <div class="form-group">
            <label class="form-label">Data prevista</label>
            <Input v-model="dealForm.close_date" type="date" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">Descrição</label>
            <textarea v-model="dealForm.description" rows="3" class="form-control" placeholder="Detalhes do negócio…" />
          </div>
        </div>

        <template #footer>
          <Button variant="secondary" @click="closeModal">Cancelar</Button>
          <Button variant="primary" :loading="saving" type="submit">
            {{ saving ? "Salvando…" : editingDeal ? "Salvar" : "Criar" }}
          </Button>
        </template>
      </FormModal>

      <DeleteConfirmModal
        :visible="!!deleteDealTarget"
        :message="`Excluir o negócio <strong>${deleteDealTarget?.title}</strong>?`"
        :detail="'Esta ação não pode ser desfeita.'"
        @update:visible="deleteDealTarget = null"
        @confirm="doDeleteDeal"
      />
    </template>

    <!-- Activities Tab -->
    <template v-if="tab === 'activities'">
      <Toolbar
        :filters="[
          {
            key: 'type',
            component: 'Select',
            label: 'Tipo',
            options: activityTypeOptions,
            modelValue: filterType,
            placeholder: 'Todos os tipos',
            onChange: (v) => {
              filterType = v;
              fetchActivities();
            },
          },
        ]"
        :actions="[{ key: 'create', label: '+ Nova Atividade', variant: 'primary', onClick: openNewActivity }]"
        @action-click="
          (action) => {
            if (action.key === 'create') openNewActivity();
          }
        "
      />

      <Card>
        <DataTable
          :headers="activityHeaders"
          :data="activities"
          :loading="false"
          emptyMessage="Nenhuma atividade encontrada"
        >
          <template #cell-type="{ row }">
            <span class="badge">{{ row.type }}</span>
          </template>
          <template #cell-completed_at="{ row }">
            <span>{{ row.completed_at ? "✅" : "⏳" }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <Button
                v-if="!row.completed_at"
                variant="ghost"
                size="sm"
                icon="✓"
                @click.stop="completeActivity(row)"
                title="Marcar como completa"
              />
              <Button
                variant="ghost"
                size="sm"
                icon="🗑️"
                color="danger"
                @click.stop="deleteActivity(row)"
                title="Excluir"
              />
            </div>
          </template>
        </DataTable>
      </Card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/utils/api.js";
import { Toolbar, DataTable, FormModal, DeleteConfirmModal } from "@/components/common";
import { Button, Input, Card } from "@/components/ui";
import { Select } from "@/components/ui";

const tab = ref("leads");
const search = ref("");
const filterStatus = ref("");
const dealSearch = ref("");
const filterStage = ref("");
const filterType = ref("");
const leads = ref([]);
const deals = ref([]);
const activities = ref([]);
const pipelineStats = ref({ stages: {}, total_count: 0, total_value: 0 });
const saving = ref(false);
const leadFormError = ref("");
const dealFormError = ref("");
const deleteLeadTarget = ref(null);
const deleteDealTarget = ref(null);

// ── Lead Modal ────────────────────────────────────────────────────────────────
const showLeadModal = ref(false);
const editingLead = ref(null);
const leadForm = ref({
  contact_name: "",
  company: "",
  email: "",
  phone: "",
  value: 0,
  status: "new",
  source: "manual",
  notes: "",
});

const leadStatusOptions = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta" },
  { value: "closed_won", label: "Fechou" },
  { value: "closed_lost", label: "Perdeu" },
];
const leadSourceOptions = [
  { value: "manual", label: "Manual" },
  { value: "shopee", label: "Shopee" },
  { value: "ml", label: "Mercado Livre" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Indicação" },
];

const leadHeaders = [
  { key: "contact_name", label: "Nome" },
  { key: "company", label: "Empresa" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "status", label: "Status" },
  { key: "value", label: "Valor", class: "text-right" },
  { key: "source", label: "Fonte" },
  { key: "actions", label: "", width: "100px" },
];

function openNewLead() {
  editingLead.value = null;
  leadForm.value = {
    contact_name: "",
    company: "",
    email: "",
    phone: "",
    value: 0,
    status: "new",
    source: "manual",
    notes: "",
  };
  leadFormError.value = "";
  showLeadModal.value = true;
}

function editLead(lead) {
  editingLead.value = lead;
  leadForm.value = { ...lead };
  leadFormError.value = "";
  showLeadModal.value = true;
}

async function saveLead() {
  if (!leadForm.value.contact_name) {
    leadFormError.value = "Nome é obrigatório";
    return;
  }
  saving.value = true;
  leadFormError.value = "";
  try {
    if (editingLead.value) {
      await api.put(`/crm/leads/${editingLead.value.id}`, leadForm.value);
    } else {
      await api.post("/crm/leads", leadForm.value);
    }
    closeModal();
    await Promise.all([fetchLeads(), fetchStats()]);
  } catch (err) {
    leadFormError.value = err?.response?.data?.error?.message || "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function doDeleteLead() {
  if (!deleteLeadTarget.value) return;
  saving.value = true;
  try {
    await api.delete(`/crm/leads/${deleteLeadTarget.value.id}`);
    deleteLeadTarget.value = null;
    await Promise.all([fetchLeads(), fetchStats()]);
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao excluir.");
    deleteLeadTarget.value = null;
  } finally {
    saving.value = false;
  }
}

// ── Deal Modal ────────────────────────────────────────────────────────────────
const showDealModal = ref(false);
const editingDeal = ref(null);
const dealForm = ref({
  title: "",
  lead_id: "",
  pipeline_stage: "prospecting",
  expected_value: 0,
  probability: 50,
  close_date: "",
  description: "",
});

const dealStageOptions = [
  { value: "prospecting", label: "Prospecção" },
  { value: "qualification", label: "Qualificação" },
  { value: "proposal", label: "Proposta" },
  { value: "negotiation", label: "Negociação" },
  { value: "closed_won", label: "Fechou" },
  { value: "closed_lost", label: "Perdeu" },
];

const dealHeaders = [
  { key: "title", label: "Título" },
  { key: "contact_name", label: "Lead" },
  { key: "pipeline_stage", label: "Estágio" },
  { key: "expected_value", label: "Valor", class: "text-right" },
  { key: "probability", label: "Prob.", class: "text-right" },
  { key: "close_date", label: "Data prevista" },
  { key: "actions", label: "", width: "100px" },
];

const leadSelectOptions = computed(() =>
  leads.value.map((l) => ({ value: l.id, label: `${l.contact_name}${l.company ? " - " + l.company : ""}` }))
);

function openNewDeal() {
  editingDeal.value = null;
  dealForm.value = {
    title: "",
    lead_id: "",
    pipeline_stage: "prospecting",
    expected_value: 0,
    probability: 50,
    close_date: "",
    description: "",
  };
  dealFormError.value = "";
  showDealModal.value = true;
}

function editDeal(deal) {
  editingDeal.value = deal;
  dealForm.value = { ...deal };
  dealFormError.value = "";
  showDealModal.value = true;
}

async function saveDeal() {
  if (!dealForm.value.title || !dealForm.value.lead_id) {
    dealFormError.value = "Título e Lead são obrigatórios";
    return;
  }
  saving.value = true;
  dealFormError.value = "";
  try {
    if (editingDeal.value) {
      await api.put(`/crm/deals/${editingDeal.value.id}`, dealForm.value);
    } else {
      await api.post("/crm/deals", dealForm.value);
    }
    closeModal();
    await Promise.all([fetchDeals(), fetchStats()]);
  } catch (err) {
    dealFormError.value = err?.response?.data?.error?.message || "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function doDeleteDeal() {
  if (!deleteDealTarget.value) return;
  saving.value = true;
  try {
    await api.delete(`/crm/deals/${deleteDealTarget.value.id}`);
    deleteDealTarget.value = null;
    await Promise.all([fetchDeals(), fetchStats()]);
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao excluir.");
    deleteDealTarget.value = null;
  } finally {
    saving.value = false;
  }
}

// ── Activity ──────────────────────────────────────────────────────────────────
const activityTypeOptions = [
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "Email" },
  { value: "note", label: "Anotação" },
  { value: "task", label: "Tarefa" },
];

const activityHeaders = [
  { key: "type", label: "Tipo" },
  { key: "subject", label: "Assunto" },
  { key: "contact_name", label: "Lead" },
  { key: "deal_title", label: "Negócio" },
  { key: "scheduled_at", label: "Agendado" },
  { key: "completed_at", label: "Completo" },
  { key: "actions", label: "", width: "120px" },
];

function openNewActivity() {
  // For now, just create inline — no modal for activities (simpler)
  alert("Funcionalidade de criar atividades em breve — adicione via API se necessário.");
}

async function completeActivity(act) {
  try {
    await api.post(`/crm/activities/${act.id}/complete`);
    await fetchActivities();
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao completar atividade.");
  }
}

async function deleteActivity(act) {
  if (!confirm("Excluir esta atividade?")) return;
  try {
    await api.delete(`/crm/activities/${act.id}`);
    await fetchActivities();
  } catch (err) {
    alert(err?.response?.data?.error?.message || "Erro ao excluir.");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const stageLabels = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  proposal: "Proposta",
  closed_won: "Fechou",
  closed_lost: "Perdeu",
};
const stageLabels_deal = {
  prospecting: "Prospecção",
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
  closed_won: "Fechou",
  closed_lost: "Perdeu",
};
function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function statusClass(s) {
  return (
    {
      new: "badge-info",
      contacted: "badge-warning",
      qualified: "badge-primary",
      proposal: "badge-purple",
      closed_won: "badge-success",
      closed_lost: "badge-danger",
    }[s] || ""
  );
}
function stageClass(s) {
  return (
    {
      prospecting: "badge-info",
      qualification: "badge-warning",
      proposal: "badge-purple",
      negotiation: "badge-primary",
      closed_won: "badge-success",
      closed_lost: "badge-danger",
    }[s] || ""
  );
}
function stageLabel(s) {
  return stageLabels_deal[s] || s;
}

function closeModal() {
  showLeadModal.value = false;
  showDealModal.value = false;
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function fetchLeads() {
  const res = await api.get("/crm/leads", { params: { search: search.value, status: filterStatus.value } });
  leads.value = res.data.data;
}
async function fetchDeals() {
  const res = await api.get("/crm/deals", { params: { search: dealSearch.value, pipeline_stage: filterStage.value } });
  deals.value = res.data.data;
}
async function fetchActivities() {
  const res = await api.get("/crm/activities", { params: { type: filterType.value } });
  activities.value = res.data.data;
}
async function fetchStats() {
  const res = await api.get("/crm/pipeline-stats");
  pipelineStats.value = res.data.data;
}

onMounted(async () => {
  await Promise.all([fetchLeads(), fetchDeals(), fetchActivities(), fetchStats()]);
});
</script>

<style scoped>
.crm-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.crm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.crm-tabs {
  display: flex;
  gap: 4px;
  margin-left: 16px;
}
.crm-tabs button {
  padding: 6px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
}
.crm-tabs button.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.crm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
}
.stat-value-small {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
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
