import React, { useState, useEffect } from 'react';
import { workflowsAPI, Workflow, WorkflowType } from '../services/api';
import WorkflowDetailsModal from './WorkflowDetailsModal';
import './Workflows.css';

const Workflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workflowsAPI.getAll();
      if (response.success && response.data) {
        setWorkflows(response.data);
      } else {
        setError(response.error || 'Failed to fetch workflows');
      }
    } catch (err) {
      setError('An error occurred while fetching workflows');
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowTypeLabel = (type: WorkflowType): string => {
    const labels: Record<WorkflowType, string> = {
      request: 'Service Request',
      incident: 'Incident',
      change: 'Change',
      cmdb: 'CMDB',
      integration: 'Integration'
    };
    return labels[type] || type;
  };

  const handleViewWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleCloseModal = () => {
    setSelectedWorkflow(null);
  };

  return (
    <div className="workflows-container">{selectedWorkflow && (
        <WorkflowDetailsModal 
          workflow={selectedWorkflow} 
          onClose={handleCloseModal} 
        />
      )}
      <div className="workflows-header">
        <h1>Workflows</h1>
        <p>Create and manage automated workflows for your ITSM processes</p>
      </div>

      <div className="workflows-content">
        {loading ? (
          <div className="workflows-loading">
            <div className="spinner"></div>
            <p>Loading workflows...</p>
          </div>
        ) : error ? (
          <div className="workflows-error">
            <p className="error-message">{error}</p>
            <button onClick={fetchWorkflows} className="retry-button">Retry</button>
          </div>
        ) : workflows.length === 0 ? (
          <div className="workflows-empty">
            <p>No workflows configured yet.</p>
            <button className="btn-primary">Create Workflow</button>
          </div>
        ) : (
          <div className="workflows-table-container">
            <table className="workflows-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Default</th>
                  <th>Version</th>
                  <th>Stages</th>
                  <th>Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <td>
                      <div 
                        className="workflow-name clickable" 
                        onClick={() => handleViewWorkflow(workflow)}
                      >
                        <strong>{workflow.name}</strong>
                        {workflow.description && (
                          <span className="workflow-description">{workflow.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="workflow-type-badge" data-type={workflow.workflowType}>
                        {getWorkflowTypeLabel(workflow.workflowType)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${workflow.isActive ? 'active' : 'inactive'}`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {workflow.isDefault && (
                        <span className="default-badge">✓ Default</span>
                      )}
                    </td>
                    <td>
                      <span className="version-text">v{workflow.version}</span>
                    </td>
                    <td>
                      <span className="stages-count">{workflow.definition.stages.length} stages</span>
                    </td>
                    <td>
                      <span className="date-text">
                        {new Date(workflow.modifiedDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="workflow-actions">
                        <button 
                          className="btn-action" 
                          title="View Details"
                          onClick={() => handleViewWorkflow(workflow)}
                        >
                          👁️
                        </button>
                        <button className="btn-action" title="Edit">✏️</button>
                        {!workflow.isDefault && (
                          <button className="btn-action btn-delete" title="Delete">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
