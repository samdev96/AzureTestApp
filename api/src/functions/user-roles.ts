import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function userRoles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for user-roles.`);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }

    try {
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let currentUserEmail = '';
        let currentUserObjectId = '';
        
        // Check if we're in development mode (no auth headers)
        const isDevelopment = !userPrincipalHeader && request.url.includes('localhost');
        
        // Log all headers for debugging
        context.log('Request headers:', Object.fromEntries(request.headers.entries()));
        context.log('User principal header present:', !!userPrincipalHeader);
        context.log('Is development mode:', isDevelopment);
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                currentUserEmail = userPrincipal.userDetails || '';
                currentUserObjectId = userPrincipal.userId || '';
                
                context.log('Parsed user principal:', { 
                    userDetails: userPrincipal.userDetails, 
                    userId: userPrincipal.userId,
                    currentUserEmail, 
                    currentUserObjectId 
                });
            } catch (e) {
                context.log('Error parsing user principal:', e);
                return {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid authentication - failed to parse user principal'
                    })
                };
            }
        } else if (isDevelopment) {
            // Use test credentials for local development
            currentUserEmail = 'admin@test.com';
            currentUserObjectId = 'test-admin-id';
            context.log('Development mode: using test admin user');
        } else {
            // In production without auth headers, this might be an unauthenticated request
            context.log('No authentication header found in production');
            return {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Authentication required - please log in to access this feature'
                })
            };
        }

        const pool = await getDbConnection();

        if (request.method === 'GET') {
            // Check if this is a request for all users or current user
            const url = new URL(request.url);
            const getAllUsers = url.searchParams.get('all') === 'true';

            if (getAllUsers) {
                // Verify current user is admin
                if (!isDevelopment) {
                    const adminCheckRequest = pool.request();
                    adminCheckRequest.input('userEmail', currentUserEmail);
                    adminCheckRequest.input('userObjectId', currentUserObjectId);
                    
                    try {
                        const adminResult = await adminCheckRequest.query(`
                            SELECT RoleName 
                            FROM UserRoles 
                            WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                                AND RoleName = 'admin' 
                                AND IsActive = 1
                        `);
                        
                        if (adminResult.recordset.length === 0) {
                            return {
                                status: 403,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                },
                                body: JSON.stringify({
                                    success: false,
                                    error: 'Admin access required'
                                })
                            };
                        }
                    } catch (dbError) {
                        context.log('Admin check error:', dbError);
                        // In development, if table doesn't exist, assume admin access
                        if (!dbError.message?.includes('Invalid object name')) {
                            throw dbError;
                        }
                    }
                } else {
                    context.log('Development mode: skipping admin check');
                }

                // Get all users with their roles
                context.log('Attempting to query UserRoles table for all users');
                const usersRequest = pool.request();
                let usersResult;
                
                try {
                    usersResult = await usersRequest.query(`
                        SELECT DISTINCT 
                            COALESCE(ur.UserEmail, '') as UserEmail,
                            COALESCE(ur.UserObjectID, '') as UserObjectID,
                            COALESCE(ur.RoleName, 'user') as RoleName,
                            ur.AssignedDate,
                            ur.AssignedBy,
                            CASE WHEN ur.RoleName = 'admin' THEN 1 ELSE 0 END as IsAdmin
                        FROM UserRoles ur
                        WHERE ur.IsActive = 1
                        ORDER BY ur.UserEmail, ur.AssignedDate DESC
                    `);
                    
                    context.log('Database query successful, found', usersResult.recordset.length, 'users');
                } catch (dbError) {
                    context.log('Database query error:', {
                        message: dbError.message,
                        code: dbError.code,
                        severity: dbError.severity,
                        state: dbError.state
                    });
                    
                    // If UserRoles table doesn't exist and we're in development, return sample data
                    if (isDevelopment && dbError.message?.includes('Invalid object name')) {
                        context.log('UserRoles table not found, returning sample data for development');
                        return {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: true,
                                data: [
                                    {
                                        userEmail: 'admin@test.com',
                                        userObjectId: 'test-admin-id',
                                        role: 'admin',
                                        isAdmin: true,
                                        assignedDate: new Date().toISOString(),
                                        assignedBy: 'system'
                                    },
                                    {
                                        userEmail: 'user@test.com',
                                        userObjectId: 'test-user-id',
                                        role: 'user',
                                        isAdmin: false,
                                        assignedDate: new Date().toISOString(),
                                        assignedBy: 'system'
                                    }
                                ],
                                total: 2
                            })
                        };
                    }
                    
                    // Return a more detailed error for debugging
                    return {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            error: `Database error: ${dbError.message}`,
                            details: isDevelopment ? {
                                code: dbError.code,
                                severity: dbError.severity,
                                state: dbError.state
                            } : undefined
                        })
                    };
                }

                // Group users and get their primary role (most recent)
                const userMap = new Map();
                usersResult.recordset.forEach(row => {
                    const key = row.UserEmail || row.UserObjectID;
                    if (!userMap.has(key) || row.AssignedDate > userMap.get(key).AssignedDate) {
                        userMap.set(key, {
                            userEmail: row.UserEmail,
                            userObjectId: row.UserObjectID,
                            role: row.RoleName || 'user',
                            isAdmin: row.IsAdmin === 1,
                            assignedDate: row.AssignedDate,
                            assignedBy: row.AssignedBy
                        });
                    }
                });

                const users = Array.from(userMap.values());
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: users,
                        total: users.length
                    })
                };
            } else {
                // Get current user's roles (existing functionality)
                const rolesRequest = pool.request();
                rolesRequest.input('userEmail', currentUserEmail);
                rolesRequest.input('userObjectId', currentUserObjectId);
                
                const rolesResult = await rolesRequest.query(`
                    SELECT RoleName, AssignedDate, AssignedBy 
                    FROM UserRoles 
                    WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                        AND IsActive = 1
                    ORDER BY AssignedDate DESC
                `);
                
                const roles = rolesResult.recordset.map(row => row.RoleName);
                const isAdmin = roles.includes('admin');
                
                context.log('User roles found:', { currentUserEmail, roles, isAdmin });
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        userEmail: currentUserEmail,
                        userObjectId: currentUserObjectId,
                        roles,
                        isAdmin,
                        roleDetails: rolesResult.recordset
                    })
                };
            }
        } else if (request.method === 'PUT') {
            // Update user role - admin only
            if (!isDevelopment) {
                const adminCheckRequest = pool.request();
                adminCheckRequest.input('userEmail', currentUserEmail);
                adminCheckRequest.input('userObjectId', currentUserObjectId);
                
                try {
                    const adminResult = await adminCheckRequest.query(`
                        SELECT RoleName 
                        FROM UserRoles 
                        WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                            AND RoleName = 'admin' 
                            AND IsActive = 1
                    `);
                    
                    if (adminResult.recordset.length === 0) {
                        return {
                            status: 403,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: false,
                                error: 'Admin access required'
                            })
                        };
                    }
                } catch (dbError) {
                    context.log('Admin check error for PUT:', dbError);
                    // In development, if table doesn't exist, assume admin access
                    if (!dbError.message?.includes('Invalid object name')) {
                        throw dbError;
                    }
                }
            } else {
                context.log('Development mode: skipping admin check for PUT');
            }

            // Parse request body
            const requestText = await request.text();
            const { targetUserEmail, newRole } = JSON.parse(requestText);

            if (!targetUserEmail || !newRole) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'targetUserEmail and newRole are required'
                    })
                };
            }

            // Validate role
            if (!['user', 'admin'].includes(newRole)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Role must be either "user" or "admin"'
                    })
                };
            }

            try {
                // Deactivate existing roles for the target user
                const deactivateRequest = pool.request();
                deactivateRequest.input('targetUserEmail', targetUserEmail);
                
                await deactivateRequest.query(`
                    UPDATE UserRoles 
                    SET IsActive = 0 
                    WHERE UserEmail = @targetUserEmail AND IsActive = 1
                `);

                // Insert new role
                const insertRequest = pool.request();
                insertRequest.input('targetUserEmail', targetUserEmail);
                insertRequest.input('newRole', newRole);
                insertRequest.input('assignedBy', currentUserEmail);
                
                await insertRequest.query(`
                    INSERT INTO UserRoles (UserEmail, RoleName, AssignedDate, AssignedBy, IsActive)
                    VALUES (@targetUserEmail, @newRole, GETDATE(), @assignedBy, 1)
                `);

                context.log('User role updated:', { targetUserEmail, newRole, assignedBy: currentUserEmail });
            } catch (dbError) {
                context.log('Database error updating role:', dbError);
                
                // In development mode, if table doesn't exist, simulate success
                if (isDevelopment && dbError.message?.includes('Invalid object name')) {
                    context.log('Development mode: simulating successful role update');
                } else {
                    throw dbError;
                }
            }

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: `User role updated to ${newRole}`,
                    data: {
                        targetUserEmail,
                        newRole,
                        assignedBy: currentUserEmail,
                        assignedDate: new Date().toISOString()
                    }
                })
            };
        } else {
            return {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed'
                })
            };
        }
        
    } catch (error) {
        context.log('Error in user-roles:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorInfo.message
            })
        };
    }
}

// Register the function
app.http('user-roles', {
    methods: ['GET', 'PUT', 'OPTIONS'],
    route: 'user-roles',
    authLevel: 'anonymous',
    handler: userRoles
});