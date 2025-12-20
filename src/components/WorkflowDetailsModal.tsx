import React from 'react';
import { Workflow, WorkflowType } from '../services/api';
import './WorkflowDetailsModal.css';

interface WorkflowDetailsModalProps {
  workflow: Workflow;
  onClose: () => void;
}

const WorkflowDetailsModal: React.FC<WorkflowDetailsModalProps> = ({ workflow, onClose }) => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="workflow-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{workflow.name}</h2>
            <p className="workflow-description">{workflow.description}</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Workflow Info */}
          <div className="info-section">
            <div className="info-grid">
              <div className="info-item">
                <label>Type</label>
                <span className="workflow-type-badge" data-type={workflow.workflowType}>
                  {getWorkflowTypeLabel(workflow.workflowType)}
                </span>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span className={`status-badge ${workflow.isActive ? 'active' : 'inactive'}`}>
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="info-item">
                <label>Version</label>
                <span>v{workflow.version}</span>
              </div>
              <div className="info-item">
                <label>Default Workflow</label>
                <span>{workflow.isDefault ? 'Yes' : 'No'}</span>
              </div>
              <div className="info-item">
                <label>Created By</label>
                <span>{workflow.createdBy}</span>
              </div>
              <div className="info-item">
                <label>Modified Date</label>
                <span>{new Date(workflow.modifiedDate).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="stages-section">
            <h3>Workflow Stages ({workflow.definition.stages.length})</h3>
            <div className="stages-list">
              {workflow.definition.stages.map((stage) => (
                <div key={stage.id} className="stage-card" style={{ borderLeftColor: stage.color }}>
                  <div className="stage-header">
                    <span className="stage-icon">{stage.icon}</span>
                    <div className="stage-info">
                      <h4>{stage.name}</h4>
                      <span className="stage-type">{stage.type}</span>
                    </div>
                    <span className="stage-order">#{stage.order}</span>
                  </div>
                  {stage.sla && (
                    <div className="stage-sla">
                      <span>⏱️ SLA: {stage.sla.duration} hours</span>
                      {stage.sla.warningThreshold && (
                        <span className="sla-warning">Warning at {stage.sla.warningThreshold}%</span>
                      )}
                    </div>
                  )}
                  {stage.notifications && stage.notifications.length > 0 && (
                    <div className="stage-notifications">
                      <span>🔔 Notifications:</span>
                      {stage.notifications.map((notif, idx) => (
                        <span key={idx} className="notification-tag">
                          {notif.recipient} ({notif.trigger})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transitions */}
          <div className="transitions-section">
            <h3>Transitions ({workflow.definition.transitions.length})</h3>
            <div className="transitions-list">
              {workflow.definition.transitions.map((transition) => {
                const fromStage = workflow.definition.stages.find(s => s.id === transition.fromStageId);
                const toStage = workflow.definition.stages.find(s => s.id === transition.toStageId);
                return (
                  <div key={transition.id} className="transition-card">
                    <div className="transition-flow">
                      <span className="stage-label">{fromStage?.name || transition.fromStageId}</span>
                      <span className="arrow">→</span>
                      <span className="stage-label">{toStage?.name || transition.toStageId}</span>
                    </div>
                    <div className="transition-info">
                      <strong>{transition.label}</strong>
                      {transition.requiredRole && transition.requiredRole.length > 0 && (
                        <span className="roles-tag">
                          Roles: {transition.requiredRole.join(', ')}
                        </span>
                      )}
                      {transition.requiresComment && (
                        <span className="comment-required">💬 Comment required</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          {workflow.definition.rules && workflow.definition.rules.length > 0 && (
            <div className="rules-section">
              <h3>Automation Rules ({workflow.definition.rules.length})</h3>
              <div className="rules-list">
                {workflow.definition.rules.map((rule) => (
                  <div key={rule.id} className="rule-card">
                    <div className="rule-header">
                      <h4>{rule.name}</h4>
                      <span className="rule-priority">Priority: {rule.priority}</span>
                    </div>
                    <p className="rule-description">{rule.description}</p>
                    <div className="rule-conditions">
                      <strong>Conditions:</strong>
                      {rule.conditions.map((cond, idx) => (
                        <span key={idx} className="condition-tag">
                          {cond.field} {cond.operator} "{cond.value}"
                        </span>
                      ))}
                    </div>
                    <div className="rule-actions">
                      <strong>Actions:</strong>
                      {rule.actions.map((action, idx) => (
                        <span key={idx} className="action-tag">
                          {action.type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailsModal;
