import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection } from "../utils/database";

export async function debugUserRoles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, x-ms-client-principal"
            }
        };
    }

    try {
        const pool = await getDbConnection();
        
        // Get the email from query string
        const url = new URL(request.url);
        const email = url.searchParams.get('email') || 'duffydev96@gmail.com';
        
        context.log('Checking UserRoles for email:', email);
        
        // Query the UserRoles table
        const result = await pool.request()
            .input('email', email)
            .query(`
                SELECT UserEmail, RoleName, IsActive
                FROM UserRoles 
                WHERE UserEmail = @email
            `);
        
        context.log('Query result:', result.recordset);
        
        // Also get all active admin users for comparison
        const allAdmins = await pool.request()
            .query(`
                SELECT UserEmail, RoleName, IsActive
                FROM UserRoles 
                WHERE LOWER(RoleName) = 'admin' AND IsActive = 1
            `);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                searchedEmail: email,
                foundRecord: result.recordset.length > 0,
                record: result.recordset[0] || null,
                allActiveAdmins: allAdmins.recordset,
                totalAdmins: allAdmins.recordset.length
            })
        };
    } catch (error) {
        context.error('Error querying UserRoles:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            })
        };
    }
}

app.http('debug-user-roles', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: debugUserRoles
});
