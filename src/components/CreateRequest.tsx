import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsAPI, CreateRequestData, assignmentGroupsAPI, AssignmentGroup } from '../services/api';
import './Forms.css';

interface RequestFormData {
  title: string;
  description: string;
  requestType: 'Hardware' | 'Software' | 'Access' | 'Service' | 'Other';
  urgency: 'Low' | 'Medium' | 'High';
  justification: string;
  requester: string;
  department: string;
  contactInfo: string;
  approver: string;
  assignmentGroup: string;
}

const CreateRequest: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RequestFormData>({
    title: '',
    description: '',
    requestType: 'Software',
    urgency: 'Medium',
    justification: '',
    requester: '',
    department: '',
    contactInfo: '',
    approver: '',
    assignmentGroup: ''
  });

  const [errors, setErrors] = useState<Partial<RequestFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string>('');

  // Fallback assignment groups in case API fails
  const fallbackGroups: AssignmentGroup[] = [
    { AssignmentGroupID: 1, GroupName: 'Development', Description: 'Software development and application support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 2, GroupName: 'Infrastructure', Description: 'IT infrastructure, servers, and network support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 3, GroupName: 'Service Desk', Description: 'First-line support and general IT assistance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 4, GroupName: 'Security', Description: 'Information security and compliance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' }
  ];

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
    if (errors[name as keyof RequestFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RequestFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.justification.trim()) {
      newErrors.justification = 'Business justification is required';
    }
    if (!formData.requester.trim()) {
      newErrors.requester = 'Requester name is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.contactInfo.trim()) {
      newErrors.contactInfo = 'Contact information is required';
    }
    if (!formData.approver.trim()) {
      newErrors.approver = 'Approver is required';
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
      const requestData: CreateRequestData = {
        title: formData.title,
        description: formData.description,
        requestType: formData.requestType,
        urgency: formData.urgency,
        justification: formData.justification,
        requester: formData.requester,
        department: formData.department,
        contactInfo: formData.contactInfo,
        approver: formData.approver,
        assignmentGroup: formData.assignmentGroup,
        createdBy: 'User' // You can update this with actual user info later
      };

      const response = await requestsAPI.create(requestData);
      
      if (response.success && response.data) {
        alert(`Service Request ${response.data.RequestNumber} submitted successfully! It will be routed for approval.`);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          requestType: 'Software',
          urgency: 'Medium',
          justification: '',
          requester: '',
          department: '',
          contactInfo: '',
          approver: '',
          assignmentGroup: assignmentGroups.length > 0 ? assignmentGroups[0].GroupName : ''
        });
        
        // Navigate to view tickets page after a delay
        setTimeout(() => {
          navigate('/view-tickets');
        }, 1500);
      } else {
        setSubmitError(response.error || 'Failed to create service request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>📝 Create Service Request</h1>
        <p>Submit a request for new equipment, access, or IT services</p>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-section">
          <h3>Request Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Request Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of what you're requesting"
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="requestType">Request Type *</label>
              <select
                id="requestType"
                name="requestType"
                value={formData.requestType}
                onChange={handleInputChange}
              >
                <option value="Software">Software License/Installation</option>
                <option value="Hardware">Hardware/Equipment</option>
                <option value="Access">Access Rights/Permissions</option>
                <option value="Service">New Service Setup</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group half">
              <label htmlFor="urgency">Urgency *</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
              >
                <option value="Low">Low - Can wait</option>
                <option value="Medium">Medium - Standard timeline</option>
                <option value="High">High - Urgent need</option>
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
                placeholder="Provide detailed information about what you need, specifications, quantities, etc."
                rows={4}
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="justification">Business Justification *</label>
              <textarea
                id="justification"
                name="justification"
                value={formData.justification}
                onChange={handleInputChange}
                placeholder="Explain why this request is needed and how it will benefit the business"
                rows={3}
                className={errors.justification ? 'error' : ''}
              />
              {errors.justification && <span className="error-message">{errors.justification}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Requester Information</h3>
          
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="requester">Requester Name *</label>
              <input
                type="text"
                id="requester"
                name="requester"
                value={formData.requester}
                onChange={handleInputChange}
                placeholder="Full name of person making request"
                className={errors.requester ? 'error' : ''}
              />
              {errors.requester && <span className="error-message">{errors.requester}</span>}
            </div>

            <div className="form-group half">
              <label htmlFor="department">Department *</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Department or team name"
                className={errors.department ? 'error' : ''}
              />
              {errors.department && <span className="error-message">{errors.department}</span>}
            </div>
          </div>

          <div className="form-row">
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

            <div className="form-group half">
              <label htmlFor="approver">Manager/Approver *</label>
              <input
                type="text"
                id="approver"
                name="approver"
                value={formData.approver}
                onChange={handleInputChange}
                placeholder="Name of manager who can approve this request"
                className={errors.approver ? 'error' : ''}
              />
              {errors.approver && <span className="error-message">{errors.approver}</span>}
            </div>
          </div>
        </div>

        <div className="approval-notice">
          <div className="notice-icon">ℹ️</div>
          <div className="notice-text">
            <strong>Approval Process:</strong> This request will be automatically routed to your specified approver. 
            You will receive email notifications about the approval status and when the request is fulfilled.
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
            {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;