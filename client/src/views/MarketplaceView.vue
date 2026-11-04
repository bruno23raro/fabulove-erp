<template>
  <div class="marketplace-view">
    <!-- Status Summary -->
    <div class="status-card">
      <div class="status-info">
        <div class="text-muted text-sm">Marketplace Status</div>
        <div class="status-count" :class="connectedCount > 0 ? 'success' : 'gray'">
          <span :class="connectedCount > 0 ? 'badge-success' : 'badge-gray'">
            {{ connectedCount }} Connected
          </span>
        </div>
      </div>
      <div v-if="lastSync" class="last-sync">
        <div class="text-muted text-sm">Last Sync</div>
        <div class="sync-date">{{ formatDateTime(lastSync) }}</div>
      </div>
    </div>

    <!-- LojeXa Hub Card (Primary Platform) -->
    <div class="marketplace-card lojexa-card">
      <div class="card-header">
        <div class="marketplace-icon">🔗</div>
        <div class="marketplace-info">
          <div class="marketplace-title">LojeXa Hub</div>
          <div class="marketplace-status">
            {{ lojexaStatus.connected ? 'Connected' : 'Not connected' }}
            <span v-if="lojexaStatus.connected" class="platform-badge">Platform</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-secondary" @click="refreshStatus" :disabled="loading.lojexa">
            <span v-if="loading.lojexa">↻</span>
            <span v-else>↻</span>
          </button>
          <button class="btn btn-sm" @click="syncStockToLojeXa()" :disabled="syncing.lojexa">
            <span v-if="syncing.lojexa">Syncing...</span>
            <span v-else>Sync Stock</span>
          </button>
          <button class="btn btn-sm" :class="lojexaStatus.connected ? 'btn-warning' : 'btn-success'" @click="connectLojeXa" :disabled="connecting.lojexa">
            <span v-if="connecting.lojexa">Connecting...</span>
            <span v-else>{{ lojexaStatus.connected ? 'Reconnect' : 'Connect' }}</span>
          </button>
        </div>
      </div>
      <div v-if="lojexaStatus.connected" class="platform-details">
        <div class="detail-row">
          <span class="detail-label">Company:</span>
          <span class="detail-value">{{ lojexaStatus.companyName || 'LojeXa Hub' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Mode:</span>
          <span class="detail-value">ERP as Stock Source</span>
        </div>
      </div>
    </div>

    <!-- Connected Stores Section -->
    <div v-if="lojexaStatus.connected" class="stores-section">
      <h3 class="stores-title">Connected Stores via LojeXa</h3>

      <div class="store-card">
        <div class="store-icon">🛍️</div>
        <div class="store-info">
          <div class="store-name">Shopee</div>
          <div class="store-status">Connected via LojeXa Hub</div>
        </div>
        <div class="store-actions">
          <span class="badge-connected">✓ Integrated</span>
        </div>
      </div>

      <div class="store-card">
        <div class="store-icon">💰</div>
        <div class="store-info">
          <div class="store-name">Mercado Livre</div>
          <div class="store-status">Connected via LojeXa Hub</div>
        </div>
        <div class="store-actions">
          <span class="badge-connected">✓ Integrated</span>
        </div>
      </div>
    </div>

    <!-- LojeXa Information -->
    <div class="info-card">
      <h4>LojeXa Hub Information</h4>
      <ul class="info-list">
        <li><strong>Stock Management:</strong> ERP maintains stock as source of truth</li>
        <li><strong>Synchronization:</strong> Automatic via webhooks when stock updates</li>
        <li><strong>Connected Stores:</strong> All stores sync through LojeXa Hub</li>
        <li><strong>Webhook Events:</strong> Sales and cancellations are processed automatically</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/utils/api.js";

// State
const lojexaStatus = ref({ connected: false });
const syncing = ref(false);
const connecting = ref(false);
const loading = ref(false);
const lastSync = ref(null);

// Computed
const connectedCount = computed(() => {
  return lojexaStatus.value.connected ? 1 : 0;
});

// Methods
const formatDateTime = (val) => {
  if (!val) return 'Never';
  return new Date(val).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const refreshStatus = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/lojexa/status');
    if (data.success) {
      lojexaStatus.value = {
        connected: data.data.configured,
        companyName: data.data.companyName,
        webhookConfigured: data.data.webhookConfigured
      };
      lastSync.value = data.data.lastSyncAt || null;
    }
  } catch (err) {
    console.error('Error refreshing status:', err);
  } finally {
    loading.value = false;
  }
};

const syncStockToLojeXa = async () => {
  syncing.value = true;
  try {
    const { data } = await api.post('/lojexa/full-sync', { dryRun: true });
    const msg = data.success
      ? `Full sync: ${data.data.synced || 0} products, ${data.data.divergent?.length || 0} divergent SKUs`
      : 'Dry run completed - no changes made';
    alert(msg);
  } catch (err) {
    alert(`Sync error: ${err?.response?.data?.error?.message || err.message}`);
  } finally {
    syncing.value = false;
  }
};

const connectLojeXa = async () => {
  connecting.value = true;
  try {
    // Check current status
    const { data } = await api.get('/lojexa/status');

    if (!data.data.configured) {
      alert('LojeXa API Key not configured. Please set LOJEXA_API_KEY in environment.');
    } else if (!data.data.apiAvailable) {
      alert('LojeXa API is not available. Check your LOJEXA_API_KEY.');
    } else {
      lojexaStatus.value = {
        connected: true,
        companyName: data.data.companyName,
        webhookConfigured: data.data.webhookConfigured
      };
      alert('LojeXa connected successfully! Stock will sync automatically via webhooks.');
    }
  } catch (err) {
    console.error('Error connecting:', err);
    alert(`Error: ${err?.response?.data?.error?.message || err.message}`);
  } finally {
    connecting.value = false;
  }
};

const loadMarketplacesStatus = async () => {
  try {
    const { data } = await api.get('/lojexa/status');
    if (data.success) {
      lojexaStatus.value = {
        connected: data.data.configured,
        companyName: data.data.companyName,
        webhookConfigured: data.data.webhookConfigured
      };
      lastSync.value = data.data.lastSyncAt || null;
    }
  } catch (err) {
    console.error('Error loading status:', err);
  }
};

onMounted(() => {
  loadMarketplacesStatus();
});
</script>

<style scoped>
.marketplace-view {
  padding: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 24px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-count {
  font-size: 18px;
  font-weight: 600;
}

.badge-success {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: #10b981;
  color: white;
}

.badge-gray {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: #6b7280;
  color: white;
}

.last-sync {
  text-align: right;
}

.last-sync .text-muted {
  font-size: 12px;
}

.last-sync .sync-date {
  font-size: 14px;
  font-weight: 600;
}

.marketplace-card {
  padding: 16px;
  margin-bottom: 12px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
}

.lojexa-card {
  border-left: 4px solid #3b82f6;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.marketplace-icon {
  font-size: 24px;
}

.marketplace-info {
  flex: 1;
}

.marketplace-title {
  font-size: 16px;
  font-weight: 600;
}

.marketplace-status {
  font-size: 12px;
  color: var(--text-muted, #6b7280);
}

.platform-badge {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  margin-left: 8px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  background: #f3f4f6;
  color: #374151;
  transition: all 0.2s;
}

.btn:hover {
  background: #e5e7eb;
}

.btn:active {
  transform: scale(0.98);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-secondary {
  background: #6b7280;
  color: white;
  border-color: #6b7280;
}

.btn.secondary:hover {
  background: #4b5563;
}

.btn-success {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn.success:hover {
  background: #059669;
}

.btn-warning {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.btn.warning:hover {
  background: #d97706;
}

.btn-loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.platform-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.detail-label {
  color: var(--text-muted, #6b7280);
}

.detail-value {
  font-weight: 500;
}

.stores-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid #e2e8f0;
}

.stores-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary, #1f2937);
}

.store-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.store-icon {
  font-size: 20px;
  margin-right: 12px;
}

.store-info {
  flex: 1;
}

.store-name {
  font-weight: 600;
  font-size: 14px;
}

.store-status {
  font-size: 11px;
  color: var(--text-muted, #6b7280);
}

.store-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-connected {
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.info-card {
  margin-top: 24px;
  padding: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

.info-card h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1e40af;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  font-size: 13px;
  margin-bottom: 8px;
  color: #334155;
}

.info-list li:last-child {
  margin-bottom: 0;
}

.text-muted {
  color: var(--text-muted, #6b7280);
}
</style>