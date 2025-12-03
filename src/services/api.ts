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
  role: 'user' | 'admin';
  isAdmin: boolean;
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
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
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
    role: 'user' | 'admin';
    assignmentGroups: number[];
  }): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update user role (admin only)
  updateRole: async (targetUserEmail: string, newRole: 'user' | 'admin'): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'PUT',
      body: JSON.stringify({ targetUserEmail, newRole }),
    });
  },

  // Update user details (admin only)
  update: async (userData: {
    targetUserEmail: string;
    displayName?: string;
    newRole?: 'user' | 'admin';
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
    isAdmin: boolean;
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