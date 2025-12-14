import { CosmosClient, Container, Database } from '@azure/cosmos';

let client: CosmosClient | null = null;
let database: Database | null = null;
let userSettingsContainer: Container | null = null;

const DATABASE_NAME = 'VibeNowMetadata';
const USER_SETTINGS_CONTAINER = 'UserSettings';

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
