// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:7071/api'  // Local Azure Functions
  : '/api';  // Production (Azure Static Web App)

// Helper function to get user info for API calls
const getUserInfo = async () => {
  try {
    const response = await fetch('/.auth/me');
    if (response.ok) {
      const authPayload = await response.json();
      return authPayload.clientPrincipal;
    }
  } catch (error) {
    console.warn('Could not get user info:', error);
  }
  return null;
};

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
  createdBy?: string;
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