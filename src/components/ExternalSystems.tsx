import React, { useState, useEffect, useCallback } from 'react';
import { 
  externalSystemsAPI, 
  ExternalSystem,
  CreateExternalSystemData
} from '../services/api';
import './ExternalSystems.css';

// Reference data for categories
const CATEGORIES = [
  'Payment', 
  'CRM', 
  'HR', 
  'Communication', 
  'Analytics', 
  'Security', 
  'Monitoring', 
  'eCommerce', 
  'Cloud', 
  'Other'
];

const STATUSES = ['Active', 'Inactive', 'Deprecated', 'Planned'];

const ExternalSystems: React.FC = () => {
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreateExternalSystemData>>({
    systemName: '',
    vendor: '',
    category: 'Other',
    description: '',
    baseUrl: '',
    documentationUrl: '',
    contactEmail: '',
    contractExpiry: '',
    status: 'Active',
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load external systems
  const loadSystems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      
      const response = await externalSystemsAPI.getAll(filters);
      
      if (response.success && response.data) {
        setSystems(response.data);
      } else if (Array.isArray(response)) {
        setSystems(response);
      } else {
        throw new Error(response.error || 'Failed to load external systems');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load external systems');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  // Filter systems by search term
  const filteredSystems = systems.filter(system => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      system.SystemName.toLowerCase().includes(search) ||
      system.Vendor.toLowerCase().includes(search) ||
      system.Description?.toLowerCase().includes(search) ||
      system.Category.toLowerCase().includes(search)
    );
  });

  // Handle form input change
  const handleFormChange = (field: keyof CreateExternalSystemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      systemName: '',
      vendor: '',
      category: 'Other',
      description: '',
      baseUrl: '',
      documentationUrl: '',
      contactEmail: '',
      contractExpiry: '',
      status: 'Active',
    });
    setFormError(null);
    setIsEditing(false);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (system: ExternalSystem) => {
    setFormData({
      systemName: system.SystemName,
      vendor: system.Vendor,
      category: system.Category,
      description: system.Description,
      baseUrl: system.BaseUrl,
      documentationUrl: system.DocumentationUrl,
      contactEmail: system.ContactEmail,
      contractExpiry: system.ContractExpiry?.split('T')[0],
      status: system.Status,
    });
    setSelectedSystem(system);
    setIsEditing(true);
    setShowModal(true);
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.systemName || !formData.vendor) {
      setFormError('System name and vendor are required');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    
    try {
      if (isEditing && selectedSystem) {
        const response = await externalSystemsAPI.update(selectedSystem.ExternalSystemId, formData);
        if (!response.success && !response.data) {
          throw new Error(response.error || 'Failed to update system');
        }
      } else {
        const response = await externalSystemsAPI.create(formData as CreateExternalSystemData);
        if (!response.success && !response.data) {
          throw new Error(response.error || 'Failed to create system');
        }
      }
      
      setShowModal(false);
      resetForm();
      loadSystems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save system');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (system: ExternalSystem) => {
    if (!window.confirm(`Are you sure you want to delete "${system.SystemName}"? This may affect integrations using this system.`)) {
      return;
    }
    
    try {
      await externalSystemsAPI.delete(system.ExternalSystemId);
      loadSystems();
      if (selectedSystem?.ExternalSystemId === system.ExternalSystemId) {
        setSelectedSystem(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete system');
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Payment': return '💳';
      case 'CRM': return '👥';
      case 'HR': return '👔';
      case 'Communication': return '📧';
      case 'Analytics': return '📊';
      case 'Security': return '🔐';
      case 'Monitoring': return '📈';
      case 'eCommerce': return '🛒';
      case 'Cloud': return '☁️';
      default: return '🔌';
    }
  };

  // Check if contract is expiring soon (within 90 days)
  const isExpiringsSoon = (expiry?: string) => {
    if (!expiry) return false;
    const expiryDate = new Date(expiry);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  };

  // Check if contract is expired
  const isExpired = (expiry?: string) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  // Render loading state
  if (loading && systems.length === 0) {
    return (
      <div className="external-systems">
        <div className="systems-loading">
          <div className="loading-spinner"></div>
          <p>Loading external systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="external-systems">
      {/* Header */}
      <div className="systems-header">
        <div className="header-title">
          <h2>🏢 External Systems</h2>
          <p>Manage third-party vendors and external system integrations</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Add System
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="systems-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="systems-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search systems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn-secondary" onClick={loadSystems}>
          🔄 Refresh
        </button>
      </div>

      {/* Systems grid */}
      <div className="systems-grid">
        {filteredSystems.length === 0 ? (
          <div className="empty-state">
            <span>🏢</span>
            <p>No external systems found</p>
            <button onClick={openCreateModal}>Add your first system</button>
          </div>
        ) : (
          filteredSystems.map(system => (
            <div 
              key={system.ExternalSystemId} 
              className={`system-card ${selectedSystem?.ExternalSystemId === system.ExternalSystemId ? 'selected' : ''}`}
              onClick={() => setSelectedSystem(system)}
            >
              <div className="card-header">
                <span className="category-icon">{getCategoryIcon(system.Category)}</span>
                <span className={`status-badge ${system.Status.toLowerCase()}`}>
                  {system.Status}
                </span>
              </div>
              
              <h3>{system.SystemName}</h3>
              <p className="vendor">{system.Vendor}</p>
              
              {system.Description && (
                <p className="description">{system.Description}</p>
              )}
              
              <div className="card-meta">
                <span className="category-tag">{system.Category}</span>
                {system.ContractExpiry && (
                  <span className={`contract-expiry ${isExpired(system.ContractExpiry) ? 'expired' : isExpiringsSoon(system.ContractExpiry) ? 'expiring' : ''}`}>
                    📅 {isExpired(system.ContractExpiry) ? 'Expired' : `Expires ${new Date(system.ContractExpiry).toLocaleDateString()}`}
                  </span>
                )}
              </div>
              
              <div className="card-actions">
                {system.DocumentationUrl && (
                  <a 
                    href={system.DocumentationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-link"
                  >
                    📖 Docs
                  </a>
                )}
                <button 
                  className="btn-icon" 
                  onClick={(e) => { e.stopPropagation(); openEditModal(system); }}
                  title="Edit"
                >
                  ✏️
                </button>
                <button 
                  className="btn-icon delete" 
                  onClick={(e) => { e.stopPropagation(); handleDelete(system); }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Panel */}
      {selectedSystem && (
        <div className="detail-overlay" onClick={() => setSelectedSystem(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-title">
                <span className="category-icon-large">{getCategoryIcon(selectedSystem.Category)}</span>
                <div>
                  <h3>{selectedSystem.SystemName}</h3>
                  <p>{selectedSystem.Vendor}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedSystem(null)}>×</button>
            </div>
            
            <div className="detail-content">
              <div className="detail-section">
                <h4>Overview</h4>
                <p>{selectedSystem.Description || 'No description provided'}</p>
              </div>
              
              <div className="detail-section">
                <h4>Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Category</label>
                    <span>{selectedSystem.Category}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`status-badge ${selectedSystem.Status.toLowerCase()}`}>
                      {selectedSystem.Status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Contact</label>
                    <span>{selectedSystem.ContactEmail || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contract Expiry</label>
                    <span className={isExpired(selectedSystem.ContractExpiry) ? 'expired' : isExpiringsSoon(selectedSystem.ContractExpiry) ? 'expiring' : ''}>
                      {selectedSystem.ContractExpiry ? new Date(selectedSystem.ContractExpiry).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>URLs</h4>
                <div className="url-list">
                  {selectedSystem.BaseUrl && (
                    <div className="url-item">
                      <label>Base URL</label>
                      <a href={selectedSystem.BaseUrl} target="_blank" rel="noopener noreferrer">
                        {selectedSystem.BaseUrl}
                      </a>
                    </div>
                  )}
                  {selectedSystem.DocumentationUrl && (
                    <div className="url-item">
                      <label>Documentation</label>
                      <a href={selectedSystem.DocumentationUrl} target="_blank" rel="noopener noreferrer">
                        {selectedSystem.DocumentationUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Metadata</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{new Date(selectedSystem.CreatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Updated</label>
                    <span>{selectedSystem.UpdatedAt ? new Date(selectedSystem.UpdatedAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="detail-actions">
              <button className="btn-primary" onClick={() => openEditModal(selectedSystem)}>
                ✏️ Edit System
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Edit External System' : 'Add External System'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}
              
              <div className="form-group">
                <label>System Name *</label>
                <input
                  type="text"
                  value={formData.systemName || ''}
                  onChange={(e) => handleFormChange('systemName', e.target.value)}
                  placeholder="e.g., Stripe, Salesforce, Twilio"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vendor *</label>
                  <input
                    type="text"
                    value={formData.vendor || ''}
                    onChange={(e) => handleFormChange('vendor', e.target.value)}
                    placeholder="e.g., Stripe Inc."
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={formData.category || 'Other'}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="What does this system do?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="url"
                  value={formData.baseUrl || ''}
                  onChange={(e) => handleFormChange('baseUrl', e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>

              <div className="form-group">
                <label>Documentation URL</label>
                <input
                  type="url"
                  value={formData.documentationUrl || ''}
                  onChange={(e) => handleFormChange('documentationUrl', e.target.value)}
                  placeholder="https://docs.example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Contract Expiry</label>
                  <input
                    type="date"
                    value={formData.contractExpiry || ''}
                    onChange={(e) => handleFormChange('contractExpiry', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select 
                  value={formData.status || 'Active'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add System'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalSystems;
