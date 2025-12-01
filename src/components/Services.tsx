import React, { useState, useEffect } from 'react';
import './Services.css';

interface Service {
  ServiceId: number;
  ServiceName: string;
  Description: string | null;
  BusinessOwner: string | null;
  TechnicalOwner: string | null;
  Criticality: string;
  Status: string;
  SLA: string | null;
  SupportGroup: string | null;
  CiCount: number;
  CreatedDate: string;
}

interface ConfigurationItem {
  CiId: number;
  CiName: string;
  CiType: string;
  Environment: string;
  Status: string;
}

interface ServiceCiMapping {
  MappingId: number;
  ServiceId: number;
  CiId: number;
  CiName: string;
  CiType: string;
  Environment: string;
  CiStatus: string;
  RelationshipType: string;
  IsCritical: boolean;
  Notes: string | null;
}

interface ServiceStats {
  total: number;
  critical: number;
  active: number;
}

const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Active', 'Inactive', 'Planned', 'Retired'];

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [allCis, setAllCis] = useState<ConfigurationItem[]>([]);
  const [linkedCis, setLinkedCis] = useState<ServiceCiMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [stats, setStats] = useState<ServiceStats>({ total: 0, critical: 0, active: 0 });
  const [activeTab, setActiveTab] = useState<'details' | 'cis'>('details');

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    businessOwner: '',
    technicalOwner: '',
    criticality: 'Medium',
    status: 'Active',
    sla: '',
    supportGroupId: ''
  });

  // Add CI form state
  const [addCiForm, setAddCiForm] = useState({
    ciId: '',
    relationshipType: 'Contains',
    isCritical: false,
    notes: ''
  });

  useEffect(() => {
    loadServices();
    loadAllCis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(data.data);
          calculateStats(data.data);
        } else {
          setServices([]);
          calculateStats([]);
        }
      } else {
        setServices([]);
        calculateStats([]);
      }
    } catch (err) {
      console.log('API not available yet, showing empty state');
      setServices([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCis = async () => {
    try {
      const response = await fetch('/api/configuration-items');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllCis(data.data);
        }
      }
    } catch (err) {
      console.log('Error loading CIs');
    }
  };

  const loadLinkedCis = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/service-ci-mappings?serviceId=${serviceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLinkedCis(data.data);
        }
      }
    } catch (err) {
      console.log('Error loading linked CIs');
      setLinkedCis([]);
    }
  };

  const calculateStats = (items: Service[]) => {
    setStats({
      total: items.length,
      critical: items.filter(s => s.Criticality === 'Critical').length,
      active: items.filter(s => s.Status === 'Active').length,
    });
  };

  const getCriticalityClass = (criticality: string): string => {
    switch (criticality) {
      case 'Critical': return 'criticality-critical';
      case 'High': return 'criticality-high';
      case 'Medium': return 'criticality-medium';
      case 'Low': return 'criticality-low';
      default: return '';
    }
  };

  const getCriticalityIcon = (criticality: string): string => {
    switch (criticality) {
      case 'Critical': return '🔴';
      case 'High': return '🟠';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Inactive': return 'status-inactive';
      case 'Planned': return 'status-planned';
      case 'Retired': return 'status-retired';
      default: return '';
    }
  };

  const getTypeIcon = (ciType: string): string => {
    const icons: Record<string, string> = {
      'Server': '🖥️', 'Virtual Machine': '💻', 'Container': '📦',
      'Database': '🗄️', 'Application': '📱', 'Web Server': '🌐',
      'API': '🔌', 'Load Balancer': '⚖️', 'Firewall': '🛡️',
      'Storage': '💾', 'Cloud Service': '☁️', 'SaaS Application': '🌩️'
    };
    return icons[ciType] || '📦';
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.Description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCriticality = !criticalityFilter || service.Criticality === criticalityFilter;
    const matchesStatus = !statusFilter || service.Status === statusFilter;
    return matchesSearch && matchesCriticality && matchesStatus;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({
      serviceName: '',
      description: '',
      businessOwner: '',
      technicalOwner: '',
      criticality: 'Medium',
      status: 'Active',
      sla: '',
      supportGroupId: ''
    });
    setSelectedService(null);
    setLinkedCis([]);
    setActiveTab('details');
    setIsAddModalOpen(true);
  };

  const openEditModal = async (service: Service) => {
    setFormData({
      serviceName: service.ServiceName,
      description: service.Description || '',
      businessOwner: service.BusinessOwner || '',
      technicalOwner: service.TechnicalOwner || '',
      criticality: service.Criticality,
      status: service.Status,
      sla: service.SLA || '',
      supportGroupId: ''
    });
    setSelectedService(service);
    setActiveTab('details');
    setIsAddModalOpen(true);
    await loadLinkedCis(service.ServiceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = selectedService 
        ? `/api/services/${selectedService.ServiceId}`
        : '/api/services';
      
      const method = selectedService ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        loadServices();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save service');
      }
    } catch (err) {
      setError('Failed to save service. API may not be available yet.');
    }
  };

  const handleAddCi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !addCiForm.ciId) return;

    try {
      const response = await fetch('/api/service-ci-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.ServiceId,
          ciId: parseInt(addCiForm.ciId),
          relationshipType: addCiForm.relationshipType,
          isCritical: addCiForm.isCritical,
          notes: addCiForm.notes || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAddCiForm({ ciId: '', relationshipType: 'Contains', isCritical: false, notes: '' });
        await loadLinkedCis(selectedService.ServiceId);
        loadServices(); // Refresh CI count
      } else {
        setError(data.error || 'Failed to link CI');
      }
    } catch (err) {
      setError('Failed to link CI');
    }
  };

  const handleRemoveCi = async (mappingId: number) => {
    if (!selectedService) return;

    try {
      const response = await fetch(`/api/service-ci-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadLinkedCis(selectedService.ServiceId);
        loadServices(); // Refresh CI count
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove CI');
      }
    } catch (err) {
      setError('Failed to remove CI');
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setSelectedService(null);
    setLinkedCis([]);
    setError('');
  };

  // Get CIs that are not already linked
  const availableCis = allCis.filter(
    ci => !linkedCis.some(linked => linked.CiId === ci.CiId)
  );

  return (
    <div className="services-page">
      <div className="services-header">
        <div>
          <h1>Services</h1>
          <p className="services-subtitle">Manage business services and their components</p>
        </div>
        <button className="btn-add-service" onClick={openAddModal}>
          + Add Service
        </button>
      </div>

      {error && !isAddModalOpen && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="services-stats-grid">
        <div className="service-stat-card">
          <h3>Total Services</h3>
          <div className="service-stat-number">{stats.total}</div>
        </div>
        <div className="service-stat-card">
          <h3>Critical Services</h3>
          <div className="service-stat-number critical">{stats.critical}</div>
        </div>
        <div className="service-stat-card">
          <h3>Active Services</h3>
          <div className="service-stat-number active">{stats.active}</div>
        </div>
      </div>

      <div className="services-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={criticalityFilter} onChange={(e) => setCriticalityFilter(e.target.value)}>
          <option value="">All Criticalities</option>
          {CRITICALITIES.map(c => (
            <option key={c} value={c}>{getCriticalityIcon(c)} {c}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="services-table-container">
        {loading ? (
          <div className="loading-state">Loading services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>No Services Found</h3>
            <p>
              {services.length === 0 
                ? 'Get started by adding your first business service.'
                : 'No services match your current filters.'}
            </p>
            {services.length === 0 && (
              <button className="btn-add-service" onClick={openAddModal}>
                + Add Your First Service
              </button>
            )}
          </div>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Criticality</th>
                <th>Status</th>
                <th>Business Owner</th>
                <th>CIs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(service => (
                <tr key={service.ServiceId} onClick={() => openEditModal(service)}>
                  <td className="service-name-cell">
                    <div>
                      <div className="service-name">{service.ServiceName}</div>
                      {service.Description && (
                        <div className="service-description">{service.Description}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`criticality-badge ${getCriticalityClass(service.Criticality)}`}>
                      {getCriticalityIcon(service.Criticality)} {service.Criticality}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(service.Status)}`}>
                      {service.Status}
                    </span>
                  </td>
                  <td>{service.BusinessOwner || '-'}</td>
                  <td>
                    <span className="ci-count">{service.CiCount || 0}</span>
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(service);
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

      {/* Add/Edit Modal with Tabs */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedService ? 'Edit Service' : 'Add Service'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {/* Tabs - only show for existing services */}
            {selectedService && (
              <div className="modal-tabs">
                <button
                  className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  📝 Details
                </button>
                <button
                  className={`modal-tab ${activeTab === 'cis' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cis')}
                >
                  🖥️ Linked CIs
                  <span className="tab-badge">{linkedCis.length}</span>
                </button>
              </div>
            )}

            {error && (
              <div className="modal-error">
                {error}
                <button onClick={() => setError('')}>×</button>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Service Name *</label>
                  <input
                    type="text"
                    name="serviceName"
                    value={formData.serviceName}
                    onChange={handleInputChange}
                    placeholder="e.g., Email System, CRM Platform"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of this service..."
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Criticality *</label>
                    <select
                      name="criticality"
                      value={formData.criticality}
                      onChange={handleInputChange}
                      required
                    >
                      {CRITICALITIES.map(c => (
                        <option key={c} value={c}>{getCriticalityIcon(c)} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Business Owner</label>
                    <input
                      type="email"
                      name="businessOwner"
                      value={formData.businessOwner}
                      onChange={handleInputChange}
                      placeholder="e.g., john@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Technical Owner</label>
                    <input
                      type="email"
                      name="technicalOwner"
                      value={formData.technicalOwner}
                      onChange={handleInputChange}
                      placeholder="e.g., jane@company.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>SLA</label>
                  <input
                    type="text"
                    name="sla"
                    value={formData.sla}
                    onChange={handleInputChange}
                    placeholder="e.g., 99.9% uptime, 4hr response time"
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    {selectedService ? 'Update Service' : 'Add Service'}
                  </button>
                </div>
              </form>
            )}

            {/* Linked CIs Tab */}
            {activeTab === 'cis' && selectedService && (
              <div className="linked-cis-tab">
                {/* Add CI Section */}
                <div className="link-ci-section">
                  <h4>Link a Configuration Item</h4>
                  <div className="link-ci-dropdown">
                    <select
                      value={addCiForm.ciId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          setAddCiForm(prev => ({ ...prev, ciId: value }));
                          // Auto-submit when a CI is selected
                          const form = e.target.closest('.link-ci-section');
                          if (form) {
                            const submitBtn = form.querySelector('.btn-link-ci') as HTMLButtonElement;
                            if (submitBtn) submitBtn.click();
                          }
                        }
                      }}
                    >
                      <option value="">
                        {availableCis.length === 0 
                          ? 'No CIs available to link' 
                          : 'Select a CI to link...'}
                      </option>
                      {availableCis.map(ci => (
                        <option key={ci.CiId} value={ci.CiId}>
                          {ci.CiName} ({ci.CiType} - {ci.Environment})
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="btn-link-ci"
                      style={{ display: 'none' }}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddCi(e as unknown as React.FormEvent);
                      }}
                    >
                      Link
                    </button>
                  </div>
                </div>

                {/* Linked CIs List */}
                <div className="linked-cis-list">
                  <h4>Linked Configuration Items ({linkedCis.length})</h4>
                  {linkedCis.length === 0 ? (
                    <div className="empty-linked-cis">
                      <span className="empty-icon">🔗</span>
                      <p>No Configuration Items linked to this service yet.</p>
                      <p className="empty-hint">Select a CI from the dropdown above to link it.</p>
                    </div>
                  ) : (
                    <div className="linked-cis-grid">
                      {linkedCis.map(mapping => (
                        <div key={mapping.MappingId} className="linked-ci-card">
                          <div className="linked-ci-info">
                            <span className="linked-ci-icon">{getTypeIcon(mapping.CiType)}</span>
                            <div className="linked-ci-details">
                              <span className="linked-ci-name">{mapping.CiName}</span>
                              <span className="linked-ci-meta">
                                {mapping.CiType} • {mapping.Environment}
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn-unlink-ci"
                            onClick={() => handleRemoveCi(mapping.MappingId)}
                            title="Unlink CI"
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

export default Services;
