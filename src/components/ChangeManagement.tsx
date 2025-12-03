import React, { useState, useEffect, useCallback } from 'react';
import { changesAPI, ChangeRequest, servicesAPI, Service, configurationItemsAPI, ConfigurationItem, integrationsAPI, Integration } from '../services/api';
import './ChangeManagement.css';

const CHANGE_TYPES = ['Normal', 'Standard', 'Emergency'];
const CATEGORIES = ['Infrastructure', 'Application', 'Network', 'Security', 'Database', 'Integration', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const IMPACTS = ['Critical', 'High', 'Medium', 'Low'];
const ENVIRONMENTS = ['Production', 'Staging', 'Development', 'Test', 'DR', 'All'];
const STATUSES = ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled', 'Rejected'];

const ChangeManagement: React.FC = () => {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reference data for dropdowns
  const [services, setServices] = useState<Service[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cis, setCIs] = useState<ConfigurationItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    Title: '',
    Description: '',
    Justification: '',
    ChangeType: 'Normal',
    Category: 'Other',
    Priority: 'Medium',
    RiskLevel: 'Medium',
    Impact: 'Medium',
    Environment: 'Production',
    Status: 'Draft',
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Impact analysis state
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Load changes
  const loadChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.changeType = typeFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      
      const response = await changesAPI.getAll(filters);
      
      if (response.success && response.data) {
        setChanges(response.data);
      } else {
        throw new Error(response.error || 'Failed to load changes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, priorityFilter]);

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const [servicesRes, cisRes, integrationsRes] = await Promise.all([
        servicesAPI.getAll(),
        configurationItemsAPI.getAll(),
        integrationsAPI.getAll()
      ]);
      
      if (servicesRes.success && servicesRes.data) setServices(servicesRes.data);
      if (cisRes.success && cisRes.data) setCIs(cisRes.data);
      if (integrationsRes.success && integrationsRes.data) setIntegrations(integrationsRes.data);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadChanges();
    loadReferenceData();
  }, [loadChanges, loadReferenceData]);

  // Filter changes by search term
  const filteredChanges = changes.filter(change => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      change.ChangeNumber?.toLowerCase().includes(search) ||
      change.Title?.toLowerCase().includes(search) ||
      change.Description?.toLowerCase().includes(search) ||
      change.RequestedBy?.toLowerCase().includes(search) ||
      change.AssignedTo?.toLowerCase().includes(search)
    );
  });

  // Handle form input change
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  // Create change
  const handleCreate = async () => {
    if (!formData.Title?.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.Description?.trim()) {
      setFormError('Description is required');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    
    try {
      const response = await changesAPI.create({
        title: formData.Title!,
        description: formData.Description!,
        justification: formData.Justification,
        changeType: formData.ChangeType,
        category: formData.Category,
        priority: formData.Priority,
        riskLevel: formData.RiskLevel,
        impact: formData.Impact,
        environment: formData.Environment,
        status: formData.Status,
        requestedStartDate: formData.RequestedStartDate,
        requestedEndDate: formData.RequestedEndDate,
        implementationPlan: formData.ImplementationPlan,
        backoutPlan: formData.BackoutPlan,
        testPlan: formData.TestPlan,
        primaryServiceId: formData.PrimaryServiceId,
      });
      
      if (response.success) {
        setShowCreateModal(false);
        resetForm();
        loadChanges();
      } else {
        throw new Error(response.error || 'Failed to create change');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create change');
    } finally {
      setSaving(false);
    }
  };

  // View change details
  const handleViewDetails = async (change: ChangeRequest) => {
    try {
      const response = await changesAPI.getById(change.ChangeId);
      if (response.success && response.data) {
        setSelectedChange(response.data);
        setShowDetailModal(true);
        
        // Load impact analysis
        loadImpactAnalysis(change.ChangeId);
      }
    } catch (err) {
      console.error('Error loading change details:', err);
    }
  };

  // Load impact analysis
  const loadImpactAnalysis = async (changeId: number) => {
    setLoadingImpact(true);
    try {
      const response = await changesAPI.getImpactAnalysis(changeId);
      if (response.success && response.data) {
        setImpactAnalysis(response.data);
      }
    } catch (err) {
      console.error('Error loading impact analysis:', err);
    } finally {
      setLoadingImpact(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      Title: '',
      Description: '',
      Justification: '',
      ChangeType: 'Normal',
      Category: 'Other',
      Priority: 'Medium',
      RiskLevel: 'Medium',
      Impact: 'Medium',
      Environment: 'Production',
      Status: 'Draft',
    });
    setFormError(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return '#6c757d';
      case 'Submitted': return '#17a2b8';
      case 'Pending Approval': return '#ffc107';
      case 'Approved': return '#28a745';
      case 'Scheduled': return '#007bff';
      case 'In Progress': return '#fd7e14';
      case 'Completed': return '#28a745';
      case 'Failed': return '#dc3545';
      case 'Cancelled': return '#6c757d';
      case 'Rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Get change type icon
  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'Emergency': return '🚨';
      case 'Standard': return '📋';
      case 'Normal': return '📝';
      default: return '📄';
    }
  };

  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && changes.length === 0) {
    return (
      <div className="change-management-loading">
        <div className="spinner"></div>
        <p>Loading changes...</p>
      </div>
    );
  }

  return (
    <div className="change-management">
      {/* Header */}
      <div className="change-header">
        <div className="header-title">
          <h1>🔄 Change Management</h1>
          <p>Plan, track, and manage changes to your IT environment</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Change Request
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="change-stats">
        <div className="stat-card">
          <span className="stat-value">{changes.length}</span>
          <span className="stat-label">Total Changes</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{changes.filter(c => c.Status === 'Pending Approval').length}</span>
          <span className="stat-label">Pending Approval</span>
        </div>
        <div className="stat-card scheduled">
          <span className="stat-value">{changes.filter(c => c.Status === 'Scheduled').length}</span>
          <span className="stat-label">Scheduled</span>
        </div>
        <div className="stat-card in-progress">
          <span className="stat-value">{changes.filter(c => c.Status === 'In Progress').length}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card emergency">
          <span className="stat-value">{changes.filter(c => c.ChangeType === 'Emergency').length}</span>
          <span className="stat-label">Emergency</span>
        </div>
      </div>

      {/* Filters */}
      <div className="change-filters">
        <input
          type="text"
          placeholder="Search changes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-secondary" onClick={loadChanges}>
          🔄 Refresh
        </button>
      </div>

      {/* Changes List */}
      <div className="changes-list">
        {filteredChanges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>No changes found</h3>
            <p>Create your first change request to get started</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Change Request
            </button>
          </div>
        ) : (
          filteredChanges.map(change => (
            <div key={change.ChangeId} className="change-card" onClick={() => handleViewDetails(change)}>
              <div className="change-card-header">
                <div className="change-number">
                  <span className="type-icon">{getChangeTypeIcon(change.ChangeType)}</span>
                  <strong>{change.ChangeNumber}</strong>
                  <span className="change-type-badge" style={{ backgroundColor: change.ChangeType === 'Emergency' ? '#dc3545' : change.ChangeType === 'Standard' ? '#17a2b8' : '#6c757d' }}>
                    {change.ChangeType}
                  </span>
                </div>
                <div className="change-badges">
                  <span className="priority-badge" style={{ backgroundColor: getPriorityColor(change.Priority) }}>
                    {change.Priority}
                  </span>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(change.Status) }}>
                    {change.Status}
                  </span>
                </div>
              </div>
              
              <h3 className="change-title">{change.Title}</h3>
              
              <div className="change-meta">
                <span>📁 {change.Category}</span>
                <span>🌍 {change.Environment}</span>
                <span>👤 {change.RequestedBy}</span>
                {change.ScheduledStartDate && (
                  <span>📅 {formatDate(change.ScheduledStartDate)}</span>
                )}
              </div>
              
              <div className="change-footer">
                <div className="impact-indicators">
                  {(change.ImpactedCICount ?? 0) > 0 && (
                    <span className="impact-badge">🖥️ {change.ImpactedCICount} CIs</span>
                  )}
                  {(change.ImpactedIntegrationCount ?? 0) > 0 && (
                    <span className="impact-badge">🔗 {change.ImpactedIntegrationCount} Integrations</span>
                  )}
                  {(change.TaskCount ?? 0) > 0 && (
                    <span className="impact-badge">✅ {change.CompletedTaskCount}/{change.TaskCount} Tasks</span>
                  )}
                </div>
                {(change.PendingApprovalCount ?? 0) > 0 && (
                  <span className="approval-pending">⏳ {change.PendingApprovalCount} approvals pending</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 New Change Request</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}
              
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={formData.Title || ''}
                      onChange={(e) => handleFormChange('Title', e.target.value)}
                      placeholder="Brief title for the change"
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Description *</label>
                    <textarea
                      value={formData.Description || ''}
                      onChange={(e) => handleFormChange('Description', e.target.value)}
                      placeholder="Detailed description of the change"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Business Justification</label>
                    <textarea
                      value={formData.Justification || ''}
                      onChange={(e) => handleFormChange('Justification', e.target.value)}
                      placeholder="Why is this change needed?"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Classification</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Change Type</label>
                    <select value={formData.ChangeType || 'Normal'} onChange={(e) => handleFormChange('ChangeType', e.target.value)}>
                      {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.Category || 'Other'} onChange={(e) => handleFormChange('Category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.Priority || 'Medium'} onChange={(e) => handleFormChange('Priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Risk Level</label>
                    <select value={formData.RiskLevel || 'Medium'} onChange={(e) => handleFormChange('RiskLevel', e.target.value)}>
                      {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Impact</label>
                    <select value={formData.Impact || 'Medium'} onChange={(e) => handleFormChange('Impact', e.target.value)}>
                      {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Environment</label>
                    <select value={formData.Environment || 'Production'} onChange={(e) => handleFormChange('Environment', e.target.value)}>
                      {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Scheduling</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Requested Start Date</label>
                    <input
                      type="datetime-local"
                      value={formData.RequestedStartDate || ''}
                      onChange={(e) => handleFormChange('RequestedStartDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Requested End Date</label>
                    <input
                      type="datetime-local"
                      value={formData.RequestedEndDate || ''}
                      onChange={(e) => handleFormChange('RequestedEndDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Primary Service</label>
                    <select 
                      value={formData.PrimaryServiceId || ''} 
                      onChange={(e) => handleFormChange('PrimaryServiceId', e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">Select a service...</option>
                      {services.map(s => <option key={s.ServiceId} value={s.ServiceId}>{s.ServiceName}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Plans</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Implementation Plan</label>
                    <textarea
                      value={formData.ImplementationPlan || ''}
                      onChange={(e) => handleFormChange('ImplementationPlan', e.target.value)}
                      placeholder="Step-by-step implementation plan"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Backout Plan</label>
                    <textarea
                      value={formData.BackoutPlan || ''}
                      onChange={(e) => handleFormChange('BackoutPlan', e.target.value)}
                      placeholder="How to rollback if the change fails"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Test Plan</label>
                    <textarea
                      value={formData.TestPlan || ''}
                      onChange={(e) => handleFormChange('TestPlan', e.target.value)}
                      placeholder="How will the change be tested?"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Change Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedChange && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content xlarge" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedChange.ChangeNumber}</h2>
                <p>{selectedChange.Title}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-tabs">
                <div className="detail-section">
                  <h3>📋 Overview</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Status</label>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedChange.Status) }}>
                        {selectedChange.Status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Type</label>
                      <span>{selectedChange.ChangeType}</span>
                    </div>
                    <div className="detail-item">
                      <label>Category</label>
                      <span>{selectedChange.Category}</span>
                    </div>
                    <div className="detail-item">
                      <label>Priority</label>
                      <span className="priority-badge" style={{ backgroundColor: getPriorityColor(selectedChange.Priority) }}>
                        {selectedChange.Priority}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Risk Level</label>
                      <span>{selectedChange.RiskLevel}</span>
                    </div>
                    <div className="detail-item">
                      <label>Impact</label>
                      <span>{selectedChange.Impact}</span>
                    </div>
                    <div className="detail-item">
                      <label>Environment</label>
                      <span>{selectedChange.Environment}</span>
                    </div>
                    <div className="detail-item">
                      <label>Primary Service</label>
                      <span>{selectedChange.PrimaryServiceName || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="detail-description">
                    <label>Description</label>
                    <p>{selectedChange.Description}</p>
                  </div>
                  
                  {selectedChange.Justification && (
                    <div className="detail-description">
                      <label>Justification</label>
                      <p>{selectedChange.Justification}</p>
                    </div>
                  )}
                </div>
                
                <div className="detail-section">
                  <h3>📅 Schedule</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Requested Start</label>
                      <span>{formatDate(selectedChange.RequestedStartDate)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Requested End</label>
                      <span>{formatDate(selectedChange.RequestedEndDate)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Scheduled Start</label>
                      <span>{formatDate(selectedChange.ScheduledStartDate)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Scheduled End</label>
                      <span>{formatDate(selectedChange.ScheduledEndDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>🖥️ Impacted CIs ({(selectedChange as any).impactedCIs?.length || 0})</h3>
                  {(selectedChange as any).impactedCIs?.length > 0 ? (
                    <div className="impact-list">
                      {(selectedChange as any).impactedCIs.map((ci: any) => (
                        <div key={ci.ImpactId} className="impact-item">
                          <span className="impact-name">{ci.ServiceName || ci.CiName}</span>
                          <span className="impact-type">{ci.ImpactType}</span>
                          {ci.RiskLevel && <span className="impact-risk">{ci.RiskLevel}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-items">No CIs added yet</p>
                  )}
                </div>
                
                <div className="detail-section">
                  <h3>🔗 Impacted Integrations ({(selectedChange as any).impactedIntegrations?.length || 0})</h3>
                  {(selectedChange as any).impactedIntegrations?.length > 0 ? (
                    <div className="impact-list">
                      {(selectedChange as any).impactedIntegrations.map((int: any) => (
                        <div key={int.ImpactId} className="impact-item">
                          <span className="impact-name">{int.IntegrationName}</span>
                          <span className="impact-type">{int.ImpactType}</span>
                          {int.NotificationRequired && <span className="notification-badge">📧 Notify</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-items">No integrations added yet</p>
                  )}
                </div>
                
                {impactAnalysis && (
                  <div className="detail-section impact-analysis">
                    <h3>🔍 Impact Analysis</h3>
                    {loadingImpact ? (
                      <p>Loading...</p>
                    ) : (
                      <>
                        {impactAnalysis.dependentServices?.length > 0 && (
                          <div className="analysis-group">
                            <h4>Dependent Services ({impactAnalysis.dependentServices.length})</h4>
                            <div className="analysis-items">
                              {impactAnalysis.dependentServices.map((s: any) => (
                                <span key={s.ServiceId} className="analysis-badge service">
                                  {s.ServiceName} ({s.Criticality})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {impactAnalysis.downstreamCIs?.length > 0 && (
                          <div className="analysis-group">
                            <h4>Downstream CIs ({impactAnalysis.downstreamCIs.length})</h4>
                            <div className="analysis-items">
                              {impactAnalysis.downstreamCIs.map((ci: any) => (
                                <span key={ci.CiId} className="analysis-badge ci">
                                  {ci.CiName} ({ci.CiType})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {impactAnalysis.potentiallyAffectedIntegrations?.length > 0 && (
                          <div className="analysis-group">
                            <h4>Potentially Affected Integrations ({impactAnalysis.potentiallyAffectedIntegrations.length})</h4>
                            <div className="analysis-items">
                              {impactAnalysis.potentiallyAffectedIntegrations.map((i: any) => (
                                <span key={i.IntegrationId} className="analysis-badge integration">
                                  {i.IntegrationName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <div className="detail-section">
                  <h3>✅ Tasks ({(selectedChange as any).tasks?.length || 0})</h3>
                  {(selectedChange as any).tasks?.length > 0 ? (
                    <div className="tasks-list">
                      {(selectedChange as any).tasks.map((task: any) => (
                        <div key={task.TaskId} className={`task-item ${task.Status.toLowerCase().replace(' ', '-')}`}>
                          <div className="task-header">
                            <span className="task-number">{task.TaskNumber}</span>
                            <span className={`task-status ${task.Status.toLowerCase()}`}>{task.Status}</span>
                          </div>
                          <p className="task-title">{task.Title}</p>
                          <div className="task-meta">
                            <span>{task.TaskType}</span>
                            {task.AssignedTo && <span>👤 {task.AssignedTo}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-items">No tasks added yet</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeManagement;
