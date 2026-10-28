<template>
  <div class="crm-view">
    <!-- Header -->
    <div class="crm-header">
      <div class="crm-header-left">
        <h1>CRM</h1>
        <div class="crm-tabs">
          <button :class="{ active: tab === 'leads' }" @click="tab = 'leads'">Leads</button>
          <button :class="{ active: tab === 'deals' }" @click="tab = 'deals'">Negócios</button>
          <button :class="{ active: tab === 'activities' }" @click="tab = 'activities'">Atividades</button>
        </div>
      </div>
      <button class="btn btn-primary" @click="openNewLead">+ Novo Lead</button>
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
      <div class="crm-toolbar">
        <input v-model="search" @input="fetchLeads" placeholder="Buscar por nome, empresa..." class="input" />
        <select v-model="filterStatus" @change="fetchLeads" class="select">
          <option value="">Todos os status</option>
          <option value="new">Novo</option>
          <option value="contacted">Contatado</option>
          <option value="qualified">Qualificado</option>
          <option value="proposal">Proposta</option>
          <option value="closed_won">Fechou</option>
          <option value="closed_lost">Perdeu</option>
        </select>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Empresa</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Status</th>
            <th>Valor</th>
            <th>Fonte</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in leads" :key="lead.id">
            <td><strong>{{ lead.contact_name }}</strong></td>
            <td>{{ lead.company || '-' }}</td>
            <td>{{ lead.email || '-' }}</td>
            <td>{{ lead.phone || '-' }}</td>
            <td><span class="badge" :class="statusClass(lead.status)">{{ statusLabel(lead.status) }}</span></td>
            <td>{{ formatCurrency(lead.value) }}</td>
            <td>{{ lead.source }}</td>
            <td>
              <button class="btn btn-ghost btn-sm" @click="editLead(lead)">✏️</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteLead(lead)">🗑️</button>
            </td>
          </tr>
          <tr v-if="leads.length === 0">
            <td colspan="8" class="text-center text-muted">Nenhum lead encontrado</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Deals Tab -->
    <template v-if="tab === 'deals'">
      <div class="crm-toolbar">
        <input v-model="dealSearch" @input="fetchDeals" placeholder="Buscar negócio..." class="input" />
        <select v-model="filterStage" @change="fetchDeals" class="select">
          <option value="">Todos os estágios</option>
          <option value="prospecting">Prospecção</option>
          <option value="qualification">Qualificação</option>
          <option value="proposal">Proposta</option>
          <option value="negotiation">Negociação</option>
          <option value="closed_won">Fechou</option>
          <option value="closed_lost">Perdeu</option>
        </select>
        <button class="btn btn-primary" @click="openNewDeal">+ Novo Negócio</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Lead</th>
            <th>Estágio</th>
            <th>Valor</th>
            <th>Probabilidade</th>
            <th>Data prévue</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="deal in deals" :key="deal.id">
            <td><strong>{{ deal.title }}</strong></td>
            <td>{{ deal.contact_name }}<br><small class="text-muted">{{ deal.company }}</small></td>
            <td><span class="badge" :class="stageClass(deal.pipeline_stage)">{{ stageLabel(deal.pipeline_stage) }}</span></td>
            <td>{{ formatCurrency(deal.expected_value) }}</td>
            <td>{{ deal.probability }}%</td>
            <td>{{ deal.close_date || '-' }}</td>
            <td>
              <button class="btn btn-ghost btn-sm" @click="editDeal(deal)">✏️</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteDeal(deal)">🗑️</button>
            </td>
          </tr>
          <tr v-if="deals.length === 0">
            <td colspan="7" class="text-center text-muted">Nenhum negócio encontrado</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Activities Tab -->
    <template v-if="tab === 'activities'">
      <div class="crm-toolbar">
        <select v-model="filterType" @change="fetchActivities" class="select">
          <option value="">Todos os tipos</option>
          <option value="call">Ligação</option>
          <option value="meeting">Reunião</option>
          <option value="email">Email</option>
          <option value="note">Anotação</option>
          <option value="task">Tarefa</option>
        </select>
        <button class="btn btn-primary" @click="openNewActivity">+ Nova Atividade</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Assunto</th>
            <th>Lead</th>
            <th>Negócio</th>
            <th>Agendado</th>
            <th>Completo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="act in activities" :key="act.id">
            <td><span class="badge">{{ act.type }}</span></td>
            <td>{{ act.subject || 'Sem assunto' }}</td>
            <td>{{ act.contact_name || '-' }}</td>
            <td>{{ act.deal_title || '-' }}</td>
            <td>{{ formatDate(act.scheduled_at) }}</td>
            <td>{{ act.completed_at ? '✅' : '⏳' }}</td>
            <td>
              <button v-if="!act.completed_at" class="btn btn-ghost btn-sm" @click="completeActivity(act)">✓</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteActivity(act)">🗑️</button>
            </td>
          </tr>
          <tr v-if="activities.length === 0">
            <td colspan="7" class="text-center text-muted">Nenhuma atividade encontrada</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Lead Modal -->
    <div v-if="showLeadModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingLead ? 'Editar Lead' : 'Novo Lead' }}</h3>
          <button class="btn btn-ghost" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nome de Contato *</label>
            <input v-model="leadForm.contact_name" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Empresa</label>
            <input v-model="leadForm.company" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="leadForm.email" type="email" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input v-model="leadForm.phone" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Valor</label>
            <input v-model.number="leadForm.value" type="number" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="leadForm.status" class="select">
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="proposal">Proposta</option>
              <option value="closed_won">Fechou</option>
              <option value="closed_lost">Perdeu</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Fonte</label>
            <select v-model="leadForm.source" class="select">
              <option value="manual">Manual</option>
              <option value="shopee">Shopee</option>
              <option value="ml">Mercado Livre</option>
              <option value="website">Website</option>
              <option value="referral">Indicação</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Notas</label>
            <textarea v-model="leadForm.notes" class="input" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveLead">{{ editingLead ? 'Salvar' : 'Criar' }}</button>
        </div>
      </div>
    </div>

    <!-- Deal Modal -->
    <div v-if="showDealModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingDeal ? 'Editar Negócio' : 'Novo Negócio' }}</h3>
          <button class="btn btn-ghost" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input v-model="dealForm.title" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Lead *</label>
            <select v-model="dealForm.lead_id" class="select">
              <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.contact_name }}{{ l.company ? ' - ' + l.company : '' }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estágio</label>
            <select v-model="dealForm.pipeline_stage" class="select">
              <option value="prospecting">Prospecção</option>
              <option value="qualification">Qualificação</option>
              <option value="proposal">Proposta</option>
              <option value="negotiation">Negociação</option>
              <option value="closed_won">Fechou</option>
              <option value="closed_lost">Perdeu</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor esperado</label>
            <input v-model.number="dealForm.expected_value" type="number" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Probabilidade (%)</label>
            <input v-model.number="dealForm.probability" type="number" min="0" max="100" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Data prevista</label>
            <input v-model="dealForm.close_date" type="date" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="dealForm.description" class="input" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveDeal">{{ editingDeal ? 'Salvar' : 'Criar' }}</button>
        </div>
      </div>
    </div>

    <!-- Activity Modal -->
    <div v-if="showActivityModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Nova Atividade</h3>
          <button class="btn btn-ghost" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select v-model="activityForm.type" class="select">
              <option value="call">Ligação</option>
              <option value="meeting">Reunião</option>
              <option value="email">Email</option>
              <option value="note">Anotação</option>
              <option value="task">Tarefa</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assunto</label>
            <input v-model="activityForm.subject" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Lead</label>
            <select v-model="activityForm.lead_id" class="select">
              <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.contact_name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Agendado para</label>
            <input v-model="activityForm.scheduled_at" type="datetime-local" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="activityForm.description" class="input" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveActivity">Criar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api.js'

const tab = ref('leads')
const search = ref('')
const filterStatus = ref('')
const dealSearch = ref('')
const filterStage = ref('')
const filterType = ref('')
const leads = ref([])
const deals = ref([])
const activities = ref([])
const pipelineStats = ref({ stages: {}, total_count: 0, total_value: 0 })

const showLeadModal = ref(false)
const showDealModal = ref(false)
const showActivityModal = ref(false)
const editingLead = ref(null)
const editingDeal = ref(null)

const leadForm = ref({ contact_name: '', company: '', email: '', phone: '', value: 0, status: 'new', source: 'manual', notes: '' })
const dealForm = ref({ title: '', lead_id: '', pipeline_stage: 'prospecting', expected_value: 0, probability: 50, close_date: '', description: '' })
const activityForm = ref({ type: 'call', subject: '', lead_id: '', scheduled_at: '', description: '' })

const stageLabels = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  closed_won: 'Fechou',
  closed_lost: 'Perdeu'
}

const stageLabels_deal = {
  prospecting: 'Prospecção',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed_won: 'Fechou',
  closed_lost: 'Perdeu'
}

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
const statusClass = (s) => ({ new: 'badge-info', contacted: 'badge-warning', qualified: 'badge-primary', proposal: 'badge-purple', closed_won: 'badge-success', closed_lost: 'badge-danger' }[s] || '')
const stageClass = (s) => ({ prospecting: 'badge-info', qualification: 'badge-warning', proposal: 'badge-purple', negotiation: 'badge-primary', closed_won: 'badge-success', closed_lost: 'badge-danger' }[s] || '')
const stageLabel = (s) => stageLabels_deal[s] || s

async function fetchLeads() {
  const res = await api.get('/crm/leads', { params: { search: search.value, status: filterStatus.value } })
  leads.value = res.data.data
}

async function fetchDeals() {
  const res = await api.get('/crm/deals', { params: { search: dealSearch.value, pipeline_stage: filterStage.value } })
  deals.value = res.data.data
}

async function fetchActivities() {
  const res = await api.get('/crm/activities', { params: { type: filterType.value } })
  activities.value = res.data.data
}

async function fetchStats() {
  const res = await api.get('/crm/pipeline-stats')
  pipelineStats.value = res.data.data
}

function openNewLead() {
  editingLead.value = null
  leadForm.value = { contact_name: '', company: '', email: '', phone: '', value: 0, status: 'new', source: 'manual', notes: '' }
  showLeadModal.value = true
}

function editLead(lead) {
  editingLead.value = lead
  leadForm.value = { ...lead }
  showLeadModal.value = true
}

async function saveLead() {
  if (!leadForm.value.contact_name) return alert('Nome é obrigatório')
  if (editingLead.value) {
    await api.put(`/crm/leads/${editingLead.value.id}`, leadForm.value)
  } else {
    await api.post('/crm/leads', leadForm.value)
  }
  closeModal()
  await fetchLeads()
  await fetchStats()
}

async function deleteLead(lead) {
  if (!confirm('Excluir este lead?')) return
  await api.delete(`/crm/leads/${lead.id}`)
  await fetchLeads()
  await fetchStats()
}

function openNewDeal() {
  editingDeal.value = null
  dealForm.value = { title: '', lead_id: '', pipeline_stage: 'prospecting', expected_value: 0, probability: 50, close_date: '', description: '' }
  showDealModal.value = true
}

function editDeal(deal) {
  editingDeal.value = deal
  dealForm.value = { ...deal }
  showDealModal.value = true
}

async function saveDeal() {
  if (!dealForm.value.title || !dealForm.value.lead_id) return alert('Título e Lead são obrigatórios')
  if (editingDeal.value) {
    await api.put(`/crm/deals/${editingDeal.value.id}`, dealForm.value)
  } else {
    await api.post('/crm/deals', dealForm.value)
  }
  closeModal()
  await fetchDeals()
  await fetchStats()
}

async function deleteDeal(deal) {
  if (!confirm('Excluir este negócio?')) return
  await api.delete(`/crm/deals/${deal.id}`)
  await fetchDeals()
  await fetchStats()
}

function openNewActivity() {
  activityForm.value = { type: 'call', subject: '', lead_id: '', scheduled_at: '', description: '' }
  showActivityModal.value = true
}

async function saveActivity() {
  if (!activityForm.value.type) return alert('Tipo é obrigatório')
  await api.post('/crm/activities', activityForm.value)
  closeModal()
  await fetchActivities()
}

async function completeActivity(act) {
  await api.post(`/crm/activities/${act.id}/complete`)
  await fetchActivities()
}

async function deleteActivity(act) {
  if (!confirm('Excluir esta atividade?')) return
  // No delete endpoint, skip for now
  await fetchActivities()
}

function closeModal() {
  showLeadModal.value = false
  showDealModal.value = false
  showActivityModal.value = false
}

onMounted(async () => {
  await Promise.all([fetchLeads(), fetchDeals(), fetchActivities(), fetchStats()])
})
</script>

<style scoped>
.crm-view { display: flex; flex-direction: column; gap: 16px; }
.crm-header { display: flex; justify-content: space-between; align-items: center; }
.crm-tabs { display: flex; gap: 4px; margin-left: 16px; }
.crm-tabs button { padding: 6px 12px; border-radius: var(--radius); border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; }
.crm-tabs button.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.crm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px; text-align: center; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--color-primary); }
.stat-value-small { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.stat-label { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.crm-toolbar { display: flex; gap: 8px; }
</style>
