import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserSettingsContainer, UserSetting, SavedFilter, generateId } from "../utils/cosmosdb";

// Helper to get current user from request headers
function getCurrentUser(request: HttpRequest, context: InvocationContext): { email: string; objectId: string } | null {
    const userPrincipalHeader = request.headers.get('x-ms-client-principal');
    
    context.log('getCurrentUser - checking headers:', {
        hasUserPrincipal: !!userPrincipalHeader,
        url: request.url
    });
    
    if (userPrincipalHeader) {
        try {
            const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
            context.log('getCurrentUser - parsed principal:', {
                userDetails: userPrincipal.userDetails,
                userId: userPrincipal.userId
            });
            return {
                email: userPrincipal.userDetails || '',
                objectId: userPrincipal.userId || ''
            };
        } catch (e) {
            context.error('getCurrentUser - failed to parse principal:', e);
            return null;
        }
    }
    
    // Development mode
    if (request.url.includes('localhost')) {
        context.log('getCurrentUser - using dev mode user');
        return { email: 'admin@test.com', objectId: 'test-admin-id' };
    }
    
    context.log('getCurrentUser - no user found');
    return null;
}

// GET /api/user-settings - Get all settings for current user
// GET /api/user-settings?type=saved_filter - Get settings of specific type
// GET /api/user-settings/{id} - Get specific setting by ID
async function getUserSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = getCurrentUser(request, context);
    if (!user) {
        return {
            status: 401,
            jsonBody: { success: false, error: 'Authentication required' }
        };
    }

    try {
        const container = getUserSettingsContainer();
        const url = new URL(request.url);
        const settingType = url.searchParams.get('type');
        const pathParts = url.pathname.split('/');
        const settingId = pathParts.length > 3 ? pathParts[3] : null;

        if (settingId) {
            // Get specific setting by ID
            const { resource } = await container.item(settingId, user.email).read<UserSetting>();
            
            if (!resource || resource.userEmail !== user.email) {
                return {
                    status: 404,
                    jsonBody: { success: false, error: 'Setting not found' }
                };
            }

            return {
                status: 200,
                jsonBody: { success: true, data: resource }
            };
        }

        // Build query
        let query = 'SELECT * FROM c WHERE c.userEmail = @userEmail AND c.isActive = true';
        const parameters: { name: string; value: string }[] = [
            { name: '@userEmail', value: user.email }
        ];

        if (settingType) {
            query += ' AND c.settingType = @settingType';
            parameters.push({ name: '@settingType', value: settingType });
        }

        query += ' ORDER BY c.displayOrder ASC, c.createdDate DESC';

        const { resources } = await container.items
            .query<UserSetting>({ query, parameters })
            .fetchAll();

        return {
            status: 200,
            jsonBody: { 
                success: true, 
                data: resources,
                total: resources.length
            }
        };
    } catch (error) {
        context.error('Error fetching user settings:', error);
        return {
            status: 500,
            jsonBody: { success: false, error: 'Failed to fetch user settings' }
        };
    }
}

// POST /api/user-settings - Create new setting
async function createUserSetting(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = getCurrentUser(request, context);
    if (!user) {
        return {
            status: 401,
            jsonBody: { success: false, error: 'Authentication required' }
        };
    }

    try {
        const body = await request.json() as {
            settingType: 'saved_filter' | 'preference' | 'dashboard_layout';
            settingKey: string;
            settingValue: SavedFilter | Record<string, unknown>;
            displayOrder?: number;
        };

        if (!body.settingType || !body.settingKey || !body.settingValue) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'settingType, settingKey, and settingValue are required' }
            };
        }

        const container = getUserSettingsContainer();
        const now = new Date().toISOString();

        // Check if setting with same key already exists
        const { resources: existing } = await container.items
            .query<UserSetting>({
                query: 'SELECT * FROM c WHERE c.userEmail = @userEmail AND c.settingType = @settingType AND c.settingKey = @settingKey AND c.isActive = true',
                parameters: [
                    { name: '@userEmail', value: user.email },
                    { name: '@settingType', value: body.settingType },
                    { name: '@settingKey', value: body.settingKey }
                ]
            })
            .fetchAll();

        if (existing.length > 0) {
            return {
                status: 409,
                jsonBody: { success: false, error: 'A setting with this key already exists' }
            };
        }

        // Get max display order for this user's settings of this type
        const { resources: orderResults } = await container.items
            .query<number>({
                query: 'SELECT VALUE MAX(c.displayOrder) FROM c WHERE c.userEmail = @userEmail AND c.settingType = @settingType',
                parameters: [
                    { name: '@userEmail', value: user.email },
                    { name: '@settingType', value: body.settingType }
                ]
            })
            .fetchAll();

        const maxOrder = orderResults[0] ?? 0;

        const newSetting: UserSetting = {
            id: generateId(),
            userEmail: user.email,
            settingType: body.settingType,
            settingKey: body.settingKey,
            settingValue: body.settingValue,
            displayOrder: body.displayOrder ?? (maxOrder + 1),
            isActive: true,
            createdDate: now,
            modifiedDate: now
        };

        const { resource } = await container.items.create(newSetting);

        context.log('Created user setting:', { id: resource?.id, userEmail: user.email, settingType: body.settingType });

        return {
            status: 201,
            jsonBody: { success: true, data: resource }
        };
    } catch (error: any) {
        context.error('Error creating user setting:', error);
        context.error('Error details:', error.message, error.code, error.body);
        return {
            status: 500,
            jsonBody: { 
                success: false, 
                error: 'Failed to create user setting',
                details: error.message || String(error)
            }
        };
    }
}

// PUT /api/user-settings/{id} - Update setting
async function updateUserSetting(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = getCurrentUser(request, context);
    if (!user) {
        return {
            status: 401,
            jsonBody: { success: false, error: 'Authentication required' }
        };
    }

    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const settingId = pathParts.length > 3 ? pathParts[3] : null;

        if (!settingId) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Setting ID is required' }
            };
        }

        const container = getUserSettingsContainer();

        // Get existing setting
        const { resource: existing } = await container.item(settingId, user.email).read<UserSetting>();

        if (!existing || existing.userEmail !== user.email) {
            return {
                status: 404,
                jsonBody: { success: false, error: 'Setting not found' }
            };
        }

        const body = await request.json() as Partial<{
            settingKey: string;
            settingValue: SavedFilter | Record<string, unknown>;
            displayOrder: number;
            isActive: boolean;
        }>;

        const updatedSetting: UserSetting = {
            ...existing,
            settingKey: body.settingKey ?? existing.settingKey,
            settingValue: body.settingValue ?? existing.settingValue,
            displayOrder: body.displayOrder ?? existing.displayOrder,
            isActive: body.isActive ?? existing.isActive,
            modifiedDate: new Date().toISOString()
        };

        const { resource } = await container.item(settingId, user.email).replace(updatedSetting);

        context.log('Updated user setting:', { id: settingId, userEmail: user.email });

        return {
            status: 200,
            jsonBody: { success: true, data: resource }
        };
    } catch (error) {
        context.error('Error updating user setting:', error);
        return {
            status: 500,
            jsonBody: { success: false, error: 'Failed to update user setting' }
        };
    }
}

// DELETE /api/user-settings/{id} - Delete setting (soft delete)
async function deleteUserSetting(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = getCurrentUser(request, context);
    if (!user) {
        return {
            status: 401,
            jsonBody: { success: false, error: 'Authentication required' }
        };
    }

    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const settingId = pathParts.length > 3 ? pathParts[3] : null;

        if (!settingId) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Setting ID is required' }
            };
        }

        const container = getUserSettingsContainer();

        // Get existing setting
        const { resource: existing } = await container.item(settingId, user.email).read<UserSetting>();

        if (!existing || existing.userEmail !== user.email) {
            return {
                status: 404,
                jsonBody: { success: false, error: 'Setting not found' }
            };
        }

        // Soft delete
        const updatedSetting: UserSetting = {
            ...existing,
            isActive: false,
            modifiedDate: new Date().toISOString()
        };

        await container.item(settingId, user.email).replace(updatedSetting);

        context.log('Deleted user setting:', { id: settingId, userEmail: user.email });

        return {
            status: 200,
            jsonBody: { success: true, message: 'Setting deleted successfully' }
        };
    } catch (error) {
        context.error('Error deleting user setting:', error);
        return {
            status: 500,
            jsonBody: { success: false, error: 'Failed to delete user setting' }
        };
    }
}

// PUT /api/user-settings/reorder - Reorder settings
async function reorderUserSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const user = getCurrentUser(request, context);
    if (!user) {
        return {
            status: 401,
            jsonBody: { success: false, error: 'Authentication required' }
        };
    }

    try {
        const body = await request.json() as {
            settingType: string;
            order: { id: string; displayOrder: number }[];
        };

        if (!body.settingType || !body.order || !Array.isArray(body.order)) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'settingType and order array are required' }
            };
        }

        const container = getUserSettingsContainer();

        // Update each setting's display order
        for (const item of body.order) {
            const { resource: existing } = await container.item(item.id, user.email).read<UserSetting>();
            
            if (existing && existing.userEmail === user.email) {
                await container.item(item.id, user.email).replace({
                    ...existing,
                    displayOrder: item.displayOrder,
                    modifiedDate: new Date().toISOString()
                });
            }
        }

        context.log('Reordered user settings:', { userEmail: user.email, count: body.order.length });

        return {
            status: 200,
            jsonBody: { success: true, message: 'Settings reordered successfully' }
        };
    } catch (error) {
        context.error('Error reordering user settings:', error);
        return {
            status: 500,
            jsonBody: { success: false, error: 'Failed to reorder user settings' }
        };
    }
}

// Main handler
async function userSettingsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const url = new URL(request.url);
    const isReorder = url.pathname.endsWith('/reorder');

    // Add CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        let response: HttpResponseInit;

        switch (request.method) {
            case 'GET':
                response = await getUserSettings(request, context);
                break;
            case 'POST':
                response = await createUserSetting(request, context);
                break;
            case 'PUT':
                if (isReorder) {
                    response = await reorderUserSettings(request, context);
                } else {
                    response = await updateUserSetting(request, context);
                }
                break;
            case 'DELETE':
                response = await deleteUserSetting(request, context);
                break;
            default:
                response = {
                    status: 405,
                    jsonBody: { success: false, error: 'Method not allowed' }
                };
        }

        return { ...response, headers };
    } catch (error) {
        context.error('Unhandled error in user settings handler:', error);
        return {
            status: 500,
            headers,
            jsonBody: { success: false, error: 'Internal server error' }
        };
    }
}

app.http("user-settings", {
    methods: ["GET", "POST", "PUT", "DELETE"],
    authLevel: "anonymous",
    route: "user-settings/{*path}",
    handler: userSettingsHandler
});
