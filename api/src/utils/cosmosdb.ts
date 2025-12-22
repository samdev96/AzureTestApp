import { CosmosClient, Container, Database } from '@azure/cosmos';

let client: CosmosClient | null = null;
let database: Database | null = null;
let userSettingsContainer: Container | null = null;
let workflowsContainer: Container | null = null;

const DATABASE_NAME = 'VibeNowMetadata';
const USER_SETTINGS_CONTAINER = 'UserSettings';
const WORKFLOWS_CONTAINER = 'Workflows';

function getCosmosClient(): CosmosClient {
    if (!client) {
        const connectionString = process.env.COSMOSDB_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('COSMOSDB_CONNECTION_STRING environment variable is not set');
        }
        client = new CosmosClient(connectionString);
    }
    return client;
}

function getDatabase(): Database {
    if (!database) {
        database = getCosmosClient().database(DATABASE_NAME);
    }
    return database;
}

export function getUserSettingsContainer(): Container {
    if (!userSettingsContainer) {
        userSettingsContainer = getDatabase().container(USER_SETTINGS_CONTAINER);
    }
    return userSettingsContainer;
}

export function getWorkflowsContainer(): Container {
    if (!workflowsContainer) {
        workflowsContainer = getDatabase().container(WORKFLOWS_CONTAINER);
    }
    return workflowsContainer;
}

// Types for User Settings
export interface SavedFilter {
    name: string;
    icon?: string;
    showInSidebar: boolean;
    filters: {
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
    };
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

// Helper to generate a unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Workflow Types
export type WorkflowType = 'request' | 'incident' | 'change' | 'cmdb' | 'integration';
export type StageType = 'initial' | 'intermediate' | 'final';
export type ActionType = 'status_change' | 'assignment' | 'notification' | 'field_update' | 'integration';
export type ActionTrigger = 'on_enter' | 'on_exit' | 'manual';
export type NotificationRecipient = 'requester' | 'assignee' | 'approver' | 'watchers' | 'manager' | 'specific_role';
export type NotificationTrigger = 'on_enter' | 'on_exit' | 'sla_warning' | 'sla_breach';
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';

export interface WorkflowCondition {
    field: string;
    operator: ConditionOperator;
    value: any;
}

export interface WorkflowAction {
    id: string;
    type: ActionType;
    trigger: ActionTrigger;
    config: Record<string, any>;
}

export interface WorkflowNotification {
    recipient: NotificationRecipient;
    trigger: NotificationTrigger;
    template: string;
}

export interface WorkflowSLA {
    duration: number; // in hours
    warningThreshold: number; // percentage (e.g., 80)
}

export interface WorkflowStage {
    id: string;
    name: string;
    type: StageType;
    color: string;
    icon?: string;
    order: number;
    actions: WorkflowAction[];
    notifications?: WorkflowNotification[];
    sla?: WorkflowSLA;
}

export interface WorkflowTransition {
    id: string;
    fromStageId: string;
    toStageId: string;
    label: string;
    conditions?: WorkflowCondition[];
    requiredRole?: string[];
    requiresComment?: boolean;
    requiresApproval?: boolean;
    approvalRoles?: string[];
}

export interface WorkflowRule {
    id: string;
    name: string;
    description: string;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    priority: number;
}

export interface WorkflowDefinition {
    initialStatus: string;
    stages: WorkflowStage[];
    transitions: WorkflowTransition[];
    rules: WorkflowRule[];
}

export interface Workflow {
    id: string;
    workflowType: WorkflowType;
    name: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
    version: string;
    createdBy: string;
    createdDate: string;
    modifiedBy: string;
    modifiedDate: string;
    definition: WorkflowDefinition;
}
