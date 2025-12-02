import React, { useState, useEffect, useCallback } from 'react';
import { 
  integrationsAPI, 
  Integration,
  CreateIntegrationData
} from '../services/api';
import './IntegrationCatalog.css';

// Reference data for dropdowns
const INTEGRATION_TYPES = ['API', 'FileTransfer', 'Database', 'MessageQueue', 'Webhook', 'ETL', 'Custom'];
const DIRECTIONS = ['Inbound', 'Outbound', 'Bidirectional'];
const SOURCE_TARGET_TYPES = ['Service', 'CI', 'External'];
const PROTOCOLS = ['REST', 'SOAP', 'GraphQL', 'gRPC', 'SFTP', 'FTP', 'JDBC', 'ODBC', 'AMQP', 'Kafka', 'Custom'];
const AUTH_METHODS = ['None', 'APIKey', 'OAuth2', 'BasicAuth', 'Certificate', 'SAML', 'JWT', 'Custom'];
const DATA_FORMATS = ['JSON', 'XML', 'CSV', 'Parquet', 'Avro', 'Binary', 'Custom'];
const DATA_CLASSIFICATIONS = ['Public', 'Internal', 'Confidential', 'PII', 'PHI', 'Restricted'];
const FREQUENCY_TYPES = ['RealTime', 'NearRealTime', 'Scheduled', 'OnDemand', 'Event'];
const HEALTH_STATUSES = ['Healthy', 'Degraded', 'Unhealthy', 'Unknown', 'Maintenance'];
const STATUSES = ['Active', 'Inactive', 'Deprecated', 'Planned'];

interface IntegrationCatalogProps {
  // Optional callback when an integration is selected
  onIntegrationSelect?: (integration: Integration) => void;
}

const IntegrationCatalog: React.FC<IntegrationCatalogProps> = ({ onIntegrationSelect }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<CreateIntegrationData>>({
    integrationName: '',
    description: '',
    integrationType: 'API',
    direction: 'Outbound',
    sourceType: 'Service',
    targetType: 'External',
    protocol: 'REST',
    authMethod: 'OAuth2',
    dataFormat: 'JSON',
    dataClassification: 'Internal',
    frequencyType: 'RealTime',
    status: 'Active',
    healthStatus: 'Unknown',
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.integrationType = typeFilter;
      if (healthFilter) filters.healthStatus = healthFilter;
      
      const response = await integrationsAPI.getAll(filters);
      
      if (response.success && response.data) {
        setIntegrations(response.data);
      } else {
        // Handle array response directly
        if (Array.isArray(response)) {
          setIntegrations(response);
        } else {
          throw new Error(response.error || 'Failed to load integrations');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, healthFilter]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // Filter integrations by search term
  const filteredIntegrations = integrations.filter(integration => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      integration.IntegrationName.toLowerCase().includes(search) ||
      integration.Description?.toLowerCase().includes(search) ||
      integration.SourceName?.toLowerCase().includes(search) ||
      integration.TargetName?.toLowerCase().includes(search) ||
      integration.Owner?.toLowerCase().includes(search)
    );
  });

  // Handle integration selection
  const handleSelectIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    if (onIntegrationSelect) {
      onIntegrationSelect(integration);
    }
  };

  // Handle form input change
  const handleFormChange = (field: keyof CreateIntegrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      integrationName: '',
      description: '',
      integrationType: 'API',
      direction: 'Outbound',
      sourceType: 'Service',
      targetType: 'External',
      protocol: 'REST',
      authMethod: 'OAuth2',
      dataFormat: 'JSON',
      dataClassification: 'Internal',
      frequencyType: 'RealTime',
      status: 'Active',
      healthStatus: 'Unknown',
    });
    setFormError(null);
  };

  // Handle create integration
  const handleCreate = async () => {
    if (!formData.integrationName) {
      setFormError('Integration name is required');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    
    try {
      const response = await integrationsAPI.create(formData as CreateIntegrationData);
      if (response.success || response.data) {
        setShowCreateModal(false);
        resetForm();
        loadIntegrations();
      } else {
        throw new Error(response.error || 'Failed to create integration');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create integration');
    } finally {
      setSaving(false);
    }
  };

  // Handle edit integration
  const handleEdit = (integration: Integration) => {
    setFormData({
      integrationName: integration.IntegrationName,
      description: integration.Description,
      integrationType: integration.IntegrationType,
      direction: integration.Direction,
      sourceType: integration.SourceType,
      sourceServiceId: integration.SourceServiceId,
      sourceCiId: integration.SourceCiId,
      sourceExternalId: integration.SourceExternalId,
      targetType: integration.TargetType,
      targetServiceId: integration.TargetServiceId,
      targetCiId: integration.TargetCiId,
      targetExternalId: integration.TargetExternalId,
      protocol: integration.Protocol,
      authMethod: integration.AuthMethod,
      endpoint: integration.Endpoint,
      port: integration.Port,
      dataFormat: integration.DataFormat,
      dataClassification: integration.DataClassification,
      frequencyType: integration.FrequencyType,
      frequencyDetails: integration.FrequencyDetails,
      status: integration.Status,
      healthStatus: integration.HealthStatus,
      sla: integration.SLA,
      owner: integration.Owner,
    });
    setSelectedIntegration(integration);
    setShowEditModal(true);
  };

  // Handle update integration
  const handleUpdate = async () => {
    if (!selectedIntegration) return;
    
    setSaving(true);
    setFormError(null);
    
    try {
      const response = await integrationsAPI.update(selectedIntegration.IntegrationId, formData);
      if (response.success || response.data) {
        setShowEditModal(false);
        setSelectedIntegration(null);
        resetForm();
        loadIntegrations();
      } else {
        throw new Error(response.error || 'Failed to update integration');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update integration');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete integration
  const handleDelete = async (integration: Integration) => {
    if (!window.confirm(`Are you sure you want to delete "${integration.IntegrationName}"?`)) {
      return;
    }
    
    try {
      await integrationsAPI.delete(integration.IntegrationId);
      loadIntegrations();
      if (selectedIntegration?.IntegrationId === integration.IntegrationId) {
        setSelectedIntegration(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  };

  // Handle health status update
  const handleHealthUpdate = async (integration: Integration, newHealth: string) => {
    try {
      await integrationsAPI.updateHealth(integration.IntegrationId, newHealth);
      loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update health status');
    }
  };

  // Get health status color
  const getHealthColor = (health?: string) => {
    switch (health) {
      case 'Healthy': return '#28a745';
      case 'Degraded': return '#ffc107';
      case 'Unhealthy': return '#dc3545';
      case 'Maintenance': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Get direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'Inbound': return '⬇️';
      case 'Outbound': return '⬆️';
      case 'Bidirectional': return '↕️';
      default: return '➡️';
    }
  };

  // Render loading state
  if (loading && integrations.length === 0) {
    return (
      <div className="integration-catalog">
        <div className="catalog-loading">
          <div className="loading-spinner"></div>
          <p>Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-catalog">
      {/* Header */}
      <div className="catalog-header">
        <div className="header-title">
          <h2>🔗 Integration Catalog</h2>
          <p>Manage and monitor all system integrations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Integration
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="catalog-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="catalog-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {INTEGRATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}>
            <option value="">All Health</option>
            {HEALTH_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <button className="btn-secondary" onClick={loadIntegrations}>
          🔄 Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="catalog-stats">
        <div className="stat-card">
          <span className="stat-value">{integrations.length}</span>
          <span className="stat-label">Total Integrations</span>
        </div>
        <div className="stat-card healthy">
          <span className="stat-value">{integrations.filter(i => i.HealthStatus === 'Healthy').length}</span>
          <span className="stat-label">Healthy</span>
        </div>
        <div className="stat-card degraded">
          <span className="stat-value">{integrations.filter(i => i.HealthStatus === 'Degraded').length}</span>
          <span className="stat-label">Degraded</span>
        </div>
        <div className="stat-card unhealthy">
          <span className="stat-value">{integrations.filter(i => i.HealthStatus === 'Unhealthy').length}</span>
          <span className="stat-label">Unhealthy</span>
        </div>
      </div>

      {/* Integration list */}
      <div className="catalog-content">
        <div className="integration-list">
          {filteredIntegrations.length === 0 ? (
            <div className="empty-state">
              <span>📭</span>
              <p>No integrations found</p>
              <button onClick={() => setShowCreateModal(true)}>Create your first integration</button>
            </div>
          ) : (
            filteredIntegrations.map(integration => (
              <div 
                key={integration.IntegrationId} 
                className={`integration-card ${selectedIntegration?.IntegrationId === integration.IntegrationId ? 'selected' : ''}`}
                onClick={() => handleSelectIntegration(integration)}
              >
                <div className="card-header">
                  <div className="card-title">
                    <span className="direction-icon">{getDirectionIcon(integration.Direction)}</span>
                    <h3>{integration.IntegrationName}</h3>
                  </div>
                  <div 
                    className="health-badge"
                    style={{ backgroundColor: getHealthColor(integration.HealthStatus) }}
                  >
                    {integration.HealthStatus || 'Unknown'}
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="integration-flow">
                    <span className="source">{integration.SourceName || `${integration.SourceType}`}</span>
                    <span className="flow-arrow">→</span>
                    <span className="target">{integration.TargetName || `${integration.TargetType}`}</span>
                  </div>
                  
                  <div className="card-tags">
                    <span className="tag type">{integration.IntegrationType}</span>
                    <span className="tag protocol">{integration.Protocol}</span>
                    <span className="tag status">{integration.Status}</span>
                  </div>
                </div>
                
                <div className="card-footer">
                  <span className="owner">👤 {integration.Owner || 'Unassigned'}</span>
                  <div className="card-actions">
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleEdit(integration); }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon delete" 
                      onClick={(e) => { e.stopPropagation(); handleDelete(integration); }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedIntegration && (
          <div className="integration-detail-panel">
            <div className="detail-header">
              <h3>{selectedIntegration.IntegrationName}</h3>
              <button className="close-btn" onClick={() => setSelectedIntegration(null)}>×</button>
            </div>
            
            <div className="detail-content">
              <div className="detail-section">
                <h4>Overview</h4>
                <p className="description">{selectedIntegration.Description || 'No description provided'}</p>
                
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{selectedIntegration.IntegrationType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Direction</label>
                    <span>{getDirectionIcon(selectedIntegration.Direction)} {selectedIntegration.Direction}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`status-badge ${selectedIntegration.Status.toLowerCase()}`}>
                      {selectedIntegration.Status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Health</label>
                    <select 
                      value={selectedIntegration.HealthStatus || 'Unknown'}
                      onChange={(e) => handleHealthUpdate(selectedIntegration, e.target.value)}
                      style={{ borderColor: getHealthColor(selectedIntegration.HealthStatus) }}
                    >
                      {HEALTH_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Connection Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Source</label>
                    <span>{selectedIntegration.SourceName || `${selectedIntegration.SourceType} ID`}</span>
                  </div>
                  <div className="detail-item">
                    <label>Target</label>
                    <span>{selectedIntegration.TargetName || `${selectedIntegration.TargetType} ID`}</span>
                  </div>
                  <div className="detail-item">
                    <label>Protocol</label>
                    <span>{selectedIntegration.Protocol || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Auth Method</label>
                    <span>{selectedIntegration.AuthMethod || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Endpoint</label>
                    <span className="endpoint">{selectedIntegration.Endpoint || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Port</label>
                    <span>{selectedIntegration.Port || 'Default'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Data Format</label>
                    <span>{selectedIntegration.DataFormat || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Data & Scheduling</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Classification</label>
                    <span className={`classification-badge ${selectedIntegration.DataClassification?.toLowerCase()}`}>
                      {selectedIntegration.DataClassification || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Frequency</label>
                    <span>{selectedIntegration.FrequencyType || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Schedule Details</label>
                    <span>{selectedIntegration.FrequencyDetails || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>SLA</label>
                    <span>{selectedIntegration.SLA || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Ownership</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Owner</label>
                    <span>{selectedIntegration.Owner || 'Unassigned'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{new Date(selectedIntegration.CreatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Updated</label>
                    <span>{selectedIntegration.UpdatedAt ? new Date(selectedIntegration.UpdatedAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Health Check</label>
                    <span>{selectedIntegration.LastHealthCheck ? new Date(selectedIntegration.LastHealthCheck).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <button className="btn-primary" onClick={() => handleEdit(selectedIntegration)}>
                ✏️ Edit Integration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Integration</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}
              
              <div className="form-group">
                <label>Integration Name *</label>
                <input
                  type="text"
                  value={formData.integrationName || ''}
                  onChange={(e) => handleFormChange('integrationName', e.target.value)}
                  placeholder="e.g., Customer Portal → Stripe Payment"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Describe what this integration does..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    value={formData.integrationType || 'API'}
                    onChange={(e) => handleFormChange('integrationType', e.target.value)}
                  >
                    {INTEGRATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Direction</label>
                  <select 
                    value={formData.direction || 'Outbound'}
                    onChange={(e) => handleFormChange('direction', e.target.value)}
                  >
                    {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Source Type</label>
                  <select 
                    value={formData.sourceType || 'Service'}
                    onChange={(e) => handleFormChange('sourceType', e.target.value)}
                  >
                    {SOURCE_TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Type</label>
                  <select 
                    value={formData.targetType || 'External'}
                    onChange={(e) => handleFormChange('targetType', e.target.value)}
                  >
                    {SOURCE_TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Protocol</label>
                  <select 
                    value={formData.protocol || 'REST'}
                    onChange={(e) => handleFormChange('protocol', e.target.value)}
                  >
                    {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Auth Method</label>
                  <select 
                    value={formData.authMethod || 'OAuth2'}
                    onChange={(e) => handleFormChange('authMethod', e.target.value)}
                  >
                    {AUTH_METHODS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Endpoint URL</label>
                <input
                  type="text"
                  value={formData.endpoint || ''}
                  onChange={(e) => handleFormChange('endpoint', e.target.value)}
                  placeholder="https://api.example.com/v1/endpoint"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Port</label>
                  <input
                    type="number"
                    value={formData.port || ''}
                    onChange={(e) => handleFormChange('port', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="443"
                  />
                </div>
                <div className="form-group">
                  <label>Data Format</label>
                  <select 
                    value={formData.dataFormat || 'JSON'}
                    onChange={(e) => handleFormChange('dataFormat', e.target.value)}
                  >
                    {DATA_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data Classification</label>
                  <select 
                    value={formData.dataClassification || 'Internal'}
                    onChange={(e) => handleFormChange('dataClassification', e.target.value)}
                  >
                    {DATA_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select 
                    value={formData.frequencyType || 'RealTime'}
                    onChange={(e) => handleFormChange('frequencyType', e.target.value)}
                  >
                    {FREQUENCY_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Frequency Details</label>
                <input
                  type="text"
                  value={formData.frequencyDetails || ''}
                  onChange={(e) => handleFormChange('frequencyDetails', e.target.value)}
                  placeholder="e.g., Daily at 6:00 AM UTC"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status || 'Active'}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Owner Email</label>
                  <input
                    type="email"
                    value={formData.owner || ''}
                    onChange={(e) => handleFormChange('owner', e.target.value)}
                    placeholder="owner@vibenow.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>SLA</label>
                <input
                  type="text"
                  value={formData.sla || ''}
                  onChange={(e) => handleFormChange('sla', e.target.value)}
                  placeholder="e.g., 99.9% uptime"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Integration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIntegration && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Integration</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}
              
              {/* Same form fields as create modal */}
              <div className="form-group">
                <label>Integration Name *</label>
                <input
                  type="text"
                  value={formData.integrationName || ''}
                  onChange={(e) => handleFormChange('integrationName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status || 'Active'}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Health Status</label>
                  <select 
                    value={formData.healthStatus || 'Unknown'}
                    onChange={(e) => handleFormChange('healthStatus', e.target.value)}
                  >
                    {HEALTH_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Endpoint URL</label>
                <input
                  type="text"
                  value={formData.endpoint || ''}
                  onChange={(e) => handleFormChange('endpoint', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Owner Email</label>
                  <input
                    type="email"
                    value={formData.owner || ''}
                    onChange={(e) => handleFormChange('owner', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>SLA</label>
                  <input
                    type="text"
                    value={formData.sla || ''}
                    onChange={(e) => handleFormChange('sla', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationCatalog;
