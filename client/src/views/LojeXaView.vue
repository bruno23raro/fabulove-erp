<template>
  <div>
    <!-- Status Card -->
    <Card style="margin-bottom: 16px">
      <div class="status-section">
        <div>
          <div class="text-muted text-sm" style="margin-bottom: 4px">Status da integração</div>
          <div style="font-size: 18px; font-weight: 700">
            <span :class="status.configured ? 'badge-success' : 'badge-gray'" class="badge">
              {{ status.configured ? "Conectado" : "Não configurado" }}
            </span>
            <span v-if="status.apiAvailable" class="badge-success badge" style="margin-left: 4px">
              API Ativa
            </span>
            <span v-if="status.webhookConfigured" class="badge-info badge" style="margin-left: 4px">
              Webhook Ativo
            </span>
          </div>
          <div v-if="status.companyName" class="text-muted text-sm" style="margin-top: 4px">
            Empresa: {{ status.companyName }}
          </div>
          <div v-if="status.baseUrl" class="text-muted text-sm">
            Endpoint: {{ status.baseUrl }}
          </div>
        </div>
      </div>
    </Card>

    <!-- Actions Section -->
    <Card style="margin-bottom: 16px">
      <div class="card-header-section">
        <span class="card-title">⚙️ Ações de Sincronização</span>
      </div>
      <div class="card-body">
        <div v-if="syncResult" class="result-summary" style="margin-bottom: 16px">
          <div v-if="syncResult.failed > 0" class="summary-row">
            <span class="summary-label" style="color: var(--color-danger)">❌ Falhas: {{ syncResult.failed }}</span>
          </div>
          <div v-else-if="syncResult.synced > 0" class="summary-row">
            <span class="summary-label">✅ Synchronizado:</span>
            <span class="summary-value" style="color: var(--color-success)">{{ syncResult.synced }}</span>
          </div>
          <div v-else class="summary-row">
            <span class="summary-label text-muted">Nenhuma divergência encontrada</span>
          </div>
        </div>

        <div class="action-grid" style="display: grid; gap: 12px; margin-bottom: 16px">
          <Button :disabled="syncing" @click="syncStock">
            <span v-if="syncing" class="spinner" style="width: 12px; height: 12px"></span>
            🔄 Sincronizar Estoque
          </Button>
          <Button :disabled="!status.configured" @click="getStatus">
            <span v-if="statusLoading" class="spinner" style="width: 12px; height: 12px"></span>
            📊 Verificar Status
          </Button>
          <Button variant="secondary" :disabled="!status.configured" @click="getCompanyInfo">
            ℹ️ Informações da Empresa
          </Button>
        </div>

        <div v-if="syncError" class="alert alert-danger" style="margin-top: 12px">
          {{ syncError }}
        </div>

        <div v-if="companyInfo" class="alert alert-info" style="margin-top: 12px">
          <strong>Empresa LojeXa:</strong> {{ companyInfo.company_name || 'N/A' }}
        </div>
      </div>
    </Card>

    <!-- Product Validation -->
    <Card style="margin-bottom: 16px">
      <div class="card-header-section">
        <span class="card-title">🔍 Validar SKU</span>
      </div>
      <div class="card-body">
        <div class="form-row" style="margin-bottom: 12px">
          <div class="form-group" style="flex: 1">
            <label class="form-label">SKU</label>
            <Input v-model="validationForm.sku" placeholder="Digite o SKU do produto" />
          </div>
          <div class="form-group" style="align-self: end">
            <Button :disabled="!validationForm.sku || validatingSku" @click="validateSku">
              <span v-if="validatingSku" class="spinner" style="width: 12px; height: 12px"></span>
              Validar
            </Button>
          </div>
        </div>

        <div v-if="validationResult" class="alert" :class="validationResult.valid ? 'alert-success' : 'alert-danger'">
          <strong>{{ validationResult.valid ? '✅ SKU Válido' : '❌ SKU Inválido' }}</strong>
          <div v-if="validationResult.valid" class="text-sm" style="margin-top: 4px">
            {{ validationResult.name }}<br>
            <span class="text-muted">Estoque: {{ validationResult.currentStock }}</span>
            <span class="text-muted" v-if="validationResult.barcode"> | EAN: {{ validationResult.barcode }}</span>
          </div>
          <div v-if="!validationResult.valid" class="text-sm" style="margin-top: 4px">
            {{ validationResult.message || validationResult.reason }}
          </div>
        </div>
      </div>
    </Card>

    <!-- Divergent SKUs -->
    <Card style="margin-bottom: 16px">
      <div class="card-header-section" @click="showDivergent = !showDivergent">
        <span class="card-title">📦 SKUs Divergentes</span>
        <span style="margin-left: auto; color: var(--color-text-muted)">
          {{ showDivergent ? "▲" : "▼" }}
        </span>
      </div>
      <div v-if="showDivergent" class="card-body">
        <div v-if="loadingDivergent" class="loading-center" style="padding: 24px"><span class="spinner"></span></div>
        <div v-else-if="divergentSkus.length === 0" class="text-center" style="padding: 24px; color: var(--color-text-muted)">
          🎉 Todos os estoques estão sincronizados!
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nome</th>
              <th>ERP</th>
              <th>LojeXa</th>
              <th>Diferença</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in divergentSkus" :key="item.sku">
              <td class="font-mono text-sm">{{ item.sku }}</td>
              <td class="text-sm">{{ item.name }}</td>
              <td :class="item.erpStock < item.lojexaStock ? 'text-success' : 'text-danger'">
                {{ item.erpStock }}
              </td>
              <td :class="item.lojexaStock < item.erpStock ? 'text-success' : 'text-danger'">
                {{ item.lojexaStock }}
              </td>
              <td class="text-sm">
                <span :class="item.difference > 0 ? 'text-danger' : 'text-success'">
                  {{ item.difference > 0 ? '+' : '' }}{{ item.difference }}
                </span>
              </td>
              <td>
                <Button size="sm" @click="syncSingleSku(item.sku, item.name)">
                  Sincronizar
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Sync History -->
    <Card>
      <div class="card-header-section">
        <span class="card-title">📋 Histórico de Sincronização</span>
      </div>
      <div class="card-body" style="padding: 0">
        <div v-if="loadingSyncs" class="loading-center" style="padding: 24px"><span class="spinner"></span></div>
        <div v-else-if="!syncs || syncs.length === 0" class="text-center" style="padding: 24px; color: var(--color-text-muted)">
          Nenhum registro de sincronização
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Status</th>
              <th>Observações</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sync in syncs.slice(0, 50)" :key="sync.id">
              <td class="text-sm">{{ sync.type }}</td>
              <td class="text-sm">{{ sync.quantity }}</td>
              <td>
                <span :class="sync.status === 'success' ? 'badge-success' : 'badge-danger'" class="badge">
                  {{ sync.status }}
                </span>
              </td>
              <td class="text-sm text-muted">{{ sync.notes }}</td>
              <td class="text-muted text-sm">{{ formatDateTime(sync.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/utils/api.js";
import { Card, Input, Button } from "@/components/ui";

// Estado principal
const status = ref({
  configured: false,
  apiAvailable: false,
  webhookConfigured: false,
  companyName: null,
  baseUrl: null,
});

const syncing = ref(false);
const statusLoading = ref(false);
const loadingDivergent = ref(false);
const loadingSyncs = ref(true);
const syncs = ref([]);

// Validação de SKU
const validationForm = ref({ sku: "" });
const validatingSku = ref(false);
const validationResult = ref(null);

// Divergent SKUs
const showDivergent = ref(true);
const divergentSkus = ref([]);

// Company info
const companyInfo = ref(null);

// Resultados
const syncResult = ref(null);
const syncError = ref("");

// Carregar status
async function getStatus() {
  statusLoading.value = true;
  try {
    const { data } = await api.get("/lojexa/status");
    status.value = data.data || status.value;
  } catch (err) {
    console.error("Erro ao carregar status:", err);
  } finally {
    statusLoading.value = false;
  }
}

// Sincronizar estoque
async function syncStock() {
  syncing.value = true;
  syncResult.value = null;
  syncError.value = "";

  try {
    const { data } = await api.post("/lojexa/full-sync", { dryRun: false });
    syncResult.value = data.data;
  } catch (err) {
    syncError.value = err?.response?.data?.error?.message || "Erro ao sincronizar";
  } finally {
    syncing.value = false;
  }
}

// Validar SKU
async function validateSku() {
  validatingSku.value = true;
  validationResult.value = null;

  try {
    const { data } = await api.get("/lojexa/validate", {
      params: { sku: validationForm.value.sku }
    });
    validationResult.value = data.data;
  } catch (err) {
    validationResult.value = {
      valid: false,
      message: err?.response?.data?.error?.message || "Erro ao validar SKU"
    };
  } finally {
    validatingSku.value = false;
  }
}

// Carregar SKUs divergentes
async function loadDivergentSkus() {
  loadingDivergent.value = true;
  try {
    const { data } = await api.get("/lojexa/divergent");
    divergentSkus.value = data.data?.divergent || [];
  } catch (err) {
    console.error("Erro ao carregar divergentes:", err);
  } finally {
    loadingDivergent.value = false;
  }
}

// Sincronizar um SKU específico
async function syncSingleSku(sku, name) {
  try {
    // Encontrar o produto no ERP por SKU
    const { data: prodData } = await api.get("/products", {
      params: { search: sku, limit: 1 }
    });

    const product = prodData.data?.data?.[0];
    if (!product) {
      alert(`Produto com SKU ${sku} não encontrado`);
      return;
    }

    const { data } = await api.post(`/lojexa/sync/${product.id}`, { dryRun: false });
    alert(`Estoque sincronizado para ${name || sku}`);
    loadDivergentSkus();
  } catch (err) {
    alert("Erro ao sincronizar: " + (err?.response?.data?.error?.message || err.message));
  }
}

// Obter informações da empresa
async function getCompanyInfo() {
  try {
    const { data } = await api.get("/lojexa/company");
    companyInfo.value = data.data;
  } catch (err) {
    companyInfo.value = { error: "Não foi possível obter informações" };
  }
}

// Carregar histórico de sincronização
async function loadSyncHistory() {
  loadingSyncs.value = true;
  try {
    const { data } = await api.get("/stock/movements", {
      params: { reference_type: 'lojexa_webhook', limit: 50 }
    });
    syncs.value = data.data || [];
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
    syncs.value = [];
  } finally {
    loadingSyncs.value = false;
  }
}

function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(() => {
  getStatus();
  loadDivergentSkus();
  loadSyncHistory();
});
</script>

<style scoped>
.status-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.card-header-section {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}
.card-title {
  font-weight: 600;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}
.action-grid {
  display: grid;
  gap: 8px;
}
.result-summary {
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}
.summary-label {
  color: var(--color-text-secondary);
}
.summary-value {
  font-weight: 600;
}
.manual-callback {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
</style>// build timestamp: 20261103210246
