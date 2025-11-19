import * as sql from 'mssql';

// Database configuration for Azure SQL with SQL Authentication
function getDatabaseConfig(): sql.config {
    const server = process.env.DB_SERVER || 'vibenow.database.windows.net';
    const database = process.env.DB_DATABASE || 'VibeNow-Test';
    const user = process.env.DB_USER || 'CloudSAe07ce23c';
    const password = process.env.DB_PASSWORD;

    return {
        server,
        database,
        user,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: false
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
            max: 5,
            min: 0,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000
        }
    };
}

export async function getDbConnection(): Promise<sql.ConnectionPool> {
    // Create a fresh connection each time to avoid timeout issues
    const config = getDatabaseConfig();
    const pool = new sql.ConnectionPool(config);
    
    console.log('=== Database Connection Attempt ===');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    console.log('Password set:', !!config.password);
    console.log('Environment check:');
    console.log('- DB_SERVER:', process.env.DB_SERVER);
    console.log('- DB_DATABASE:', process.env.DB_DATABASE);
    console.log('- DB_USER:', process.env.DB_USER);
    console.log('- DB_PASSWORD set:', !!process.env.DB_PASSWORD);
    
    try {
        await pool.connect();
        console.log('✅ Successfully connected to Azure SQL Database');
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
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