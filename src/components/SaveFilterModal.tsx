import React, { useState } from 'react';
import { userSettingsAPI, SavedFilter, SavedFilterCriteria } from '../services/api';
import './SaveFilterModal.css';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentFilters: {
    ticketType: 'All' | 'Incident' | 'Request';
    status: string;
    searchText: string;
    priority?: string;
    assignmentGroup?: string;
    assignedTo?: string;
  };
}

const FILTER_ICONS = ['🔍', '⭐', '🔥', '📌', '🎯', '📊', '🚨', '✅', '⏰', '👤', '📅', '💼', '🏷️', '📋', '🎫'];

const SaveFilterModal: React.FC<SaveFilterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentFilters
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🔍');
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this filter');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Build the filter criteria from current filters
      const filterCriteria: SavedFilterCriteria = {};

      // Map ticket type
      if (currentFilters.ticketType !== 'All') {
        filterCriteria.ticketType = currentFilters.ticketType.toLowerCase() as 'incident' | 'request';
      } else {
        filterCriteria.ticketType = 'all';
      }

      // Map status
      if (currentFilters.status !== 'All') {
        filterCriteria.status = [currentFilters.status];
      }

      // Map search text
      if (currentFilters.searchText) {
        filterCriteria.searchText = currentFilters.searchText;
      }

      // Map priority if present
      if (currentFilters.priority && currentFilters.priority !== 'All') {
        filterCriteria.priority = [currentFilters.priority];
      }

      // Map assignment group if present
      if (currentFilters.assignmentGroup && currentFilters.assignmentGroup !== 'All') {
        filterCriteria.assignmentGroup = currentFilters.assignmentGroup;
      }

      // Map assigned to if present
      if (currentFilters.assignedTo) {
        filterCriteria.assignedTo = currentFilters.assignedTo;
      }

      const savedFilter: SavedFilter = {
        name: name.trim(),
        icon,
        showInSidebar,
        filters: filterCriteria,
        sortBy: 'createdDate',
        sortOrder: 'desc'
      };

      const response = await userSettingsAPI.createSavedFilter(savedFilter);

      if (response.success) {
        onSave();
        onClose();
        // Reset form
        setName('');
        setIcon('🔍');
        setShowInSidebar(true);
      } else {
        // Show detailed error if available
        const errorDetails = (response as any).details;
        setError(errorDetails ? `${response.error}: ${errorDetails}` : (response.error || 'Failed to save filter'));
      }
    } catch (err: any) {
      console.error('Error saving filter:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const getFilterDescription = () => {
    const parts: string[] = [];

    if (currentFilters.ticketType !== 'All') {
      parts.push(`Type: ${currentFilters.ticketType}s`);
    }

    if (currentFilters.status !== 'All') {
      parts.push(`Status: ${currentFilters.status}`);
    }

    if (currentFilters.searchText) {
      parts.push(`Search: "${currentFilters.searchText}"`);
    }

    if (currentFilters.priority && currentFilters.priority !== 'All') {
      parts.push(`Priority: ${currentFilters.priority}`);
    }

    if (currentFilters.assignmentGroup && currentFilters.assignmentGroup !== 'All') {
      parts.push(`Group: ${currentFilters.assignmentGroup}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'All tickets (no filters applied)';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="save-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💾 Save Filter</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="filter-preview">
            <label>Current Filter Criteria</label>
            <div className="filter-preview-content">
              {getFilterDescription()}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="filter-name">Filter Name *</label>
            <input
              type="text"
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Critical Incidents"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Icon</label>
            <div className="icon-picker">
              {FILTER_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`icon-option ${icon === emoji ? 'selected' : ''}`}
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showInSidebar}
                onChange={(e) => setShowInSidebar(e.target.checked)}
              />
              <span className="checkbox-text">Show in sidebar navigation</span>
            </label>
            <p className="help-text">
              When enabled, this filter will appear under "My Filters" in the sidebar for quick access.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Filter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveFilterModal;
