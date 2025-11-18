import * as sql from 'mssql';

// Database configuration for Azure SQL with Managed Identity
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
    connectionTimeout: 30000, // 30 seconds
    requestTimeout: 30000, // 30 seconds  
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000
    }
};

export async function getDbConnection(): Promise<sql.ConnectionPool> {
    // Create a fresh connection each time to avoid timeout issues
    const pool = new sql.ConnectionPool(config);
    console.log('Connecting to Azure SQL Database...');
    await pool.connect();
    console.log('Successfully connected to Azure SQL Database');
    return pool;
}

export async function closeDbConnection(pool?: sql.ConnectionPool): Promise<void> {
    if (pool) {
        await pool.close();
        console.log('Disconnected from Azure SQL Database');
    }
}

// Helper function for error handling
export function handleDbError(error: any): { status: number, message: string } {
    console.error('Database error:', error);
    
    if (error.code === 'ELOGIN') {
        return { status: 500, message: 'Database authentication failed' };
    } else if (error.code === 'ETIMEOUT') {
        return { status: 500, message: 'Database connection timeout' };
    } else if (error.code === 'ECONNCLOSED') {
        return { status: 500, message: 'Database connection was closed' };
    } else if (error.number === 2) {
        return { status: 500, message: 'Database server not found' };
    }
    
    return { status: 500, message: 'Internal server error' };
}