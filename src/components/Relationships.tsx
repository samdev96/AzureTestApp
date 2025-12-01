import React, { useState, useEffect } from 'react';
import './Relationships.css';

interface Service {
  ServiceId: number;
  ServiceName: string;
  Criticality: string;
}

interface ConfigurationItem {
  CiId: number;
  CiName: string;
  CiType: string;
  Environment: string;
}

interface ServiceCiMapping {
  MappingId: number;
  ServiceId: number;
  ServiceName: string;
  ServiceCriticality: string;
  CiId: number;
  CiName: string;
  CiType: string;
  Environment: string;
  CiStatus: string;
  RelationshipType: string;
  IsCritical: boolean;
  Notes: string | null;
  CreatedDate: string;
}

interface CiRelationship {
  RelationshipId: number;
  SourceCiId: number;
  SourceCiName: string;
  SourceCiType: string;
  SourceEnvironment: string;
  TargetCiId: number;
  TargetCiName: string;
  TargetCiType: string;
  TargetEnvironment: string;
  RelationshipType: string;
  ReverseTypeName: string;
  RelationshipCategory: string;
  Description: string | null;
  CreatedDate: string;
}

interface RelationshipType {
  TypeId: number;
  TypeName: string;
  ReverseTypeName: string;
  Category: string;
  Description: string;
}

const SERVICE_CI_RELATIONSHIP_TYPES = ['Contains', 'DependsOn', 'Uses'];

const Relationships: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'service-ci' | 'ci-ci'>('service-ci');
  const [services, setServices] = useState<Service[]>([]);
  const [configItems, setConfigItems] = useState<ConfigurationItem[]>([]);
  const [serviceCiMappings, setServiceCiMappings] = useState<ServiceCiMapping[]>([]);
  const [ciRelationships, setCiRelationships] = useState<CiRelationship[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isServiceCiModalOpen, setIsServiceCiModalOpen] = useState(false);
  const [isCiCiModalOpen, setIsCiCiModalOpen] = useState(false);

  // Form states
  const [serviceCiForm, setServiceCiForm] = useState({
    serviceId: '',
    ciId: '',
    relationshipType: 'Contains',
    isCritical: false,
    notes: ''
  });

  const [ciCiForm, setCiCiForm] = useState({
    sourceCiId: '',
    targetCiId: '',
    relationshipType: '',
    description: ''
  });

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadServices(),
        loadConfigItems(),
        loadServiceCiMappings(),
        loadCiRelationships(),
        loadRelationshipTypes()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const loadConfigItems = async () => {
    try {
      const response = await fetch('/api/configuration-items');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfigItems(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading config items:', err);
    }
  };

  const loadServiceCiMappings = async () => {
    try {
      const response = await fetch('/api/service-ci-mappings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServiceCiMappings(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading service-ci mappings:', err);
    }
  };

  const loadCiRelationships = async () => {
    try {
      const response = await fetch('/api/ci-relationships');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCiRelationships(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading ci relationships:', err);
    }
  };

  const loadRelationshipTypes = async () => {
    try {
      const response = await fetch('/api/relationship-types');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRelationshipTypes(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading relationship types:', err);
    }
  };

  const handleCreateServiceCiMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/service-ci-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceCiForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsServiceCiModalOpen(false);
        setServiceCiForm({
          serviceId: '',
          ciId: '',
          relationshipType: 'Contains',
          isCritical: false,
          notes: ''
        });
        loadServiceCiMappings();
      } else {
        setError(data.error || 'Failed to create mapping');
      }
    } catch (err) {
      setError('Failed to create mapping');
    }
  };

  const handleCreateCiRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/ci-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ciCiForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsCiCiModalOpen(false);
        setCiCiForm({
          sourceCiId: '',
          targetCiId: '',
          relationshipType: '',
          description: ''
        });
        loadCiRelationships();
      } else {
        setError(data.error || 'Failed to create relationship');
      }
    } catch (err) {
      setError('Failed to create relationship');
    }
  };

  const handleDeleteServiceCiMapping = async (mappingId: number) => {
    if (!window.confirm('Are you sure you want to remove this mapping?')) return;

    try {
      const response = await fetch(`/api/service-ci-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadServiceCiMappings();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete mapping');
      }
    } catch (err) {
      setError('Failed to delete mapping');
    }
  };

  const handleDeleteCiRelationship = async (relationshipId: number) => {
    if (!window.confirm('Are you sure you want to remove this relationship?')) return;

    try {
      const response = await fetch(`/api/ci-relationships/${relationshipId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadCiRelationships();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete relationship');
      }
    } catch (err) {
      setError('Failed to delete relationship');
    }
  };

  const getTypeIcon = (ciType: string): string => {
    const icons: Record<string, string> = {
      'Server': '🖥️',
      'Virtual Machine': '💻',
      'Container': '📦',
      'Database': '🗄️',
      'Application': '📱',
      'Web Server': '🌐',
      'API': '🔌',
      'Load Balancer': '⚖️',
      'Firewall': '🛡️',
      'Storage': '💾',
      'Cloud Service': '☁️',
      'SaaS Application': '🌩️'
    };
    return icons[ciType] || '📦';
  };

  const getCriticalityIcon = (criticality: string): string => {
    const icons: Record<string, string> = {
      'Critical': '🔴',
      'High': '🟠',
      'Medium': '🟡',
      'Low': '🟢'
    };
    return icons[criticality] || '⚪';
  };

  return (
    <div className="relationships-page">
      <div className="relationships-header">
        <div>
          <h1>Relationships</h1>
          <p className="relationships-subtitle">Manage connections between Services and Configuration Items</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="relationships-tabs">
        <button 
          className={`tab-button ${activeTab === 'service-ci' ? 'active' : ''}`}
          onClick={() => setActiveTab('service-ci')}
        >
          🏢 Service → CI Mappings
          <span className="tab-count">{serviceCiMappings.length}</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'ci-ci' ? 'active' : ''}`}
          onClick={() => setActiveTab('ci-ci')}
        >
          🔗 CI → CI Relationships
          <span className="tab-count">{ciRelationships.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading relationships...</div>
      ) : (
        <>
          {/* Service-CI Mappings Tab */}
          {activeTab === 'service-ci' && (
            <div className="tab-content">
              <div className="tab-header">
                <p>Link Configuration Items to Business Services to show which infrastructure supports which services.</p>
                <button className="btn-add" onClick={() => setIsServiceCiModalOpen(true)}>
                  + Add Mapping
                </button>
              </div>

              {serviceCiMappings.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔗</div>
                  <h3>No Service-CI Mappings</h3>
                  <p>Start by linking a Configuration Item to a Service.</p>
                  <button className="btn-add" onClick={() => setIsServiceCiModalOpen(true)}>
                    + Create First Mapping
                  </button>
                </div>
              ) : (
                <div className="relationships-grid">
                  {serviceCiMappings.map(mapping => (
                    <div key={mapping.MappingId} className="relationship-card service-ci-card">
                      <div className="card-header">
                        <span className={`criticality-dot ${mapping.ServiceCriticality.toLowerCase()}`}>
                          {getCriticalityIcon(mapping.ServiceCriticality)}
                        </span>
                        <span className="service-name">{mapping.ServiceName}</span>
                        {mapping.IsCritical && <span className="critical-badge">Critical</span>}
                      </div>
                      <div className="card-arrow">
                        <span className="relationship-label">{mapping.RelationshipType}</span>
                        <span className="arrow">→</span>
                      </div>
                      <div className="card-target">
                        <span className="ci-icon">{getTypeIcon(mapping.CiType)}</span>
                        <div className="ci-details">
                          <span className="ci-name">{mapping.CiName}</span>
                          <span className="ci-meta">{mapping.CiType} • {mapping.Environment}</span>
                        </div>
                      </div>
                      {mapping.Notes && (
                        <div className="card-notes">📝 {mapping.Notes}</div>
                      )}
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteServiceCiMapping(mapping.MappingId)}
                        title="Remove mapping"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CI-CI Relationships Tab */}
          {activeTab === 'ci-ci' && (
            <div className="tab-content">
              <div className="tab-header">
                <p>Define dependencies and connections between Configuration Items.</p>
                <button className="btn-add" onClick={() => setIsCiCiModalOpen(true)}>
                  + Add Relationship
                </button>
              </div>

              {ciRelationships.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔀</div>
                  <h3>No CI Relationships</h3>
                  <p>Define how your Configuration Items relate to each other.</p>
                  <button className="btn-add" onClick={() => setIsCiCiModalOpen(true)}>
                    + Create First Relationship
                  </button>
                </div>
              ) : (
                <div className="relationships-grid">
                  {ciRelationships.map(rel => (
                    <div key={rel.RelationshipId} className="relationship-card ci-ci-card">
                      <div className="card-source">
                        <span className="ci-icon">{getTypeIcon(rel.SourceCiType)}</span>
                        <div className="ci-details">
                          <span className="ci-name">{rel.SourceCiName}</span>
                          <span className="ci-meta">{rel.SourceCiType} • {rel.SourceEnvironment}</span>
                        </div>
                      </div>
                      <div className="card-arrow">
                        <span className="relationship-label">{rel.RelationshipType}</span>
                        <span className="arrow">→</span>
                      </div>
                      <div className="card-target">
                        <span className="ci-icon">{getTypeIcon(rel.TargetCiType)}</span>
                        <div className="ci-details">
                          <span className="ci-name">{rel.TargetCiName}</span>
                          <span className="ci-meta">{rel.TargetCiType} • {rel.TargetEnvironment}</span>
                        </div>
                      </div>
                      {rel.Description && (
                        <div className="card-notes">📝 {rel.Description}</div>
                      )}
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteCiRelationship(rel.RelationshipId)}
                        title="Remove relationship"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Service-CI Mapping Modal */}
      {isServiceCiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsServiceCiModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Service-CI Mapping</h2>
              <button className="modal-close" onClick={() => setIsServiceCiModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateServiceCiMapping}>
              <div className="form-group">
                <label>Service *</label>
                <select
                  value={serviceCiForm.serviceId}
                  onChange={(e) => setServiceCiForm(prev => ({ ...prev, serviceId: e.target.value }))}
                  required
                >
                  <option value="">Select a service...</option>
                  {services.map(s => (
                    <option key={s.ServiceId} value={s.ServiceId}>
                      {getCriticalityIcon(s.Criticality)} {s.ServiceName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Configuration Item *</label>
                <select
                  value={serviceCiForm.ciId}
                  onChange={(e) => setServiceCiForm(prev => ({ ...prev, ciId: e.target.value }))}
                  required
                >
                  <option value="">Select a CI...</option>
                  {configItems.map(ci => (
                    <option key={ci.CiId} value={ci.CiId}>
                      {getTypeIcon(ci.CiType)} {ci.CiName} ({ci.Environment})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Relationship Type</label>
                  <select
                    value={serviceCiForm.relationshipType}
                    onChange={(e) => setServiceCiForm(prev => ({ ...prev, relationshipType: e.target.value }))}
                  >
                    {SERVICE_CI_RELATIONSHIP_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={serviceCiForm.isCritical}
                      onChange={(e) => setServiceCiForm(prev => ({ ...prev, isCritical: e.target.checked }))}
                    />
                    Critical to Service
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={serviceCiForm.notes}
                  onChange={(e) => setServiceCiForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about this mapping..."
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsServiceCiModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Create Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CI-CI Relationship Modal */}
      {isCiCiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCiCiModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add CI Relationship</h2>
              <button className="modal-close" onClick={() => setIsCiCiModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCiRelationship}>
              <div className="form-group">
                <label>Source CI *</label>
                <select
                  value={ciCiForm.sourceCiId}
                  onChange={(e) => setCiCiForm(prev => ({ ...prev, sourceCiId: e.target.value }))}
                  required
                >
                  <option value="">Select source CI...</option>
                  {configItems.map(ci => (
                    <option key={ci.CiId} value={ci.CiId}>
                      {getTypeIcon(ci.CiType)} {ci.CiName} ({ci.Environment})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Relationship Type *</label>
                <select
                  value={ciCiForm.relationshipType}
                  onChange={(e) => setCiCiForm(prev => ({ ...prev, relationshipType: e.target.value }))}
                  required
                >
                  <option value="">Select relationship type...</option>
                  {relationshipTypes.map(type => (
                    <option key={type.TypeId} value={type.TypeName}>
                      {type.TypeName} ({type.Category})
                    </option>
                  ))}
                </select>
                {ciCiForm.relationshipType && (
                  <span className="form-hint">
                    {relationshipTypes.find(t => t.TypeName === ciCiForm.relationshipType)?.Description}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Target CI *</label>
                <select
                  value={ciCiForm.targetCiId}
                  onChange={(e) => setCiCiForm(prev => ({ ...prev, targetCiId: e.target.value }))}
                  required
                >
                  <option value="">Select target CI...</option>
                  {configItems
                    .filter(ci => ci.CiId.toString() !== ciCiForm.sourceCiId)
                    .map(ci => (
                      <option key={ci.CiId} value={ci.CiId}>
                        {getTypeIcon(ci.CiType)} {ci.CiName} ({ci.Environment})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={ciCiForm.description}
                  onChange={(e) => setCiCiForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this relationship..."
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsCiCiModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Create Relationship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relationships;
