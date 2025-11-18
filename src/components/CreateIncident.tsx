import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { incidentsAPI, CreateIncidentData } from '../services/api';
import './Forms.css';

interface IncidentFormData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Hardware' | 'Software' | 'Network' | 'Security' | 'Other';
  affectedUser: string;
  contactInfo: string;
}

const CreateIncident: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Software',
    affectedUser: '',
    contactInfo: ''
  });

  const [errors, setErrors] = useState<Partial<IncidentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

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
          contactInfo: ''
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