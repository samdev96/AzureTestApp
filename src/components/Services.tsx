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

interface ServiceStats {
  total: number;
  critical: number;
  active: number;
}

const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Active', 'Inactive', 'Planned', 'Retired'];

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [stats, setStats] = useState<ServiceStats>({ total: 0, critical: 0, active: 0 });

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

  useEffect(() => {
    loadServices();
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
    setIsAddModalOpen(true);
  };

  const openEditModal = (service: Service) => {
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
    setIsAddModalOpen(true);
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

  const closeModal = () => {
    setIsAddModalOpen(false);
    setSelectedService(null);
    setError('');
  };

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

      {error && (
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

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedService ? 'Edit Service' : 'Add Service'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
