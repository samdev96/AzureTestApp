import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { incidentsAPI, CreateIncidentData, assignmentGroupsAPI, AssignmentGroup } from '../services/api';
import './Forms.css';

interface IncidentFormData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Hardware' | 'Software' | 'Network' | 'Security' | 'Other';
  affectedUser: string;
  contactInfo: string;
  assignmentGroup: string;
}

const CreateIncident: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Software',
    affectedUser: '',
    contactInfo: '',
    assignmentGroup: ''
  });

  const [errors, setErrors] = useState<Partial<IncidentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string>('');

  // Fallback assignment groups in case API fails
  const fallbackGroups: AssignmentGroup[] = useMemo(() => [
    { AssignmentGroupID: 1, GroupName: 'Development', Description: 'Software development and application support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 2, GroupName: 'Infrastructure', Description: 'IT infrastructure, servers, and network support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 3, GroupName: 'Service Desk', Description: 'First-line support and general IT assistance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 4, GroupName: 'Security', Description: 'Information security and compliance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' }
  ], []);

  // Load assignment groups on component mount
  useEffect(() => {
    const loadAssignmentGroups = async () => {
      try {
        console.log('Loading assignment groups from API...');
        const response = await assignmentGroupsAPI.getAll();
        console.log('Assignment groups response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          setAssignmentGroups(response.data);
          setFormData(prev => ({ ...prev, assignmentGroup: response.data![0].GroupName }));
          setGroupsError('');
        } else {
          console.warn('API response unsuccessful, using fallback groups:', response.error);
          setAssignmentGroups(fallbackGroups);
          setFormData(prev => ({ ...prev, assignmentGroup: fallbackGroups[0].GroupName }));
          setGroupsError('Using offline assignment groups');
        }
      } catch (error) {
        console.error('Error loading assignment groups, using fallback:', error);
        setAssignmentGroups(fallbackGroups);
        setFormData(prev => ({ ...prev, assignmentGroup: fallbackGroups[0].GroupName }));
        setGroupsError('Using offline assignment groups');
      } finally {
        setLoadingGroups(false);
      }
    };

    loadAssignmentGroups();
  }, [fallbackGroups]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof IncidentFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<IncidentFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.affectedUser.trim()) {
      newErrors.affectedUser = 'Affected user is required';
    }
    if (!formData.contactInfo.trim()) {
      newErrors.contactInfo = 'Contact information is required';
    }
    if (!formData.assignmentGroup.trim()) {
      newErrors.assignmentGroup = 'Assignment group is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const incidentData: CreateIncidentData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        affectedUser: formData.affectedUser,
        contactInfo: formData.contactInfo,
        assignmentGroup: formData.assignmentGroup,
        createdBy: 'User' // You can update this with actual user info later
      };

      const response = await incidentsAPI.create(incidentData);
      
      if (response.success && response.data) {
        alert(`Incident ${response.data.IncidentNumber} created successfully!`);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: 'Medium',
          category: 'Software',
          affectedUser: '',
          contactInfo: '',
          assignmentGroup: assignmentGroups.length > 0 ? assignmentGroups[0].GroupName : ''
        });
        
        // Navigate to view tickets page after a delay
        setTimeout(() => {
          navigate('/view-tickets');
        }, 1500);
      } else {
        setSubmitError(response.error || 'Failed to create incident');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>🚨 Create Incident</h1>
        <p>Report a system issue, outage, or technical problem</p>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-section">
          <h3>Incident Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Incident Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of the incident"
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="priority">Priority *</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="Low">Low - Minor issue</option>
                <option value="Medium">Medium - Standard issue</option>
                <option value="High">High - Urgent issue</option>
                <option value="Critical">Critical - System down</option>
              </select>
            </div>

            <div className="form-group half">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Network">Network</option>
                <option value="Security">Security</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assignmentGroup">Assignment Group *</label>
              <select
                id="assignmentGroup"
                name="assignmentGroup"
                value={formData.assignmentGroup}
                onChange={handleInputChange}
                className={errors.assignmentGroup ? 'error' : ''}
                disabled={loadingGroups}
              >
                {loadingGroups ? (
                  <option value="">Loading assignment groups...</option>
                ) : assignmentGroups.length === 0 ? (
                  <option value="">No assignment groups available</option>
                ) : (
                  assignmentGroups.map(group => (
                    <option key={group.AssignmentGroupID} value={group.GroupName}>
                      {group.GroupName} - {group.Description}
                    </option>
                  ))
                )}
              </select>
              {errors.assignmentGroup && <span className="error-message">{errors.assignmentGroup}</span>}
              {groupsError && <span className="info-message" style={{color: '#f39c12', fontSize: '0.9rem'}}>{groupsError}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="description">Detailed Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide detailed information about the incident, steps to reproduce, and impact"
                rows={6}
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Information</h3>
          
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="affectedUser">Affected User/Department *</label>
              <input
                type="text"
                id="affectedUser"
                name="affectedUser"
                value={formData.affectedUser}
                onChange={handleInputChange}
                placeholder="User or department affected"
                className={errors.affectedUser ? 'error' : ''}
              />
              {errors.affectedUser && <span className="error-message">{errors.affectedUser}</span>}
            </div>

            <div className="form-group half">
              <label htmlFor="contactInfo">Contact Information *</label>
              <input
                type="text"
                id="contactInfo"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleInputChange}
                placeholder="Email or phone number"
                className={errors.contactInfo ? 'error' : ''}
              />
              {errors.contactInfo && <span className="error-message">{errors.contactInfo}</span>}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="form-error">
            <span className="error-icon">⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Incident...' : 'Create Incident'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateIncident;