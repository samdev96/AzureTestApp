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
  }): Promise<ApiResponse<Incident[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    
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
  }): Promise<ApiResponse<ServiceRequest[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.urgency) params.append('urgency', filters.urgency);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    
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

  // Update user role (admin only)
  updateRole: async (targetUserEmail: string, newRole: 'user' | 'admin'): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/user-roles', {
      method: 'PUT',
      body: JSON.stringify({ targetUserEmail, newRole }),
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
  getAll: async (): Promise<{
    success: boolean;
    incidents: Incident[];
    requests: ServiceRequest[];
    error?: string;
  }> => {
    try {
      const [incidentsResponse, requestsResponse] = await Promise.all([
        incidentsAPI.getAll(),
        requestsAPI.getAll()
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