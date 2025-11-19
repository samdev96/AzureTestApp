import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function authTest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for auth-test.`);

    try {
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        
        if (!userPrincipalHeader) {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'No authentication header found',
                    headers: Object.fromEntries(request.headers.entries())
                })
            };
        }

        try {
            const decodedHeader = Buffer.from(userPrincipalHeader, 'base64').toString();
            const userPrincipal = JSON.parse(decodedHeader);
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Authentication data found',
                    userPrincipal: userPrincipal,
                    decodedHeader: decodedHeader,
                    rawHeader: userPrincipalHeader,
                    isAdmin: (userPrincipal.roles || []).includes('admin')
                }, null, 2)
            };
        } catch (parseError) {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Error parsing authentication data',
                    error: parseError.message,
                    rawHeader: userPrincipalHeader
                })
            };
        }

    } catch (error) {
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

app.http('authTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: authTest
});