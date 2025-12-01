import React, { useState, useEffect, useCallback } from 'react';
import './ConfigurationItems.css';

interface ConfigurationItem {
  CiId: number;
  CiName: string;
  CiType: string;
  SubType: string | null;
  Status: string;
  Environment: string;
  Location: string | null;
  IpAddress: string | null;
  Hostname: string | null;
  Version: string | null;
  Vendor: string | null;
  SupportGroupId: number | null;
  SupportGroup: string | null;
  Owner: string | null;
  Description: string | null;
  Attributes: string | null;
  SerialNumber: string | null;
  AssetTag: string | null;
  PurchaseDate: string | null;
  ExpiryDate: string | null;
  Cost: number | null;
  CreatedDate: string;
  ModifiedDate: string;
}

interface AssignmentGroup {
  AssignmentGroupID: number;
  GroupName: string;
}

interface CiType {
  TypeId: number;
  TypeName: string;
  Category: string;
  Icon: string | null;
}

interface LinkedService {
  MappingId: number;
  ServiceId: number;
  ServiceName: string;
  LinkedAt: string;
}

interface RelatedCI {
  RelationshipId: number;
  RelatedCiId: number;
  RelatedCiName: string;
  RelatedCiType: string;
  RelationshipType: string;
  Direction: 'outgoing' | 'incoming';
  CreatedAt: string;
}

interface AvailableService {
  ServiceId: number;
  ServiceName: string;
}

interface AvailableCIForRelation {
  CiId: number;
  CiName: string;
  CiType: string;
}

interface RelationshipType {
  TypeId: number;
  TypeName: string;
  ReverseTypeName: string;
  Category: string;
  Description: string;
}

interface CiStats {
  total: number;
  active: number;
  production: number;
}

const ConfigurationItems: React.FC = () => {
  const [cis, setCis] = useState<ConfigurationItem[]>([]);
  const [ciTypes, setCiTypes] = useState<CiType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCi, setEditingCi] = useState<ConfigurationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'services' | 'relationships'>('details');
  const [stats, setStats] = useState<CiStats>({ total: 0, active: 0, production: 0 });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ciTypeId: '',
    subType: '',
    status: 'Active',
    environment: 'Production',
    location: '',
    ipAddress: '',
    hostname: '',
    version: '',
    vendor: '',
    supportGroupId: '',
    owner: '',
    description: '',
    serialNumber: '',
    assetTag: '',
    purchaseDate: '',
    expiryDate: '',
    cost: '',
    attributes: ''
  });

  // Assignment groups for dropdown
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);

  // Linked services state
  const [linkedServices, setLinkedServices] = useState<LinkedService[]>([]);
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Related CIs state
  const [relatedCIs, setRelatedCIs] = useState<RelatedCI[]>([]);
  const [availableCIs, setAvailableCIs] = useState<AvailableCIForRelation[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [selectedRelatedCiId, setSelectedRelatedCiId] = useState<string>('');
  const [selectedRelationshipTypeId, setSelectedRelationshipTypeId] = useState<string>('');
  const [relationsLoading, setRelationsLoading] = useState(false);

  const statuses = ['Active', 'Inactive', 'Maintenance', 'Decommissioned'];
  const environments = ['Production', 'Staging', 'Development', 'Testing', 'DR'];

  const loadCIs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuration-items');
      if (!response.ok) throw new Error('Failed to load configuration items');
      const data = await response.json();
      // API returns { success: true, data: [...] }
      const items = data.data || [];
      setCis(items);
      // Calculate stats
      setStats({
        total: items.length,
        active: items.filter((ci: ConfigurationItem) => ci.Status === 'Active').length,
        production: items.filter((ci: ConfigurationItem) => ci.Environment === 'Production').length
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration items');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCiTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/ci-types');
      if (!response.ok) throw new Error('Failed to load CI types');
      const data = await response.json();
      setCiTypes(data.data || []);
    } catch (err) {
      console.error('Failed to load CI types:', err);
    }
  }, []);

  const loadAssignmentGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/assignment-groups');
      if (!response.ok) throw new Error('Failed to load assignment groups');
      const data = await response.json();
      // API returns { success: true, data: [...] }
      setAssignmentGroups(data.data || []);
    } catch (err) {
      console.error('Failed to load assignment groups:', err);
    }
  }, []);

  const loadLinkedServices = useCallback(async (ciId: number) => {
    try {
      setServicesLoading(true);
      const response = await fetch(`/api/service-ci-mappings?ciId=${ciId}`);
      if (!response.ok) throw new Error('Failed to load linked services');
      const data = await response.json();
      
      const services: LinkedService[] = (data.mappings || []).map((m: { MappingId: number; ServiceId: number; ServiceName: string; CreatedAt: string }) => ({
        MappingId: m.MappingId,
        ServiceId: m.ServiceId,
        ServiceName: m.ServiceName,
        LinkedAt: m.CreatedAt
      }));
      setLinkedServices(services);
    } catch (err) {
      console.error('Failed to load linked services:', err);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadAvailableServices = useCallback(async (ciId: number) => {
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to load services');
      const data = await response.json();
      
      // Get currently linked service IDs
      const linkedIds = linkedServices.map(s => s.ServiceId);
      
      // Filter out already linked services
      const available = (data.data || [])
        .filter((s: AvailableService) => !linkedIds.includes(s.ServiceId))
        .map((s: AvailableService) => ({ ServiceId: s.ServiceId, ServiceName: s.ServiceName }));
      
      setAvailableServices(available);
    } catch (err) {
      console.error('Failed to load available services:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedServices]);

  const loadRelatedCIs = useCallback(async (ciId: number) => {
    try {
      setRelationsLoading(true);
      const response = await fetch(`/api/ci-relationships?ciId=${ciId}`);
      if (!response.ok) throw new Error('Failed to load related CIs');
      const data = await response.json();
      
      const relations: RelatedCI[] = (data.relationships || []).map((r: {
        RelationshipId: number;
        SourceCiId: number;
        SourceCiName: string;
        SourceCiType: string;
        TargetCiId: number;
        TargetCiName: string;
        TargetCiType: string;
        RelationshipType: string;
        CreatedAt: string;
      }) => {
        // Determine direction based on whether this CI is source or target
        const isSource = r.SourceCiId === ciId;
        return {
          RelationshipId: r.RelationshipId,
          RelatedCiId: isSource ? r.TargetCiId : r.SourceCiId,
          RelatedCiName: isSource ? r.TargetCiName : r.SourceCiName,
          RelatedCiType: isSource ? r.TargetCiType : r.SourceCiType,
          RelationshipType: r.RelationshipType,
          Direction: isSource ? 'outgoing' : 'incoming' as 'outgoing' | 'incoming',
          CreatedAt: r.CreatedAt
        };
      });
      setRelatedCIs(relations);
    } catch (err) {
      console.error('Failed to load related CIs:', err);
    } finally {
      setRelationsLoading(false);
    }
  }, []);

  const loadAvailableCIsForRelation = useCallback(async (ciId: number) => {
    try {
      const response = await fetch('/api/configuration-items');
      if (!response.ok) throw new Error('Failed to load CIs');
      const data = await response.json();
      
      // Get currently related CI IDs
      const relatedIds = relatedCIs.map(r => r.RelatedCiId);
      
      // Filter out the current CI and already related CIs
      // API returns data.data array with CiId, CiName, CiType fields
      const available = (data.data || [])
        .filter((c: ConfigurationItem) => c.CiId !== ciId && !relatedIds.includes(c.CiId))
        .map((c: ConfigurationItem) => ({ CiId: c.CiId, CiName: c.CiName, CiType: c.CiType }));
      
      setAvailableCIs(available);
    } catch (err) {
      console.error('Failed to load available CIs:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedCIs]);

  const loadRelationshipTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/relationship-types');
      if (!response.ok) throw new Error('Failed to load relationship types');
      const data = await response.json();
      // API returns { success: true, data: [...] }
      setRelationshipTypes(data.data || []);
    } catch (err) {
      console.error('Failed to load relationship types:', err);
    }
  }, []);

  useEffect(() => {
    loadCIs();
    loadCiTypes();
    loadRelationshipTypes();
    loadAssignmentGroups();
  }, [loadCIs, loadCiTypes, loadRelationshipTypes, loadAssignmentGroups]);

  useEffect(() => {
    if (editingCi && activeTab === 'services') {
      loadLinkedServices(editingCi.CiId);
    }
  }, [editingCi, activeTab, loadLinkedServices]);

  useEffect(() => {
    if (editingCi && activeTab === 'services' && linkedServices.length >= 0) {
      loadAvailableServices(editingCi.CiId);
    }
  }, [editingCi, activeTab, linkedServices, loadAvailableServices]);

  useEffect(() => {
    if (editingCi && activeTab === 'relationships') {
      loadRelatedCIs(editingCi.CiId);
    }
  }, [editingCi, activeTab, loadRelatedCIs]);

  useEffect(() => {
    if (editingCi && activeTab === 'relationships' && relatedCIs.length >= 0) {
      loadAvailableCIsForRelation(editingCi.CiId);
    }
  }, [editingCi, activeTab, relatedCIs, loadAvailableCIsForRelation]);

  const handleOpenModal = (ci?: ConfigurationItem) => {
    if (ci) {
      setEditingCi(ci);
      const ciType = ciTypes.find(t => t.TypeName === ci.CiType);
      setFormData({
        name: ci.CiName,
        ciTypeId: ciType ? ciType.TypeId.toString() : '',
        subType: ci.SubType || '',
        status: ci.Status,
        environment: ci.Environment,
        location: ci.Location || '',
        ipAddress: ci.IpAddress || '',
        hostname: ci.Hostname || '',
        version: ci.Version || '',
        vendor: ci.Vendor || '',
        supportGroupId: ci.SupportGroupId?.toString() || '',
        owner: ci.Owner || '',
        description: ci.Description || '',
        serialNumber: ci.SerialNumber || '',
        assetTag: ci.AssetTag || '',
        purchaseDate: ci.PurchaseDate ? ci.PurchaseDate.split('T')[0] : '',
        expiryDate: ci.ExpiryDate ? ci.ExpiryDate.split('T')[0] : '',
        cost: ci.Cost?.toString() || '',
        attributes: ci.Attributes || ''
      });
      setActiveTab('details');
    } else {
      setEditingCi(null);
      setFormData({
        name: '',
        ciTypeId: ciTypes.length > 0 ? ciTypes[0].TypeId.toString() : '',
        subType: '',
        status: 'Active',
        environment: 'Production',
        location: '',
        ipAddress: '',
        hostname: '',
        version: '',
        vendor: '',
        supportGroupId: '',
        owner: '',
        description: '',
        serialNumber: '',
        assetTag: '',
        purchaseDate: '',
        expiryDate: '',
        cost: '',
        attributes: ''
      });
      setActiveTab('details');
    }
    setLinkedServices([]);
    setAvailableServices([]);
    setRelatedCIs([]);
    setAvailableCIs([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCi(null);
    setFormData({
      name: '',
      ciTypeId: '',
      subType: '',
      status: 'Active',
      environment: 'Production',
      location: '',
      ipAddress: '',
      hostname: '',
      version: '',
      vendor: '',
      supportGroupId: '',
      owner: '',
      description: '',
      serialNumber: '',
      assetTag: '',
      purchaseDate: '',
      expiryDate: '',
      cost: '',
      attributes: ''
    });
    setActiveTab('details');
    setLinkedServices([]);
    setAvailableServices([]);
    setRelatedCIs([]);
    setAvailableCIs([]);
    setSelectedRelatedCiId('');
    setSelectedRelationshipTypeId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get the selected CI type name from ID
      const selectedType = ciTypes.find(t => t.TypeId.toString() === formData.ciTypeId);
      
      const url = editingCi 
        ? `/api/configuration-items/${editingCi.CiId}` 
        : '/api/configuration-items';
      
      const response = await fetch(url, {
        method: editingCi ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciName: formData.name,
          ciType: selectedType?.TypeName || '',
          subType: formData.subType || null,
          status: formData.status,
          environment: formData.environment,
          location: formData.location || null,
          ipAddress: formData.ipAddress || null,
          hostname: formData.hostname || null,
          version: formData.version || null,
          vendor: formData.vendor || null,
          supportGroupId: formData.supportGroupId ? parseInt(formData.supportGroupId) : null,
          owner: formData.owner || null,
          description: formData.description || null,
          serialNumber: formData.serialNumber || null,
          assetTag: formData.assetTag || null,
          purchaseDate: formData.purchaseDate || null,
          expiryDate: formData.expiryDate || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          attributes: formData.attributes ? JSON.parse(formData.attributes) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration item');
      }

      handleCloseModal();
      loadCIs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration item');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this configuration item?')) return;
    
    try {
      const response = await fetch(`/api/configuration-items/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete configuration item');
      }

      loadCIs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration item');
    }
  };

  const handleLinkService = async (serviceId: number) => {
    if (!editingCi) return;
    
    try {
      const response = await fetch('/api/service-ci-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: serviceId,
          ciId: editingCi.CiId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link service');
      }

      // Reload linked services
      loadLinkedServices(editingCi.CiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link service');
    }
  };

  const handleUnlinkService = async (mappingId: number) => {
    if (!editingCi) return;
    
    try {
      const response = await fetch(`/api/service-ci-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unlink service');
      }

      // Reload linked services
      loadLinkedServices(editingCi.CiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink service');
    }
  };

  const handleAddRelationship = async () => {
    if (!editingCi || !selectedRelatedCiId || !selectedRelationshipTypeId) return;
    
    try {
      const response = await fetch('/api/ci-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCiId: editingCi.CiId,
          targetCiId: parseInt(selectedRelatedCiId),
          relationshipType: selectedRelationshipTypeId // API expects type name, not ID
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add relationship');
      }

      // Reset selection and reload
      setSelectedRelatedCiId('');
      setSelectedRelationshipTypeId('');
      loadRelatedCIs(editingCi.CiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add relationship');
    }
  };

  const handleRemoveRelationship = async (relationshipId: number) => {
    if (!editingCi) return;
    
    try {
      const response = await fetch(`/api/ci-relationships/${relationshipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove relationship');
      }

      loadRelatedCIs(editingCi.CiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove relationship');
    }
  };

  const filteredCIs = cis.filter(ci => {
    const matchesSearch = ci.CiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ci.Description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || ci.CiType === filterType;
    const matchesStatus = !filterStatus || ci.Status === filterStatus;
    const matchesEnvironment = !filterEnvironment || ci.Environment === filterEnvironment;
    return matchesSearch && matchesType && matchesStatus && matchesEnvironment;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active': return 'status-badge status-active';
      case 'Inactive': return 'status-badge status-inactive';
      case 'Maintenance': return 'status-badge status-maintenance';
      case 'Decommissioned': return 'status-badge status-decommissioned';
      default: return 'status-badge';
    }
  };

  const getEnvironmentBadgeClass = (env: string) => {
    switch (env) {
      case 'Production': return 'env-badge env-production';
      case 'Staging': return 'env-badge env-staging';
      case 'Development': return 'env-badge env-development';
      case 'Testing': return 'env-badge env-testing';
      case 'DR': return 'env-badge env-dr';
      default: return 'env-badge';
    }
  };

  const getCiTypeIcon = (type: string) => {
    switch (type) {
      case 'Server': return '🖥️';
      case 'Database': return '🗄️';
      case 'Application': return '📱';
      case 'Network Device': return '🌐';
      case 'Storage': return '💾';
      case 'Virtual Machine': return '☁️';
      case 'Container': return '📦';
      case 'Load Balancer': return '⚖️';
      default: return '⚙️';
    }
  };

  if (loading) {
    return (
      <div className="ci-page">
        <div className="loading-spinner">Loading configuration items...</div>
      </div>
    );
  }

  return (
    <div className="ci-page">
      <div className="ci-header">
        <div>
          <h1>Configuration Items</h1>
          <p className="ci-subtitle">Manage your IT assets and configuration items</p>
        </div>
        <button className="btn-add-ci" onClick={() => handleOpenModal()}>
          + New CI
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="ci-stats-grid">
        <div className="ci-stat-card">
          <h3>Total CIs</h3>
          <div className="ci-stat-number">{stats.total}</div>
        </div>
        <div className="ci-stat-card">
          <h3>Active CIs</h3>
          <div className="ci-stat-number active">{stats.active}</div>
        </div>
        <div className="ci-stat-card">
          <h3>Production CIs</h3>
          <div className="ci-stat-number production">{stats.production}</div>
        </div>
      </div>

      <div className="ci-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search configuration items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {ciTypes.map(type => (
            <option key={type.TypeId} value={type.TypeName}>{type.TypeName}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select
          value={filterEnvironment}
          onChange={(e) => setFilterEnvironment(e.target.value)}
        >
          <option value="">All Environments</option>
          {environments.map(env => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
      </div>

      <div className="ci-table-container">
        {filteredCIs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">⚙️</span>
            <h3>No Configuration Items Found</h3>
            <p>
              {cis.length === 0 
                ? 'Get started by adding your first configuration item.'
                : 'No CIs match your current filters.'}
            </p>
            {cis.length === 0 && (
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                + Add Your First CI
              </button>
            )}
          </div>
        ) : (
          <table className="ci-table">
            <thead>
              <tr>
                <th>CI Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Environment</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCIs.map(ci => (
                <tr key={ci.CiId} onClick={() => handleOpenModal(ci)}>
                  <td className="ci-name-cell">
                    <div className="ci-name-wrapper">
                      <span className="ci-type-icon">{getCiTypeIcon(ci.CiType)}</span>
                      <div>
                        <div className="ci-name">{ci.CiName}</div>
                        {ci.Description && (
                          <div className="ci-description">{ci.Description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="ci-type-badge">{ci.CiType}</span>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(ci.Status)}>{ci.Status}</span>
                  </td>
                  <td>
                    <span className={getEnvironmentBadgeClass(ci.Environment)}>{ci.Environment}</span>
                  </td>
                  <td className="ci-date">
                    {ci.ModifiedDate ? new Date(ci.ModifiedDate).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(ci);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCi ? 'Edit Configuration Item' : 'New Configuration Item'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            {editingCi && (
              <div className="modal-tabs">
                <button 
                  className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button 
                  className={`modal-tab ${activeTab === 'services' ? 'active' : ''}`}
                  onClick={() => setActiveTab('services')}
                >
                  Linked Services ({linkedServices.length})
                </button>
                <button 
                  className={`modal-tab ${activeTab === 'relationships' ? 'active' : ''}`}
                  onClick={() => setActiveTab('relationships')}
                >
                  Related CIs ({relatedCIs.length})
                </button>
              </div>
            )}

            {activeTab === 'details' && (
              <form onSubmit={handleSubmit} className="modal-form ci-form-expanded">
                <div className="form-section">
                  <h4 className="form-section-title">Basic Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        placeholder="e.g., PROD-WEB-01"
                      />
                    </div>
                    <div className="form-group">
                      <label>CI Type *</label>
                      <select
                        value={formData.ciTypeId}
                        onChange={(e) => setFormData({...formData, ciTypeId: e.target.value})}
                        required
                      >
                        <option value="">Select Type</option>
                        {ciTypes.map(type => (
                          <option key={type.TypeId} value={type.TypeId}>{type.TypeName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Sub Type</label>
                      <input
                        type="text"
                        value={formData.subType}
                        onChange={(e) => setFormData({...formData, subType: e.target.value})}
                        placeholder="e.g., Windows Server 2022, PostgreSQL 15"
                      />
                    </div>
                    <div className="form-group">
                      <label>Version</label>
                      <input
                        type="text"
                        value={formData.version}
                        onChange={(e) => setFormData({...formData, version: e.target.value})}
                        placeholder="e.g., 2.1.0, 15.4"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Environment</label>
                      <select
                        value={formData.environment}
                        onChange={(e) => setFormData({...formData, environment: e.target.value})}
                      >
                        {environments.map(env => (
                          <option key={env} value={env}>{env}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={2}
                      placeholder="Describe this configuration item..."
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">Network & Location</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Hostname</label>
                      <input
                        type="text"
                        value={formData.hostname}
                        onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                        placeholder="e.g., srv-web-01.company.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>IP Address</label>
                      <input
                        type="text"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                        placeholder="e.g., 10.0.0.50"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="e.g., Azure East US, On-Prem DC1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Vendor</label>
                      <input
                        type="text"
                        value={formData.vendor}
                        onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                        placeholder="e.g., Microsoft, Oracle, AWS"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">Ownership & Support</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Owner</label>
                      <input
                        type="email"
                        value={formData.owner}
                        onChange={(e) => setFormData({...formData, owner: e.target.value})}
                        placeholder="e.g., john.doe@company.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Support Group</label>
                      <select
                        value={formData.supportGroupId}
                        onChange={(e) => setFormData({...formData, supportGroupId: e.target.value})}
                      >
                        <option value="">Select Support Group</option>
                        {assignmentGroups.map(group => (
                          <option key={group.AssignmentGroupID} value={group.AssignmentGroupID}>
                            {group.GroupName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">Asset Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Serial Number</label>
                      <input
                        type="text"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                        placeholder="e.g., ABC123XYZ"
                      />
                    </div>
                    <div className="form-group">
                      <label>Asset Tag</label>
                      <input
                        type="text"
                        value={formData.assetTag}
                        onChange={(e) => setFormData({...formData, assetTag: e.target.value})}
                        placeholder="e.g., ASSET-001234"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Purchase Date</label>
                      <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiry/Warranty Date</label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData({...formData, cost: e.target.value})}
                        placeholder="e.g., 5000.00"
                      />
                    </div>
                    <div className="form-group">
                      {/* Empty for layout */}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">Custom Attributes (JSON)</h4>
                  <div className="form-group">
                    <textarea
                      value={formData.attributes}
                      onChange={(e) => setFormData({...formData, attributes: e.target.value})}
                      rows={3}
                      placeholder='{"cpu": "4 vCPU", "ram": "16GB", "disk": "500GB SSD"}'
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCi ? 'Update CI' : 'Create CI'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'services' && editingCi && (
              <div className="linked-items-tab">
                <div className="link-section">
                  <h3>Add Service Link</h3>
                  <div className="link-controls">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleLinkService(parseInt(e.target.value));
                        }
                      }}
                      disabled={availableServices.length === 0}
                    >
                      <option value="">
                        {availableServices.length === 0 
                          ? 'No services available to link' 
                          : 'Select a service to link...'}
                      </option>
                      {availableServices.map(service => (
                        <option key={service.ServiceId} value={service.ServiceId}>
                          {service.ServiceName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="linked-items-list">
                  <h3>Linked Services</h3>
                  {servicesLoading ? (
                    <div className="loading-inline">Loading services...</div>
                  ) : linkedServices.length === 0 ? (
                    <div className="empty-links">
                      <p>This CI is not linked to any services yet.</p>
                    </div>
                  ) : (
                    <div className="linked-items-grid">
                      {linkedServices.map(service => (
                        <div key={service.MappingId} className="linked-item-card">
                          <div className="linked-item-info">
                            <span className="linked-item-icon">🏢</span>
                            <div className="linked-item-details">
                              <span className="linked-item-name">{service.ServiceName}</span>
                              <span className="linked-item-date">
                                Linked: {new Date(service.LinkedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button 
                            className="btn-unlink"
                            onClick={() => handleUnlinkService(service.MappingId)}
                            title="Unlink service"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'relationships' && editingCi && (
              <div className="linked-items-tab">
                <div className="link-section">
                  <h3>Add CI Relationship</h3>
                  <div className="relationship-controls">
                    <select
                      value={selectedRelatedCiId}
                      onChange={(e) => setSelectedRelatedCiId(e.target.value)}
                      disabled={availableCIs.length === 0}
                    >
                      <option value="">
                        {availableCIs.length === 0 
                          ? 'No CIs available to relate' 
                          : 'Select a CI...'}
                      </option>
                      {availableCIs.map(ci => (
                        <option key={ci.CiId} value={ci.CiId}>
                          {ci.CiName} ({ci.CiType})
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedRelationshipTypeId}
                      onChange={(e) => setSelectedRelationshipTypeId(e.target.value)}
                      disabled={!selectedRelatedCiId}
                    >
                      <option value="">Select relationship type...</option>
                      {relationshipTypes.map(rt => (
                        <option key={rt.TypeId} value={rt.TypeName}>
                          {rt.TypeName}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-primary"
                      onClick={handleAddRelationship}
                      disabled={!selectedRelatedCiId || !selectedRelationshipTypeId}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="linked-items-list">
                  <h3>Related CIs</h3>
                  {relationsLoading ? (
                    <div className="loading-inline">Loading relationships...</div>
                  ) : relatedCIs.length === 0 ? (
                    <div className="empty-links">
                      <p>This CI has no relationships with other CIs yet.</p>
                    </div>
                  ) : (
                    <div className="linked-items-grid">
                      {relatedCIs.map(rel => (
                        <div key={rel.RelationshipId} className="linked-item-card relationship-card">
                          <div className="linked-item-info">
                            <span className="linked-item-icon">{getCiTypeIcon(rel.RelatedCiType)}</span>
                            <div className="linked-item-details">
                              <span className="linked-item-name">{rel.RelatedCiName}</span>
                              <span className="relationship-type">
                                {rel.Direction === 'outgoing' ? '→' : '←'} {rel.RelationshipType}
                              </span>
                              <span className="linked-item-meta">{rel.RelatedCiType}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-unlink"
                            onClick={() => handleRemoveRelationship(rel.RelationshipId)}
                            title="Remove relationship"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationItems;
