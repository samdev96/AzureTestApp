import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';

export async function testDb(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Testing database connection...');
    
    const config: sql.config = {
        server: 'vibenow.database.windows.net',
        database: 'VibeNow-Test', 
        authentication: {
            type: 'azure-active-directory-default'
        },
        options: {
            encrypt: true,
            trustServerCertificate: false
        },
        connectionTimeout: 60000, // 60 seconds
        requestTimeout: 60000
    };

    try {
        context.log('Creating connection pool...');
        const pool = new sql.ConnectionPool(config);
        
        context.log('Attempting to connect...');
        await pool.connect();
        
        context.log('Connected! Testing query...');
        const result = await pool.request().query('SELECT 1 as test, GETDATE() as currentTime');
        
        await pool.close();
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: true,
                message: 'Database connection successful',
                data: result.recordset
            }
        };
        
    } catch (error) {
        context.log('Database connection failed:', error);
        
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
            }
        };
    }
}

// Register the test function
app.http('test-db', {
    methods: ['GET', 'OPTIONS'],
    route: 'test-db',
    authLevel: 'anonymous',
    handler: testDb
});