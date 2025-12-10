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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
            currentUserEmail = 'agent@test.com';
            currentUserObjectId = 'test-agent-id';
            context.log('Development mode: using test agent user');
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
                context.log('Checking admin access for getAllUsers request:', {
                    currentUserEmail,
                    currentUserObjectId,
                    isDevelopment
                });
                
                if (!isDevelopment) {
                    const adminCheckRequest = pool.request();
                    adminCheckRequest.input('userEmail', currentUserEmail);
                    adminCheckRequest.input('userObjectId', currentUserObjectId);
                    
                    context.log('Admin check SQL parameters:', {
                        userEmail: currentUserEmail,
                        userObjectId: currentUserObjectId
                    });
                    
                    try {
                        const agentResult = await adminCheckRequest.query(`
                            SELECT RoleName 
                            FROM UserRoles 
                            WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                                AND LOWER(RoleName) = 'agent' 
                                AND IsActive = 1
                        `);
                        
                        context.log('Agent check result:', {
                            recordCount: agentResult.recordset.length,
                            records: agentResult.recordset
                        });
                        
                        if (agentResult.recordset.length === 0) {
                            return {
                                status: 403,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                },
                                body: JSON.stringify({
                                    success: false,
                                    error: 'Agent access required - no agent role found for user',
                                    debug: isDevelopment ? {
                                        userEmail: currentUserEmail,
                                        userObjectId: currentUserObjectId
                                    } : undefined
                                })
                            };
                        }
                    } catch (dbError) {
                        context.log('Agent check error:', {
                            message: dbError.message,
                            code: dbError.code,
                            severity: dbError.severity
                        });
                        
                        return {
                            status: 500,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: false,
                                error: 'Database error during agent check',
                                details: isDevelopment ? dbError.message : undefined
                            })
                        };
                    }
                } else {
                    context.log('Development mode: skipping agent check');
                }

                // Get all users with their roles
                context.log('Attempting to query UserRoles table for all users');
                const usersRequest = pool.request();
                let usersResult;
                
                try {
                    usersResult = await usersRequest.query(`
                        SELECT 
                            COALESCE(ur.UserEmail, '') as UserEmail,
                            COALESCE(ur.UserObjectID, '') as UserObjectID,
                            COALESCE(ur.DisplayName, '') as DisplayName,
                            COALESCE(ur.RoleName, 'user') as RoleName,
                            ur.AssignedDate,
                            ur.AssignedBy,
                            CASE WHEN LOWER(ur.RoleName) = 'agent' THEN 1 ELSE 0 END as IsAgent
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
                                        userEmail: 'agent@test.com',
                                        userObjectId: 'test-agent-id',
                                        role: 'agent',
                                        isAgent: true,
                                        assignedDate: new Date().toISOString(),
                                        assignedBy: 'system'
                                    },
                                    {
                                        userEmail: 'user@test.com',
                                        userObjectId: 'test-user-id',
                                        role: 'user',
                                        isAgent: false,
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
                            displayName: row.DisplayName || '',
                            role: row.RoleName || 'user',
                            isAgent: row.IsAgent === 1,
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
                // Case-insensitive check for agent role
                const isAgent = roles.some(role => role.toLowerCase() === 'agent');
                
                context.log('User roles found:', { currentUserEmail, roles, isAgent });
                
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
                        isAgent,
                        roleDetails: rolesResult.recordset
                    })
                };
            }
        } else if (request.method === 'PUT') {
            // Update user role - agent only
            if (!isDevelopment) {
                const agentCheckRequest = pool.request();
                agentCheckRequest.input('userEmail', currentUserEmail);
                agentCheckRequest.input('userObjectId', currentUserObjectId);
                
                try {
                    const agentResult = await agentCheckRequest.query(`
                        SELECT RoleName 
                        FROM UserRoles 
                        WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                            AND LOWER(RoleName) = 'agent' 
                            AND IsActive = 1
                    `);
                    
                    if (agentResult.recordset.length === 0) {
                        return {
                            status: 403,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: false,
                                error: 'Agent access required'
                            })
                        };
                    }
                } catch (dbError) {
                    context.log('Agent check error for PUT:', dbError);
                    // In development, if table doesn't exist, assume admin access
                    if (!dbError.message?.includes('Invalid object name')) {
                        throw dbError;
                    }
                }
            } else {
                context.log('Development mode: skipping agent check for PUT');
            }

            // Parse request body
            const requestText = await request.text();
            const { targetUserEmail, newRole, displayName } = JSON.parse(requestText);

            if (!targetUserEmail) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'targetUserEmail is required'
                    })
                };
            }

            // Validate role if provided
            if (newRole && !['user', 'agent'].includes(newRole)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Role must be either "user" or "agent"'
                    })
                };
            }

            try {
                // If displayName is provided, update it on existing records
                if (displayName !== undefined) {
                    const updateDisplayNameRequest = pool.request();
                    updateDisplayNameRequest.input('targetUserEmail', targetUserEmail);
                    updateDisplayNameRequest.input('displayName', displayName);
                    
                    await updateDisplayNameRequest.query(`
                        UPDATE UserRoles 
                        SET DisplayName = @displayName
                        WHERE UserEmail = @targetUserEmail
                    `);
                    
                    context.log('Display name updated:', { targetUserEmail, displayName });
                }

                // If newRole is provided, update the role
                if (newRole) {
                    // Check if the user already has this role
                    const checkExistingRequest = pool.request();
                    checkExistingRequest.input('targetUserEmail', targetUserEmail);
                    checkExistingRequest.input('newRole', newRole);
                    
                    const existingResult = await checkExistingRequest.query(`
                        SELECT UserRoleID FROM UserRoles 
                        WHERE UserEmail = @targetUserEmail AND RoleName = @newRole
                    `);
                    
                    if (existingResult.recordset.length > 0) {
                        // User already has this role - just update it (reactivate if needed, update display name)
                        const updateRequest = pool.request();
                        updateRequest.input('targetUserEmail', targetUserEmail);
                        updateRequest.input('newRole', newRole);
                        updateRequest.input('displayName', displayName || null);
                        
                        // First deactivate any OTHER roles
                        await updateRequest.query(`
                            UPDATE UserRoles 
                            SET IsActive = 0 
                            WHERE UserEmail = @targetUserEmail AND RoleName != @newRole
                        `);
                        
                        // Then update/reactivate the target role
                        const reactivateRequest = pool.request();
                        reactivateRequest.input('targetUserEmail', targetUserEmail);
                        reactivateRequest.input('newRole', newRole);
                        reactivateRequest.input('displayName', displayName || null);
                        
                        await reactivateRequest.query(`
                            UPDATE UserRoles 
                            SET IsActive = 1, DisplayName = COALESCE(@displayName, DisplayName)
                            WHERE UserEmail = @targetUserEmail AND RoleName = @newRole
                        `);
                        
                        context.log('User role reactivated/updated:', { targetUserEmail, newRole, displayName });
                    } else {
                        // User doesn't have this role - deactivate existing and insert new
                        const deactivateRequest = pool.request();
                        deactivateRequest.input('targetUserEmail', targetUserEmail);
                        
                        await deactivateRequest.query(`
                            UPDATE UserRoles 
                            SET IsActive = 0 
                            WHERE UserEmail = @targetUserEmail AND IsActive = 1
                        `);

                        // Insert new role with displayName if provided
                        const insertRequest = pool.request();
                        insertRequest.input('targetUserEmail', targetUserEmail);
                        insertRequest.input('newRole', newRole);
                        insertRequest.input('assignedBy', currentUserEmail);
                        insertRequest.input('displayName', displayName || null);
                        
                        await insertRequest.query(`
                            INSERT INTO UserRoles (UserEmail, RoleName, DisplayName, AssignedDate, AssignedBy, IsActive)
                            VALUES (@targetUserEmail, @newRole, @displayName, GETDATE(), @assignedBy, 1)
                        `);

                        context.log('User role inserted:', { targetUserEmail, newRole, displayName, assignedBy: currentUserEmail });
                    }
                }
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
        } else if (request.method === 'POST') {
            // Create new user - agent only
            if (!isDevelopment) {
                const agentCheckRequest = pool.request();
                agentCheckRequest.input('userEmail', currentUserEmail);
                agentCheckRequest.input('userObjectId', currentUserObjectId);
                
                try {
                    const agentResult = await agentCheckRequest.query(`
                        SELECT RoleName 
                        FROM UserRoles 
                        WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                            AND LOWER(RoleName) = 'agent' 
                            AND IsActive = 1
                    `);
                    
                    if (agentResult.recordset.length === 0) {
                        return {
                            status: 403,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: false,
                                error: 'Agent access required'
                            })
                        };
                    }
                } catch (dbError) {
                    context.log('Agent check error for POST:', dbError);
                    if (!dbError.message?.includes('Invalid object name')) {
                        throw dbError;
                    }
                }
            } else {
                context.log('Development mode: skipping agent check for POST');
            }

            // Parse request body
            const requestText = await request.text();
            const { email, displayName, role, assignmentGroups } = JSON.parse(requestText);

            if (!email || !displayName) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Email and display name are required'
                    })
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid email format'
                    })
                };
            }

            // Validate role
            const userRole = role || 'user';
            if (!['user', 'agent'].includes(userRole)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Role must be either "user" or "agent"'
                    })
                };
            }

            try {
                // Check if user already exists
                const checkRequest = pool.request();
                checkRequest.input('email', email);
                
                const existingUser = await checkRequest.query(`
                    SELECT UserEmail FROM UserRoles WHERE UserEmail = @email AND IsActive = 1
                `);

                if (existingUser.recordset.length > 0) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            error: 'A user with this email already exists'
                        })
                    };
                }

                // Insert new user role
                const insertRequest = pool.request();
                insertRequest.input('email', email);
                insertRequest.input('displayName', displayName);
                insertRequest.input('role', userRole);
                insertRequest.input('assignedBy', currentUserEmail);
                
                await insertRequest.query(`
                    INSERT INTO UserRoles (UserEmail, DisplayName, RoleName, AssignedDate, AssignedBy, IsActive)
                    VALUES (@email, @displayName, @role, GETDATE(), @assignedBy, 1)
                `);

                // If user is agent and has assignment groups, add them to those groups
                if (userRole === 'agent' && assignmentGroups && assignmentGroups.length > 0) {
                    for (const groupId of assignmentGroups) {
                        const groupRequest = pool.request();
                        groupRequest.input('groupId', groupId);
                        groupRequest.input('email', email);
                        groupRequest.input('assignedBy', currentUserEmail);
                        
                        await groupRequest.query(`
                            INSERT INTO AssignmentGroupMembers (AssignmentGroupID, UserEmail, IsActive, CreatedDate, CreatedBy)
                            VALUES (@groupId, @email, 1, GETDATE(), @assignedBy)
                        `);
                    }
                }

                context.log('New user created:', { email, displayName, role: userRole, assignmentGroups });

                return {
                    status: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'User created successfully',
                        data: {
                            email,
                            displayName,
                            role: userRole,
                            assignmentGroups: assignmentGroups || [],
                            assignedBy: currentUserEmail,
                            assignedDate: new Date().toISOString()
                        }
                    })
                };
            } catch (dbError) {
                context.log('Database error creating user:', dbError);
                
                if (isDevelopment && dbError.message?.includes('Invalid object name')) {
                    context.log('Development mode: simulating successful user creation');
                    return {
                        status: 201,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'User created successfully (simulated)',
                            data: {
                                email,
                                displayName,
                                role: userRole,
                                assignmentGroups: assignmentGroups || [],
                                assignedBy: currentUserEmail,
                                assignedDate: new Date().toISOString()
                            }
                        })
                    };
                }
                
                throw dbError;
            }
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
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    route: 'user-roles',
    authLevel: 'anonymous',
    handler: userRoles
});