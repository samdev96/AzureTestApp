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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
                // Verify current user is admin or agent
                context.log('Checking admin/agent access for getAllUsers request:', {
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
                        const roleResult = await adminCheckRequest.query(`
                            SELECT Role 
                            FROM Users 
                            WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                                AND LOWER(Role) IN ('admin', 'agent') 
                                AND IsActive = 1
                        `);
                        
                        context.log('Role check result:', {
                            recordCount: roleResult.recordset.length,
                            records: roleResult.recordset
                        });
                        
                        if (roleResult.recordset.length === 0) {
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
                    } catch (dbError: any) {
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

                // Get all users from Users table
                context.log('Attempting to query Users table for all users');
                const usersRequest = pool.request();
                let usersResult;
                
                try {
                    usersResult = await usersRequest.query(`
                        SELECT 
                            UserID,
                            Email,
                            Username,
                            DisplayName,
                            FirstName,
                            LastName,
                            Role,
                            ExternalID,
                            Department,
                            JobTitle,
                            IsActive,
                            CreatedDate,
                            CreatedBy,
                            CASE WHEN LOWER(Role) IN ('agent', 'admin') THEN 1 ELSE 0 END as IsAgent,
                            CASE WHEN LOWER(Role) = 'admin' THEN 1 ELSE 0 END as IsAdmin
                        FROM Users
                        WHERE IsActive = 1
                        ORDER BY Email
                    `);
                    
                    context.log('Database query successful, found', usersResult.recordset.length, 'users');
                } catch (dbError: any) {
                    context.log('Database query error:', {
                        message: dbError.message,
                        code: dbError.code,
                        severity: dbError.severity,
                        state: dbError.state
                    });
                    
                    // If Users table doesn't exist and we're in development, return sample data
                    if (isDevelopment && dbError.message?.includes('Invalid object name')) {
                        context.log('Users table not found, returning sample data for development');
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
                                        userId: 1,
                                        userEmail: 'agent@test.com',
                                        userObjectId: 'test-agent-id',
                                        displayName: 'Test Agent',
                                        role: 'agent',
                                        isAgent: true,
                                        isAdmin: false,
                                        createdDate: new Date().toISOString()
                                    },
                                    {
                                        userId: 2,
                                        userEmail: 'user@test.com',
                                        userObjectId: 'test-user-id',
                                        displayName: 'Test User',
                                        role: 'user',
                                        isAgent: false,
                                        isAdmin: false,
                                        createdDate: new Date().toISOString()
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

                // Transform results
                const users = usersResult.recordset.map(row => ({
                    userId: row.UserID,
                    userEmail: row.Email,
                    userObjectId: row.ExternalID || '',
                    displayName: row.DisplayName || '',
                    firstName: row.FirstName || '',
                    lastName: row.LastName || '',
                    role: row.Role || 'user',
                    isAgent: row.IsAgent === 1,
                    isAdmin: row.IsAdmin === 1,
                    department: row.Department || '',
                    jobTitle: row.JobTitle || '',
                    createdDate: row.CreatedDate,
                    createdBy: row.CreatedBy
                }));
                
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
                // Get current user's role (existing functionality)
                const rolesRequest = pool.request();
                rolesRequest.input('userEmail', currentUserEmail);
                rolesRequest.input('userObjectId', currentUserObjectId);
                
                const rolesResult = await rolesRequest.query(`
                    SELECT UserID, Email, DisplayName, Role, ExternalID, CreatedDate
                    FROM Users 
                    WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                        AND IsActive = 1
                `);
                
                if (rolesResult.recordset.length === 0) {
                    // User not found in database
                    context.log('User not found in Users table:', { currentUserEmail });
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
                            roles: ['authenticated'],
                            isAgent: false,
                            isAdmin: false,
                            roleDetails: []
                        })
                    };
                }
                
                const user = rolesResult.recordset[0];
                const role = user.Role || 'user';
                const roles = [role];
                
                // Case-insensitive checks for roles
                // Admin has all agent privileges, so isAgent is true for both admin and agent
                const isAdmin = role.toLowerCase() === 'admin';
                const isAgent = isAdmin || role.toLowerCase() === 'agent';
                
                context.log('User role found:', { currentUserEmail, role, isAgent, isAdmin });
                
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
                        isAdmin,
                        roleDetails: [{
                            role: user.Role,
                            userId: user.UserID,
                            createdDate: user.CreatedDate
                        }]
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
                        SELECT Role 
                        FROM Users 
                        WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                            AND LOWER(Role) = 'admin' 
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
                } catch (dbError: any) {
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
            const { targetUserEmail, newRole, displayName, firstName, lastName, department, jobTitle } = JSON.parse(requestText);

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
            if (newRole && !['user', 'agent', 'admin'].includes(newRole)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Role must be "user", "agent", or "admin"'
                    })
                };
            }

            try {
                // Check if user exists
                const checkRequest = pool.request();
                checkRequest.input('targetUserEmail', targetUserEmail);
                
                const existingUser = await checkRequest.query(`
                    SELECT UserID FROM Users WHERE Email = @targetUserEmail
                `);

                if (existingUser.recordset.length === 0) {
                    return {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            error: 'User not found'
                        })
                    };
                }

                // Build dynamic update query
                const updateFields: string[] = [];
                const updateRequest = pool.request();
                updateRequest.input('targetUserEmail', targetUserEmail);
                updateRequest.input('modifiedBy', currentUserEmail);

                if (newRole) {
                    updateFields.push('Role = @newRole');
                    updateRequest.input('newRole', newRole);
                }
                if (displayName !== undefined) {
                    updateFields.push('DisplayName = @displayName');
                    updateRequest.input('displayName', displayName);
                }
                if (firstName !== undefined) {
                    updateFields.push('FirstName = @firstName');
                    updateRequest.input('firstName', firstName);
                }
                if (lastName !== undefined) {
                    updateFields.push('LastName = @lastName');
                    updateRequest.input('lastName', lastName);
                }
                if (department !== undefined) {
                    updateFields.push('Department = @department');
                    updateRequest.input('department', department);
                }
                if (jobTitle !== undefined) {
                    updateFields.push('JobTitle = @jobTitle');
                    updateRequest.input('jobTitle', jobTitle);
                }

                if (updateFields.length > 0) {
                    updateFields.push('ModifiedBy = @modifiedBy');
                    updateFields.push('ModifiedDate = GETUTCDATE()');
                    
                    await updateRequest.query(`
                        UPDATE Users 
                        SET ${updateFields.join(', ')}
                        WHERE Email = @targetUserEmail
                    `);
                    
                    context.log('User updated:', { targetUserEmail, updateFields });
                }

            } catch (dbError: any) {
                context.log('Database error updating user:', dbError);
                
                // In development mode, if table doesn't exist, simulate success
                if (isDevelopment && dbError.message?.includes('Invalid object name')) {
                    context.log('Development mode: simulating successful user update');
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
                    message: `User updated successfully`,
                    data: {
                        targetUserEmail,
                        newRole,
                        modifiedBy: currentUserEmail,
                        modifiedDate: new Date().toISOString()
                    }
                })
            };
        } else if (request.method === 'POST') {
            // Create new user - agent or admin only
            if (!isDevelopment) {
                const agentCheckRequest = pool.request();
                agentCheckRequest.input('userEmail', currentUserEmail);
                agentCheckRequest.input('userObjectId', currentUserObjectId);
                
                try {
                    const agentResult = await agentCheckRequest.query(`
                        SELECT Role 
                        FROM Users 
                        WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                            AND LOWER(Role) IN ('admin', 'agent')
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
                } catch (dbError: any) {
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
            const { email, displayName, firstName, lastName, role, department, jobTitle, assignmentGroups } = JSON.parse(requestText);

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
            if (!['user', 'agent', 'admin'].includes(userRole)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Role must be "user", "agent", or "admin"'
                    })
                };
            }

            try {
                // Check if user already exists
                const checkRequest = pool.request();
                checkRequest.input('email', email);
                
                const existingUser = await checkRequest.query(`
                    SELECT Email FROM Users WHERE Email = @email
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

                // Generate username from email
                const username = email.split('@')[0];
                const userFirstName = firstName || displayName.split(' ')[0] || displayName;
                const userLastName = lastName || displayName.split(' ').slice(1).join(' ') || '';

                // Insert new user
                const insertRequest = pool.request();
                insertRequest.input('email', email);
                insertRequest.input('username', username);
                insertRequest.input('displayName', displayName);
                insertRequest.input('firstName', userFirstName);
                insertRequest.input('lastName', userLastName);
                insertRequest.input('role', userRole);
                insertRequest.input('department', department || null);
                insertRequest.input('jobTitle', jobTitle || null);
                insertRequest.input('createdBy', currentUserEmail);
                
                const insertResult = await insertRequest.query(`
                    INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, Department, JobTitle, CreatedBy, CreatedDate, IsActive)
                    OUTPUT INSERTED.UserID
                    VALUES (@email, @username, @displayName, @firstName, @lastName, @role, @department, @jobTitle, @createdBy, GETUTCDATE(), 1)
                `);

                const newUserId = insertResult.recordset[0]?.UserID;

                // If user is agent and has assignment groups, add them to those groups
                if (userRole === 'agent' && assignmentGroups && assignmentGroups.length > 0) {
                    for (const groupId of assignmentGroups) {
                        const groupRequest = pool.request();
                        groupRequest.input('groupId', groupId);
                        groupRequest.input('email', email);
                        groupRequest.input('assignedBy', currentUserEmail);
                        
                        await groupRequest.query(`
                            INSERT INTO AssignmentGroupMembers (AssignmentGroupID, UserEmail, IsActive, CreatedDate, CreatedBy)
                            VALUES (@groupId, @email, 1, GETUTCDATE(), @assignedBy)
                        `);
                    }
                }

                context.log('New user created:', { email, displayName, role: userRole, userId: newUserId });

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
                            userId: newUserId,
                            email,
                            displayName,
                            firstName: userFirstName,
                            lastName: userLastName,
                            role: userRole,
                            assignmentGroups: assignmentGroups || [],
                            createdBy: currentUserEmail,
                            createdDate: new Date().toISOString()
                        }
                    })
                };
            } catch (dbError: any) {
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
                                createdBy: currentUserEmail,
                                createdDate: new Date().toISOString()
                            }
                        })
                    };
                }
                
                throw dbError;
            }
        } else if (request.method === 'DELETE') {
            // Deactivate user - admin only
            if (!isDevelopment) {
                const adminCheckRequest = pool.request();
                adminCheckRequest.input('userEmail', currentUserEmail);
                adminCheckRequest.input('userObjectId', currentUserObjectId);
                
                try {
                    const adminResult = await adminCheckRequest.query(`
                        SELECT Role 
                        FROM Users 
                        WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                            AND LOWER(Role) = 'admin' 
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
                } catch (dbError: any) {
                    context.log('Admin check error for DELETE:', dbError);
                    if (!dbError.message?.includes('Invalid object name')) {
                        throw dbError;
                    }
                }
            }

            const url = new URL(request.url);
            const targetEmail = url.searchParams.get('email');

            if (!targetEmail) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Email parameter is required'
                    })
                };
            }

            // Prevent self-deletion
            if (targetEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Cannot deactivate your own account'
                    })
                };
            }

            try {
                const deactivateRequest = pool.request();
                deactivateRequest.input('targetEmail', targetEmail);
                deactivateRequest.input('modifiedBy', currentUserEmail);

                await deactivateRequest.query(`
                    UPDATE Users 
                    SET IsActive = 0, ModifiedBy = @modifiedBy, ModifiedDate = GETUTCDATE()
                    WHERE Email = @targetEmail
                `);

                context.log('User deactivated:', { targetEmail, deactivatedBy: currentUserEmail });

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'User deactivated successfully',
                        data: { email: targetEmail }
                    })
                };
            } catch (dbError: any) {
                context.log('Database error deactivating user:', dbError);
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'user-roles',
    authLevel: 'anonymous',
    handler: userRoles
});

// Impersonation endpoint - allows admins to get another user's role info
export async function impersonateUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for impersonate-user.`);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }

    try {
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let currentUserEmail = '';
        let currentUserObjectId = '';
        
        const isDevelopment = !userPrincipalHeader && request.url.includes('localhost');
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                currentUserEmail = userPrincipal.userDetails || '';
                currentUserObjectId = userPrincipal.userId || '';
            } catch (e) {
                return {
                    status: 401,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ success: false, error: 'Invalid authentication' })
                };
            }
        } else if (isDevelopment) {
            currentUserEmail = 'admin@test.com';
            currentUserObjectId = 'test-admin-id';
        } else {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'Authentication required' })
            };
        }

        const pool = await getDbConnection();

        // Verify current user is admin
        if (!isDevelopment) {
            const adminCheckRequest = pool.request();
            adminCheckRequest.input('userEmail', currentUserEmail);
            adminCheckRequest.input('userObjectId', currentUserObjectId);
            
            const adminResult = await adminCheckRequest.query(`
                SELECT Role 
                FROM Users 
                WHERE (Email = @userEmail OR ExternalID = @userObjectId) 
                    AND LOWER(Role) = 'admin' 
                    AND IsActive = 1
            `);
            
            if (adminResult.recordset.length === 0) {
                return {
                    status: 403,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ success: false, error: 'Admin access required for impersonation' })
                };
            }
        }

        // Get target user email from route parameter
        const targetEmail = request.params.email;
        
        if (!targetEmail) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'Target user email is required' })
            };
        }

        // Get target user's info
        const targetRequest = pool.request();
        targetRequest.input('targetEmail', decodeURIComponent(targetEmail));
        
        const targetResult = await targetRequest.query(`
            SELECT 
                UserID,
                Email,
                ExternalID,
                DisplayName,
                Role,
                CreatedDate
            FROM Users 
            WHERE LOWER(Email) = LOWER(@targetEmail) 
                AND IsActive = 1
        `);
        
        if (targetResult.recordset.length === 0) {
            return {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'User not found' })
            };
        }

        const targetUser = targetResult.recordset[0];
        const role = targetUser.Role || 'user';
        const isAdmin = role.toLowerCase() === 'admin';
        const isAgent = isAdmin || role.toLowerCase() === 'agent';

        // Prevent impersonating other admins (optional security measure)
        if (isAdmin) {
            return {
                status: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'Cannot impersonate admin users' })
            };
        }

        // Log the impersonation for audit purposes
        context.log(`IMPERSONATION: Admin ${currentUserEmail} impersonating user ${targetEmail}`);

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                impersonatedUser: {
                    userEmail: targetUser.Email,
                    userObjectId: targetUser.ExternalID || '',
                    displayName: targetUser.DisplayName || '',
                    roles: [role],
                    isAgent,
                    isAdmin,
                    role
                },
                adminUser: currentUserEmail,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        context.log('Error in impersonate-user:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: errorInfo.message })
        };
    }
}

// Register the impersonation function
app.http('impersonate-user', {
    methods: ['GET', 'OPTIONS'],
    route: 'user-roles/impersonate/{email}',
    authLevel: 'anonymous',
    handler: impersonateUser
});
