import React, { useState, useEffect } from 'react';
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
  Owner: string | null;
  Description: string | null;
  SupportGroup: string | null;
  ServiceCount: number;
  RelationshipCount: number;
  CreatedDate: string;
}

interface CiType {
  TypeId: number;
  TypeName: string;
  Category: string;
  Icon: string;
}

interface CiStats {
  total: number;
  servers: number;
  applications: number;
  databases: number;
}

const CI_TYPES: CiType[] = [
  { TypeId: 1, TypeName: 'Server', Category: 'Hardware', Icon: '🖥️' },
  { TypeId: 2, TypeName: 'Virtual Machine', Category: 'Hardware', Icon: '💻' },
  { TypeId: 3, TypeName: 'Container', Category: 'Cloud', Icon: '📦' },
  { TypeId: 4, TypeName: 'Database', Category: 'Software', Icon: '🗄️' },
  { TypeId: 5, TypeName: 'Application', Category: 'Software', Icon: '📱' },
  { TypeId: 6, TypeName: 'Web Server', Category: 'Software', Icon: '🌐' },
  { TypeId: 7, TypeName: 'API', Category: 'Software', Icon: '🔌' },
  { TypeId: 8, TypeName: 'Load Balancer', Category: 'Network', Icon: '⚖️' },
  { TypeId: 9, TypeName: 'Firewall', Category: 'Network', Icon: '🛡️' },
  { TypeId: 10, TypeName: 'Storage', Category: 'Hardware', Icon: '💾' },
  { TypeId: 11, TypeName: 'Cloud Service', Category: 'Cloud', Icon: '☁️' },
  { TypeId: 12, TypeName: 'SaaS Application', Category: 'Cloud', Icon: '🌩️' },
];

const ENVIRONMENTS = ['Production', 'Staging', 'Development', 'Test', 'DR'];
const STATUSES = ['Active', 'Inactive', 'Decommissioned', 'Planned', 'Maintenance'];

const ConfigurationItems: React.FC = () => {
  const [configItems, setConfigItems] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCi, setSelectedCi] = useState<ConfigurationItem | null>(null);
  const [stats, setStats] = useState<CiStats>({ total: 0, servers: 0, applications: 0, databases: 0 });

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    ciName: '',
    ciType: '',
    subType: '',
    status: 'Active',
    environment: 'Production',
    location: '',
    ipAddress: '',
    hostname: '',
    version: '',
    vendor: '',
    owner: '',
    description: '',
    supportGroupId: ''
  });

  useEffect(() => {
    loadConfigItems();
  }, []);

  const loadConfigItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuration-items');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfigItems(data.data);
          calculateStats(data.data);
        } else {
          // No data yet, that's okay
          setConfigItems([]);
          calculateStats([]);
        }
      } else {
        // API might not exist yet
        setConfigItems([]);
        calculateStats([]);
      }
    } catch (err) {
      console.log('API not available yet, showing empty state');
      setConfigItems([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items: ConfigurationItem[]) => {
    setStats({
      total: items.length,
      servers: items.filter(i => i.CiType === 'Server' || i.CiType === 'Virtual Machine').length,
      applications: items.filter(i => i.CiType === 'Application' || i.CiType === 'Web Server' || i.CiType === 'API').length,
      databases: items.filter(i => i.CiType === 'Database').length,
    });
  };

  const getTypeIcon = (typeName: string): string => {
    const type = CI_TYPES.find(t => t.TypeName === typeName);
    return type?.Icon || '📦';
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Inactive': return 'status-inactive';
      case 'Maintenance': return 'status-maintenance';
      case 'Decommissioned': return 'status-decommissioned';
      case 'Planned': return 'status-planned';
      default: return '';
    }
  };

  const filteredItems = configItems.filter(item => {
    const matchesSearch = item.CiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.Description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !typeFilter || item.CiType === typeFilter;
    const matchesEnv = !envFilter || item.Environment === envFilter;
    const matchesStatus = !statusFilter || item.Status === statusFilter;
    return matchesSearch && matchesType && matchesEnv && matchesStatus;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({
      ciName: '',
      ciType: '',
      subType: '',
      status: 'Active',
      environment: 'Production',
      location: '',
      ipAddress: '',
      hostname: '',
      version: '',
      vendor: '',
      owner: '',
      description: '',
      supportGroupId: ''
    });
    setSelectedCi(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (ci: ConfigurationItem) => {
    setFormData({
      ciName: ci.CiName,
      ciType: ci.CiType,
      subType: ci.SubType || '',
      status: ci.Status,
      environment: ci.Environment,
      location: ci.Location || '',
      ipAddress: ci.IpAddress || '',
      hostname: ci.Hostname || '',
      version: ci.Version || '',
      vendor: ci.Vendor || '',
      owner: ci.Owner || '',
      description: ci.Description || '',
      supportGroupId: ''
    });
    setSelectedCi(ci);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = selectedCi 
        ? `/api/configuration-items/${selectedCi.CiId}`
        : '/api/configuration-items';
      
      const method = selectedCi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        loadConfigItems();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save configuration item');
      }
    } catch (err) {
      setError('Failed to save configuration item. API may not be available yet.');
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setSelectedCi(null);
    setError('');
  };

  return (
    <div className="configuration-items">
      <div className="ci-header">
        <div>
          <h1>Configuration Items</h1>
          <p className="ci-subtitle">Manage infrastructure and application components</p>
        </div>
        <button className="btn-add-ci" onClick={openAddModal}>
          + Add CI
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="ci-stats-grid">
        <div className="ci-stat-card">
          <h3>Total CIs</h3>
          <div className="ci-stat-number">{stats.total}</div>
        </div>
        <div className="ci-stat-card">
          <h3>Servers</h3>
          <div className="ci-stat-number servers">{stats.servers}</div>
        </div>
        <div className="ci-stat-card">
          <h3>Applications</h3>
          <div className="ci-stat-number applications">{stats.applications}</div>
        </div>
        <div className="ci-stat-card">
          <h3>Databases</h3>
          <div className="ci-stat-number databases">{stats.databases}</div>
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
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {CI_TYPES.map(type => (
            <option key={type.TypeId} value={type.TypeName}>
              {type.Icon} {type.TypeName}
            </option>
          ))}
        </select>
        <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)}>
          <option value="">All Environments</option>
          {ENVIRONMENTS.map(env => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="ci-table-container">
        {loading ? (
          <div className="loading-state">Loading configuration items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Configuration Items Found</h3>
            <p>
              {configItems.length === 0 
                ? 'Get started by adding your first configuration item.'
                : 'No items match your current filters.'}
            </p>
            {configItems.length === 0 && (
              <button className="btn-add-ci" onClick={openAddModal}>
                + Add Your First CI
              </button>
            )}
          </div>
        ) : (
          <table className="ci-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Environment</th>
                <th>Status</th>
                <th>Location</th>
                <th>Services</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(ci => (
                <tr key={ci.CiId} onClick={() => openEditModal(ci)}>
                  <td className="ci-name-cell">
                    <span className="ci-icon">{getTypeIcon(ci.CiType)}</span>
                    <div>
                      <div className="ci-name">{ci.CiName}</div>
                      {ci.SubType && <div className="ci-subtype">{ci.SubType}</div>}
                    </div>
                  </td>
                  <td>{ci.CiType}</td>
                  <td>
                    <span className={`env-badge env-${ci.Environment.toLowerCase()}`}>
                      {ci.Environment}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(ci.Status)}`}>
                      {ci.Status}
                    </span>
                  </td>
                  <td>{ci.Location || '-'}</td>
                  <td>
                    <span className="service-count">{ci.ServiceCount || 0}</span>
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(ci);
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
          <div className="modal-content ci-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCi ? 'Edit Configuration Item' : 'Add Configuration Item'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="ciName"
                    value={formData.ciName}
                    onChange={handleInputChange}
                    placeholder="e.g., PROD-WEB-01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    name="ciType"
                    value={formData.ciType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Type</option>
                    {CI_TYPES.map(type => (
                      <option key={type.TypeId} value={type.TypeName}>
                        {type.Icon} {type.TypeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub-Type</label>
                  <input
                    type="text"
                    name="subType"
                    value={formData.subType}
                    onChange={handleInputChange}
                    placeholder="e.g., Windows Server 2022"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Environment *</label>
                  <select
                    name="environment"
                    value={formData.environment}
                    onChange={handleInputChange}
                    required
                  >
                    {ENVIRONMENTS.map(env => (
                      <option key={env} value={env}>{env}</option>
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
                    {STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Azure East US"
                  />
                </div>
                <div className="form-group">
                  <label>IP Address</label>
                  <input
                    type="text"
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., 10.0.1.15"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hostname</label>
                  <input
                    type="text"
                    name="hostname"
                    value={formData.hostname}
                    onChange={handleInputChange}
                    placeholder="e.g., prod-web-01.company.com"
                  />
                </div>
                <div className="form-group">
                  <label>Version</label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    placeholder="e.g., 2.1.0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    placeholder="e.g., Microsoft"
                  />
                </div>
                <div className="form-group">
                  <label>Owner (Email)</label>
                  <input
                    type="email"
                    name="owner"
                    value={formData.owner}
                    onChange={handleInputChange}
                    placeholder="e.g., infra@company.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this configuration item..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {selectedCi ? 'Update CI' : 'Add CI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationItems;
