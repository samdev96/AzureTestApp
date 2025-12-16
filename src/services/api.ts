// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:7071/api'  // Local Azure Functions
  : '/api';  // Production (Azure Static Web App)

// Helper function to get user info for API calls (for future use)
// const getUserInfo = async () => {
//   try {
//     const response = await fetch('/.auth/me');
//     if (response.ok) {
//       const authPayload = await response.json();
//       return authPayload.clientPrincipal;
//     }
//   } catch (error) {
//     console.warn('Could not get user info:', error);
//   }
//   return null;
// };

// Generic API response interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

// Incident interfaces
export interface Incident {
  IncidentID: number;
  IncidentNumber: string;
  Title: string;
  Description: string;
  Category: string;
  Priority: string;
  Status: string;
  AffectedUser: string;
  ContactInfo: string;
  AssignedTo?: string;
  AssignmentGroup?: string;
  CreatedBy: string;
  CreatedDate: string;
  ModifiedDate?: string;
  ResolvedDate?: string;
}

export interface CreateIncidentData {
  title: string;
  description: string;
  category: string;
  priority: string;
  affectedUser: string;
  contactInfo: string;
  assignmentGroup: string;
  createdBy?: string;
}

// Request interfaces
export interface ServiceRequest {
  RequestID: number;
  RequestNumber: string;
  Title: string;
  Description: string;
  RequestType: string;
  Urgency: string;
  BusinessJustification: string;
  RequesterName: string;
  Department: string;
  ContactInfo: string;
  ApproverName: string;
  Status: string;
  AssignedTo?: string;
  AssignmentGroup?: string;
  CreatedBy: string;
  CreatedDate: string;
  ModifiedDate?: string;
  ApprovedDate?: string;
  ApprovedBy?: string;
  CompletedDate?: string;
}

export interface CreateRequestData {
  title: string;
  description: string;
  requestType: string;
  urgency: string;
  justification: string;
  requester: string;
  department: string;
  contactInfo: string;
  approver: string;
  assignmentGroup: string;
  createdBy?: string;
}

// Assignment Group interfaces
export interface AssignmentGroup {
  AssignmentGroupID: number;
  GroupName: string;
  Description: string;
  IsActive: boolean;
  CreatedDate: string;
  CreatedBy: string;
  Members?: AssignmentGroupMember[];
}

export interface AssignmentGroupMember {
  AssignmentGroupMemberID: number;
  UserEmail: string;
  UserObjectID: string;
  AssignedDate: string;
  AssignedBy: string;
  IsActive: boolean;
}

// User Management interfaces
export interface User {
  userEmail: string;
  userObjectId: string;
  displayName?: string;
  role: 'user' | 'agent' | 'admin';
  isAgent: boolean;
  isAdmin?: boolean;
  assignedDate: string;
  assignedBy: string;
}

// Generic fetch function with error handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // Log full error details from the API
      console.error(`API Error (${endpoint}): Full response:`, data);
      throw new Error(data.details || data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}): Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Incidents API
export const incidentsAPI = {
  // Get all incidents with optional filtering
  getAll: async (filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    myTicketsOnly?: boolean;
  }): Promise<ApiResponse<Incident[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.myTicketsOnly) params.append('myTicketsOnly', 'true');
    
    const queryString = params.toString();
    const endpoint = `/incidents${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<Incident[]>(endpoint);
  },

  // Create a new incident
  create: async (incidentData: CreateIncidentData): Promise<ApiResponse<Incident>> => {
    return apiRequest<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
  },
};

// Requests API
export const requestsAPI = {
  // Get all requests with optional filtering
  getAll: async (filters?: {
    status?: string;
    type?: string;
    urgency?: string;
    assignedTo?: string;
    myTicketsOnly?: boolean;
  }): Promise<ApiResponse<ServiceRequest[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.urgency) params.append('urgency', filters.urgency);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.myTicketsOnly) params.append('myTicketsOnly', 'true');
    
    const queryString = params.toString();
    const endpoint = `/requests${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ServiceRequest[]>(endpoint);
  },

  // Create a new service request
  create: async (requestData: CreateRequestData): Promise<ApiResponse<ServiceRequest>> => {
    return apiRequest<ServiceRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },
};

// Assignment Groups API
export const assignmentGroupsAPI = {
  // Get all assignment groups
  getAll: async (includeMembers: boolean = false): Promise<ApiResponse<AssignmentGroup[]>> => {
    const params = new URLSearchParams();
    if (includeMembers) params.append('includeMembers', 'true');
    
    const queryString = params.toString();
    const endpoint = `/assignment-groups${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<AssignmentGroup[]>(endpoint);
  },

  // Assign a user to an assignment group (admin only)
  assignUser: async (assignmentGroupId: number, userEmail: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/assignment-groups', {
      method: 'POST',
      body: JSON.stringify({ assignmentGroupId, userEmail }),
    });
  },

  // Remove a user from an assignment group (admin only)
  removeUser: async (assignmentGroupId: number, userEmail: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    params.append('assignmentGroupId', assignmentGroupId.toString());
    params.append('userEmail', userEmail);
    
    return apiRequest<any>(`/assignment-groups?${params.toString()}`, {
      method: 'DELETE',
    });
  },
};

// User Management API
export const userManagementAPI = {
  // Get all users (admin only)
  getAll: async (): Promise<ApiResponse<User[]>> => {
    return apiRequest<User[]>('/user-roles?all=true');
  },

  // Create a new user (admin only)
  create: async (userData: {
    email: string;
    displayName: string;
    role: 'user' | 'agent' | 'admin';
    assignmentGroups: number[];
  }): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update user role (admin only)
  updateRole: async (targetUserEmail: string, newRole: 'user' | 'agent' | 'admin'): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'PUT',
      body: JSON.stringify({ targetUserEmail, newRole }),
    });
  },

  // Update user details (admin only)
  update: async (userData: {
    targetUserEmail: string;
    displayName?: string;
    newRole?: 'user' | 'agent' | 'admin';
  }): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};

// User roles API for checking current user permissions
export const userRolesAPI = {
  // Get current user's roles and permissions
  getCurrent: async (): Promise<ApiResponse<{
    userEmail: string;
    userObjectId: string;
    roles: string[];
    isAgent: boolean;
    roleDetails: any[];
  }>> => {
    return apiRequest('/user-roles');
  },
};

// Combined tickets API for the view tickets page
export const ticketsAPI = {
  // Get all tickets (both incidents and requests)
  getAll: async (options?: { myTicketsOnly?: boolean }): Promise<{
    success: boolean;
    incidents: Incident[];
    requests: ServiceRequest[];
    error?: string;
  }> => {
    try {
      const [incidentsResponse, requestsResponse] = await Promise.all([
        incidentsAPI.getAll({ myTicketsOnly: options?.myTicketsOnly }),
        requestsAPI.getAll({ myTicketsOnly: options?.myTicketsOnly })
      ]);

      if (!incidentsResponse.success || !requestsResponse.success) {
        throw new Error(
          incidentsResponse.error || requestsResponse.error || 'Failed to fetch tickets'
        );
      }

      return {
        success: true,
        incidents: incidentsResponse.data || [],
        requests: requestsResponse.data || [],
      };
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      return {
        success: false,
        incidents: [],
        requests: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
};

// =============================================
// INTEGRATION CATALOG API
// =============================================

// External System interfaces
export interface ExternalSystem {
  ExternalSystemId: number;
  SystemName: string;
  Vendor: string;
  Category: string;
  Description?: string;
  BaseUrl?: string;
  DocumentationUrl?: string;
  ContactEmail?: string;
  ContractExpiry?: string;
  Status: string;
  CreatedAt: string;
  UpdatedAt?: string;
  CreatedBy?: string;
}

export interface CreateExternalSystemData {
  systemName: string;
  vendor: string;
  category: string;
  description?: string;
  baseUrl?: string;
  documentationUrl?: string;
  contactEmail?: string;
  contractExpiry?: string;
  status?: string;
  createdBy?: string;
}

// Integration interfaces
export interface Integration {
  IntegrationId: number;
  IntegrationName: string;
  Description?: string;
  IntegrationType: string;
  Direction: string;
  SourceType: string;
  SourceServiceId?: number;
  SourceCiId?: number;
  SourceExternalId?: number;
  TargetType: string;
  TargetServiceId?: number;
  TargetCiId?: number;
  TargetExternalId?: number;
  Protocol?: string;
  AuthMethod?: string;
  Endpoint?: string;
  Port?: number;
  DataFormat?: string;
  DataClassification?: string;
  FrequencyType?: string;
  FrequencyDetails?: string;
  Status: string;
  HealthStatus?: string;
  LastHealthCheck?: string;
  SLA?: string;
  Owner?: string;
  CreatedAt: string;
  UpdatedAt?: string;
  CreatedBy?: string;
  // Expanded fields from view
  SourceServiceName?: string;
  SourceCiName?: string;
  SourceExternalName?: string;
  TargetServiceName?: string;
  TargetCiName?: string;
  TargetExternalName?: string;
  SourceName?: string;
  TargetName?: string;
}

export interface CreateIntegrationData {
  integrationName: string;
  description?: string;
  integrationType: string;
  direction: string;
  sourceType: string;
  sourceServiceId?: number;
  sourceCiId?: number;
  sourceExternalId?: number;
  targetType: string;
  targetServiceId?: number;
  targetCiId?: number;
  targetExternalId?: number;
  protocol?: string;
  authMethod?: string;
  endpoint?: string;
  port?: number;
  dataFormat?: string;
  dataClassification?: string;
  frequencyType?: string;
  frequencyDetails?: string;
  status?: string;
  healthStatus?: string;
  sla?: string;
  owner?: string;
  createdBy?: string;
}

// Integration Data Field interfaces
export interface IntegrationDataField {
  DataFieldId: number;
  IntegrationId: number;
  FieldName: string;
  FieldType: string;
  Direction: string;
  IsPII: boolean;
  IsRequired: boolean;
  SampleValue?: string;
  Description?: string;
  CreatedAt: string;
  UpdatedAt?: string;
}

export interface CreateIntegrationDataFieldData {
  integrationId: number;
  fieldName: string;
  fieldType?: string;
  direction?: string;
  isPII?: boolean;
  isRequired?: boolean;
  sampleValue?: string;
  description?: string;
}

// External Systems API
export const externalSystemsAPI = {
  // Get all external systems
  getAll: async (filters?: {
    status?: string;
    category?: string;
  }): Promise<ApiResponse<ExternalSystem[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    const endpoint = `/external-systems${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ExternalSystem[]>(endpoint);
  },

  // Get a single external system by ID
  getById: async (id: number): Promise<ApiResponse<ExternalSystem>> => {
    return apiRequest<ExternalSystem>(`/external-systems/${id}`);
  },

  // Create a new external system
  create: async (data: CreateExternalSystemData): Promise<ApiResponse<ExternalSystem>> => {
    return apiRequest<ExternalSystem>('/external-systems', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update an external system
  update: async (id: number, data: Partial<CreateExternalSystemData>): Promise<ApiResponse<ExternalSystem>> => {
    return apiRequest<ExternalSystem>(`/external-systems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete an external system
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/external-systems/${id}`, {
      method: 'DELETE',
    });
  },
};

// Integrations API
export const integrationsAPI = {
  // Get all integrations
  getAll: async (filters?: {
    status?: string;
    integrationType?: string;
    sourceType?: string;
    targetType?: string;
    healthStatus?: string;
  }): Promise<ApiResponse<Integration[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.integrationType) params.append('integrationType', filters.integrationType);
    if (filters?.sourceType) params.append('sourceType', filters.sourceType);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.healthStatus) params.append('healthStatus', filters.healthStatus);
    
    const queryString = params.toString();
    const endpoint = `/integrations${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<Integration[]>(endpoint);
  },

  // Get a single integration by ID
  getById: async (id: number): Promise<ApiResponse<Integration>> => {
    return apiRequest<Integration>(`/integrations/${id}`);
  },

  // Create a new integration
  create: async (data: CreateIntegrationData): Promise<ApiResponse<Integration>> => {
    return apiRequest<Integration>('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update an integration
  update: async (id: number, data: Partial<CreateIntegrationData>): Promise<ApiResponse<Integration>> => {
    return apiRequest<Integration>(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete an integration
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/integrations/${id}`, {
      method: 'DELETE',
    });
  },

  // Update health status
  updateHealth: async (id: number, healthStatus: string): Promise<ApiResponse<Integration>> => {
    return apiRequest<Integration>(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ healthStatus }),
    });
  },
};

// Integration Data Fields API
export const integrationDataFieldsAPI = {
  // Get all data fields for an integration
  getByIntegration: async (integrationId: number): Promise<ApiResponse<IntegrationDataField[]>> => {
    return apiRequest<IntegrationDataField[]>(`/integrations/${integrationId}/data-fields`);
  },

  // Get a single data field by ID
  getById: async (id: number): Promise<ApiResponse<IntegrationDataField>> => {
    return apiRequest<IntegrationDataField>(`/integration-data-fields/${id}`);
  },

  // Create a new data field
  create: async (data: CreateIntegrationDataFieldData): Promise<ApiResponse<IntegrationDataField>> => {
    return apiRequest<IntegrationDataField>('/integration-data-fields', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bulk create data fields
  bulkCreate: async (integrationId: number, fields: Omit<CreateIntegrationDataFieldData, 'integrationId'>[]): Promise<ApiResponse<{
    created: number;
    fields: IntegrationDataField[];
  }>> => {
    return apiRequest<{ created: number; fields: IntegrationDataField[] }>(
      `/integrations/${integrationId}/data-fields/bulk`,
      {
        method: 'POST',
        body: JSON.stringify({ fields }),
      }
    );
  },

  // Update a data field
  update: async (id: number, data: Partial<CreateIntegrationDataFieldData>): Promise<ApiResponse<IntegrationDataField>> => {
    return apiRequest<IntegrationDataField>(`/integration-data-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a data field
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/integration-data-fields/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// CMDB API - Services and Configuration Items
// =============================================

// Service interfaces
export interface Service {
  ServiceId: number;
  ServiceName: string;
  Description?: string;
  BusinessOwner?: string;
  TechnicalOwner?: string;
  Criticality: string;
  Status: string;
  SLA?: string;
  SupportGroupId?: number;
  SupportGroup?: string;
  CreatedDate: string;
  CreatedBy?: string;
  ModifiedDate?: string;
  ModifiedBy?: string;
  CiCount?: number;
}

export interface CreateServiceData {
  serviceName: string;
  description?: string;
  businessOwner?: string;
  technicalOwner?: string;
  criticality?: string;
  status?: string;
  sla?: string;
  supportGroupId?: number;
}

// Configuration Item interfaces
export interface ConfigurationItem {
  CiId: number;
  CiName: string;
  CiType: string;
  SubType?: string;
  Status: string;
  Environment?: string;
  Location?: string;
  IpAddress?: string;
  Hostname?: string;
  Version?: string;
  Vendor?: string;
  SupportGroupId?: number;
  SupportGroup?: string;
  Owner?: string;
  Description?: string;
  Attributes?: string;
  SerialNumber?: string;
  AssetTag?: string;
  CreatedDate: string;
  CreatedBy?: string;
  ModifiedDate?: string;
  ModifiedBy?: string;
}

export interface CreateConfigurationItemData {
  ciName: string;
  ciType: string;
  subType?: string;
  status?: string;
  environment?: string;
  location?: string;
  ipAddress?: string;
  hostname?: string;
  version?: string;
  vendor?: string;
  supportGroupId?: number;
  owner?: string;
  description?: string;
  attributes?: string;
  serialNumber?: string;
  assetTag?: string;
}

// Services API
export const servicesAPI = {
  // Get all services
  getAll: async (filters?: {
    status?: string;
    criticality?: string;
  }): Promise<ApiResponse<Service[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.criticality) params.append('criticality', filters.criticality);
    
    const queryString = params.toString();
    const endpoint = `/services${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<Service[]>(endpoint);
  },

  // Get a single service by ID
  getById: async (id: number): Promise<ApiResponse<Service>> => {
    return apiRequest<Service>(`/services?id=${id}`);
  },

  // Create a new service
  create: async (data: CreateServiceData): Promise<ApiResponse<Service>> => {
    return apiRequest<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a service
  update: async (id: number, data: Partial<CreateServiceData>): Promise<ApiResponse<Service>> => {
    return apiRequest<Service>('/services', {
      method: 'PUT',
      body: JSON.stringify({ serviceId: id, ...data }),
    });
  },

  // Delete a service
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/services?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Configuration Items API
export const configurationItemsAPI = {
  // Get all configuration items
  getAll: async (filters?: {
    status?: string;
    type?: string;
    environment?: string;
  }): Promise<ApiResponse<ConfigurationItem[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.environment) params.append('environment', filters.environment);
    
    const queryString = params.toString();
    const endpoint = `/configuration-items${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ConfigurationItem[]>(endpoint);
  },

  // Get a single CI by ID
  getById: async (id: number): Promise<ApiResponse<ConfigurationItem>> => {
    return apiRequest<ConfigurationItem>(`/configuration-items?id=${id}`);
  },

  // Create a new CI
  create: async (data: CreateConfigurationItemData): Promise<ApiResponse<ConfigurationItem>> => {
    return apiRequest<ConfigurationItem>('/configuration-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a CI
  update: async (id: number, data: Partial<CreateConfigurationItemData>): Promise<ApiResponse<ConfigurationItem>> => {
    return apiRequest<ConfigurationItem>('/configuration-items', {
      method: 'PUT',
      body: JSON.stringify({ ciId: id, ...data }),
    });
  },

  // Delete a CI
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/configuration-items?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// CHANGE MANAGEMENT API
// =============================================

// Change Request interfaces
export interface ChangeRequest {
  ChangeId: number;
  ChangeNumber: string;
  Title: string;
  Description?: string;
  Justification?: string;
  ChangeType: 'Normal' | 'Standard' | 'Emergency' | 'Expedited';
  Category: string;
  Priority: 'Low' | 'Medium' | 'High' | 'Critical';
  RiskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  Impact: 'Low' | 'Medium' | 'High' | 'Critical';
  Status: 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Scheduled' | 'In Progress' | 'Completed' | 'Failed' | 'Cancelled' | 'Rejected' | 'Rolled Back';
  Environment: string;
  RequestedBy: string;
  AssignedTo?: string;
  AssignmentGroupId?: number;
  AssignmentGroupName?: string;
  ChangeManager?: string;
  RequiresCAB: boolean;
  CABDate?: string;
  CABNotes?: string;
  RequestedStartDate?: string;
  RequestedEndDate?: string;
  ScheduledStartDate?: string;
  ScheduledEndDate?: string;
  ActualStartDate?: string;
  ActualEndDate?: string;
  ImplementationPlan?: string;
  BackoutPlan?: string;
  TestPlan?: string;
  CommunicationPlan?: string;
  PrimaryServiceId?: number;
  PrimaryServiceName?: string;
  ClosureCode?: string;
  ClosureNotes?: string;
  CreatedDate: string;
  ModifiedDate?: string;
  CreatedBy: string;
  ModifiedBy?: string;
  // Expanded fields from view
  ImpactedCICount?: number;
  ImpactedIntegrationCount?: number;
  TaskCount?: number;
  CompletedTaskCount?: number;
  PendingApprovalCount?: number;
  // Detail fields
  impactedCIs?: ChangeImpactedCI[];
  impactedIntegrations?: ChangeImpactedIntegration[];
  approvals?: ChangeApproval[];
  tasks?: ChangeTask[];
}

export interface CreateChangeRequestData {
  title: string;
  description?: string;
  justification?: string;
  changeType?: 'Normal' | 'Standard' | 'Emergency' | 'Expedited';
  category?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  impact?: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: string;
  environment?: string;
  requestedStartDate?: string;
  requestedEndDate?: string;
  implementationPlan?: string;
  backoutPlan?: string;
  testPlan?: string;
  communicationPlan?: string;
  primaryServiceId?: number;
  assignedTo?: string;
  assignmentGroupId?: number;
  changeManager?: string;
  requiresCAB?: boolean;
}

// Change Impacted CI interfaces
export interface ChangeImpactedCI {
  ImpactId: number;
  ChangeId: number;
  ServiceId?: number;
  CiId?: number;
  ImpactType: string;
  RiskLevel?: string;
  NotificationRequired: boolean;
  NotificationSent: boolean;
  ServiceName?: string;
  CiName?: string;
  CiType?: string;
}

// Change Impacted Integration interfaces
export interface ChangeImpactedIntegration {
  ImpactId: number;
  ChangeId: number;
  IntegrationId: number;
  ImpactType: string;
  NotificationRequired: boolean;
  NotificationSent: boolean;
  IntegrationName?: string;
  IntegrationType?: string;
  Direction?: string;
}

// Change Approval interfaces
export interface ChangeApproval {
  ApprovalId: number;
  ChangeId: number;
  ApproverEmail: string;
  ApprovalStatus: 'Pending' | 'Approved' | 'Rejected';
  ApprovalDate?: string;
  RequestedDate: string;
  Comments?: string;
}

// Change Task interfaces
export interface ChangeTask {
  TaskId: number;
  ChangeId: number;
  TaskNumber: string;
  Title: string;
  Description?: string;
  TaskType: string;
  Sequence: number;
  Status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed' | 'Skipped';
  AssignedTo?: string;
  StartDate?: string;
  EndDate?: string;
  Notes?: string;
}

// Impact Analysis interfaces
export interface ChangeImpactAnalysis {
  dependentServices: any[];
  downstreamCIs: any[];
  potentiallyAffectedIntegrations: any[];
}

// Changes API
export const changesAPI = {
  // Get all changes with optional filtering
  getAll: async (filters?: {
    status?: string;
    changeType?: string;
    priority?: string;
    environment?: string;
    assignedTo?: string;
    myChangesOnly?: boolean;
  }): Promise<ApiResponse<ChangeRequest[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.changeType) params.append('changeType', filters.changeType);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.environment) params.append('environment', filters.environment);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.myChangesOnly) params.append('myChangesOnly', 'true');
    
    const queryString = params.toString();
    const endpoint = `/changes${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ChangeRequest[]>(endpoint);
  },

  // Get a single change by ID (includes details)
  getById: async (id: number): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`);
  },

  // Create a new change request
  create: async (data: CreateChangeRequestData): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>('/changes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a change request
  update: async (id: number, data: Partial<CreateChangeRequestData> & { 
    status?: string;
    scheduledStartDate?: string;
    scheduledEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    closureCode?: string;
    closureNotes?: string;
    cabDate?: string;
    cabNotes?: string;
  }): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a change request
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/changes/${id}`, {
      method: 'DELETE',
    });
  },

  // Impact Assessment
  getImpactAnalysis: async (changeId: number): Promise<ApiResponse<ChangeImpactAnalysis>> => {
    return apiRequest<ChangeImpactAnalysis>(`/changes/${changeId}/impact-analysis`);
  },

  // Add impacted CI
  addImpactedCI: async (changeId: number, data: {
    serviceId?: number;
    ciId?: number;
    impactType: string;
    riskLevel?: string;
    notificationRequired?: boolean;
  }): Promise<ApiResponse<ChangeImpactedCI>> => {
    return apiRequest<ChangeImpactedCI>(`/changes/${changeId}/impacted-cis`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Remove impacted CI
  removeImpactedCI: async (changeId: number, impactId: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/changes/${changeId}/impacted-cis/${impactId}`, {
      method: 'DELETE',
    });
  },

  // Add impacted integration
  addImpactedIntegration: async (changeId: number, data: {
    integrationId: number;
    impactType: string;
    notificationRequired?: boolean;
  }): Promise<ApiResponse<ChangeImpactedIntegration>> => {
    return apiRequest<ChangeImpactedIntegration>(`/changes/${changeId}/impacted-integrations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Remove impacted integration
  removeImpactedIntegration: async (changeId: number, impactId: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/changes/${changeId}/impacted-integrations/${impactId}`, {
      method: 'DELETE',
    });
  },

  // Approvals
  approve: async (changeId: number, data: { approved: boolean; comments?: string }): Promise<ApiResponse<ChangeApproval>> => {
    return apiRequest<ChangeApproval>(`/changes/${changeId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Tasks
  addTask: async (changeId: number, data: {
    title: string;
    description?: string;
    taskType: string;
    sequence?: number;
    assignedTo?: string;
  }): Promise<ApiResponse<ChangeTask>> => {
    return apiRequest<ChangeTask>(`/changes/${changeId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTask: async (changeId: number, taskId: number, data: Partial<ChangeTask>): Promise<ApiResponse<ChangeTask>> => {
    return apiRequest<ChangeTask>(`/changes/${changeId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTask: async (changeId: number, taskId: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/changes/${changeId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Lifecycle transitions
  submitForApproval: async (id: number): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Submitted' }),
    });
  },

  schedule: async (id: number, scheduledStartDate: string, scheduledEndDate: string): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Scheduled', scheduledStartDate, scheduledEndDate }),
    });
  },

  startImplementation: async (id: number): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'In Progress', actualStartDate: new Date().toISOString() }),
    });
  },

  complete: async (id: number, closureCode?: string, closureNotes?: string): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Completed', actualEndDate: new Date().toISOString(), closureCode, closureNotes }),
    });
  },

  fail: async (id: number, closureNotes?: string): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Failed', actualEndDate: new Date().toISOString(), closureCode: 'Failed', closureNotes }),
    });
  },

  rollback: async (id: number, closureNotes?: string): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Rolled Back', actualEndDate: new Date().toISOString(), closureCode: 'Rolled Back', closureNotes }),
    });
  },

  cancel: async (id: number, closureNotes?: string): Promise<ApiResponse<ChangeRequest>> => {
    return apiRequest<ChangeRequest>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Cancelled', closureCode: 'Cancelled', closureNotes }),
    });
  },
};

// ==================== User Settings API (Cosmos DB) ====================

// Saved Filter interfaces
export interface SavedFilterCriteria {
  ticketType?: 'incident' | 'request' | 'all';
  status?: string[];
  priority?: string[];
  urgency?: string[];
  assignmentGroup?: string;
  assignedTo?: string | null; // null = any, "me" = current user, or specific email
  createdDateRange?: {
    type: 'relative' | 'absolute';
    value: string | { start: string; end: string };
  };
  searchText?: string;
}

export interface SavedFilter {
  name: string;
  icon?: string;
  showInSidebar: boolean;
  filters: SavedFilterCriteria;
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSetting {
  id: string;
  userEmail: string;
  settingType: 'saved_filter' | 'preference' | 'dashboard_layout';
  settingKey: string;
  settingValue: SavedFilter | Record<string, unknown>;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

export const userSettingsAPI = {
  // Get all settings for current user, optionally filtered by type
  getAll: async (type?: string): Promise<ApiResponse<UserSetting[]>> => {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiRequest<UserSetting[]>(`/user-settings${query}`);
  },

  // Get all saved filters for current user
  getSavedFilters: async (): Promise<ApiResponse<UserSetting[]>> => {
    return apiRequest<UserSetting[]>('/user-settings?type=saved_filter');
  },

  // Get a specific setting by ID
  getById: async (id: string): Promise<ApiResponse<UserSetting>> => {
    return apiRequest<UserSetting>(`/user-settings/${id}`);
  },

  // Create a new setting
  create: async (data: {
    settingType: 'saved_filter' | 'preference' | 'dashboard_layout';
    settingKey: string;
    settingValue: SavedFilter | Record<string, unknown>;
    displayOrder?: number;
  }): Promise<ApiResponse<UserSetting>> => {
    return apiRequest<UserSetting>('/user-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Create a saved filter (convenience method)
  createSavedFilter: async (filter: SavedFilter): Promise<ApiResponse<UserSetting>> => {
    return apiRequest<UserSetting>('/user-settings', {
      method: 'POST',
      body: JSON.stringify({
        settingType: 'saved_filter',
        settingKey: filter.name.toLowerCase().replace(/\s+/g, '-'),
        settingValue: filter,
      }),
    });
  },

  // Update a setting
  update: async (id: string, data: Partial<{
    settingKey: string;
    settingValue: SavedFilter | Record<string, unknown>;
    displayOrder: number;
    isActive: boolean;
  }>): Promise<ApiResponse<UserSetting>> => {
    return apiRequest<UserSetting>(`/user-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a setting
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/user-settings/${id}`, {
      method: 'DELETE',
    });
  },

  // Reorder settings
  reorder: async (settingType: string, order: { id: string; displayOrder: number }[]): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/user-settings/reorder', {
      method: 'PUT',
      body: JSON.stringify({ settingType, order }),
    });
  },
};