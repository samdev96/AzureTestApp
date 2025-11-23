import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function userRoles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for user-roles.`);

    try {
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userEmail = '';
        let userObjectId = '';
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                userEmail = userPrincipal.userDetails || '';
                userObjectId = userPrincipal.userId || '';
                
                context.log('Checking roles for user:', { userEmail, userObjectId });
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
                        error: 'Invalid authentication'
                    })
                };
            }
        } else {
            return {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Authentication required'
                })
            };
        }

        const pool = await getDbConnection();
        
        // Query user roles from database
        const rolesRequest = pool.request();
        rolesRequest.input('userEmail', userEmail);
        rolesRequest.input('userObjectId', userObjectId);
        
        const rolesResult = await rolesRequest.query(`
            SELECT RoleName, AssignedDate, AssignedBy 
            FROM UserRoles 
            WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                AND IsActive = 1
            ORDER BY AssignedDate DESC
        `);
        
        const roles = rolesResult.recordset.map(row => row.RoleName);
        const isAdmin = roles.includes('admin');
        
        context.log('User roles found:', { userEmail, roles, isAdmin });
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                userEmail,
                userObjectId,
                roles,
                isAdmin,
                roleDetails: rolesResult.recordset
            })
        };
        
    } catch (error) {
        context.log('Error checking user roles:', error);
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
    methods: ['GET', 'OPTIONS'],
    route: 'user-roles',
    authLevel: 'anonymous',
    handler: userRoles
});