import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function configurationItems(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for configuration-items.`);

    if (request.method === 'GET') {
        return await getConfigItems(request, context);
    } else if (request.method === 'POST') {
        return await createConfigItem(request, context);
    } else if (request.method === 'PUT') {
        return await updateConfigItem(request, context);
    } else if (request.method === 'DELETE') {
        return await deleteConfigItem(request, context);
    } else {
        return {
            status: 405,
            jsonBody: {
                success: false,
                error: 'Method not allowed'
            }
        };
    }
}

async function getUserInfo(request: HttpRequest, context: InvocationContext): Promise<{ userId: string; userRoles: string[] }> {
    const userPrincipalHeader = request.headers.get('x-ms-client-principal');
    let userId = 'anonymous';
    let userRoles: string[] = [];

    if (userPrincipalHeader) {
        try {
            const decodedHeader = Buffer.from(userPrincipalHeader, 'base64').toString();
            const userPrincipal = JSON.parse(decodedHeader);
            userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
            userRoles = userPrincipal.userRoles || userPrincipal.roles || [];
        } catch (e) {
            context.log('Error parsing user principal:', e);
        }
    }

    return { userId, userRoles };
}

async function getConfigItems(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET configuration-items.');

    try {
        const pool = await getDbConnection();

        // Get query parameters for filtering
        const status = request.query.get('status');
        const ciType = request.query.get('type');
        const environment = request.query.get('environment');
        const ciId = request.query.get('id');

        // Single CI lookup
        if (ciId) {
            const result = await pool.request()
                .input('ciId', ciId)
                .query(`
                    SELECT 
                        ci.CiId,
                        ci.CiName,
                        ci.CiType,
                        ci.SubType,
                        ci.Status,
                        ci.Environment,
                        ci.Location,
                        ci.IpAddress,
                        ci.Hostname,
                        ci.Version,
                        ci.Vendor,
                        ci.SupportGroupId,
                        ag.GroupName AS SupportGroup,
                        ci.Owner,
                        ci.Description,
                        ci.Attributes,
                        ci.SerialNumber,
                        ci.AssetTag,
                        ci.PurchaseDate,
                        ci.ExpiryDate,
                        ci.Cost,
                        ci.CreatedDate,
                        ci.CreatedBy,
                        ci.ModifiedDate,
                        ci.ModifiedBy
                    FROM ConfigurationItems ci
                    LEFT JOIN AssignmentGroups ag ON ci.SupportGroupId = ag.AssignmentGroupID
                    WHERE ci.CiId = @ciId
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: 'Configuration Item not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result.recordset[0]
                }
            };
        }

        // Build dynamic query for filtering
        let query = `
            SELECT 
                ci.CiId,
                ci.CiName,
                ci.CiType,
                ci.SubType,
                ci.Status,
                ci.Environment,
                ci.Location,
                ci.IpAddress,
                ci.Hostname,
                ci.Version,
                ci.Vendor,
                ci.SupportGroupId,
                ag.GroupName AS SupportGroup,
                ci.Owner,
                ci.Description,
                ci.CreatedDate,
                ci.CreatedBy,
                ci.ModifiedDate,
                ci.ModifiedBy
            FROM ConfigurationItems ci
            LEFT JOIN AssignmentGroups ag ON ci.SupportGroupId = ag.AssignmentGroupID
            WHERE 1=1
        `;

        const queryRequest = pool.request();

        if (status) {
            query += ' AND ci.Status = @status';
            queryRequest.input('status', status);
        }

        if (ciType) {
            query += ' AND ci.CiType = @ciType';
            queryRequest.input('ciType', ciType);
        }

        if (environment) {
            query += ' AND ci.Environment = @environment';
            queryRequest.input('environment', environment);
        }

        query += ' ORDER BY ci.CiName';

        const result = await queryRequest.query(query);

        return {
            status: 200,
            jsonBody: {
                success: true,
                data: result.recordset
            }
        };
    } catch (error) {
        context.log('Error fetching configuration items:', error);
        return handleDbError(error);
    }
}

async function createConfigItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for POST configuration-items.');

    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        // Validate required fields
        if (!body.ciName) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'CI name is required'
                }
            };
        }

        if (!body.ciType) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'CI type is required'
                }
            };
        }

        const result = await pool.request()
            .input('ciName', body.ciName)
            .input('ciType', body.ciType)
            .input('subType', body.subType || null)
            .input('status', body.status || 'Active')
            .input('environment', body.environment || 'Production')
            .input('location', body.location || null)
            .input('ipAddress', body.ipAddress || null)
            .input('hostname', body.hostname || null)
            .input('version', body.version || null)
            .input('vendor', body.vendor || null)
            .input('supportGroupId', body.supportGroupId || null)
            .input('owner', body.owner || null)
            .input('description', body.description || null)
            .input('attributes', body.attributes ? JSON.stringify(body.attributes) : null)
            .input('serialNumber', body.serialNumber || null)
            .input('assetTag', body.assetTag || null)
            .input('purchaseDate', body.purchaseDate || null)
            .input('expiryDate', body.expiryDate || null)
            .input('cost', body.cost || null)
            .input('createdBy', userId)
            .query(`
                INSERT INTO ConfigurationItems (
                    CiName, CiType, SubType, Status, Environment,
                    Location, IpAddress, Hostname, Version, Vendor,
                    SupportGroupId, Owner, Description, Attributes,
                    SerialNumber, AssetTag, PurchaseDate, ExpiryDate, Cost,
                    CreatedBy
                )
                OUTPUT INSERTED.CiId, INSERTED.CiName, INSERTED.CiType, INSERTED.Environment, INSERTED.Status
                VALUES (
                    @ciName, @ciType, @subType, @status, @environment,
                    @location, @ipAddress, @hostname, @version, @vendor,
                    @supportGroupId, @owner, @description, @attributes,
                    @serialNumber, @assetTag, @purchaseDate, @expiryDate, @cost,
                    @createdBy
                )
            `);

        context.log('Configuration Item created:', result.recordset[0]);

        return {
            status: 201,
            jsonBody: {
                success: true,
                message: 'Configuration Item created successfully',
                data: result.recordset[0]
            }
        };
    } catch (error) {
        context.log('Error creating configuration item:', error);
        return handleDbError(error);
    }
}

async function updateConfigItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for PUT configuration-items.');

    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        // Get ciId from URL path or body
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const ciId = pathParts[pathParts.length - 1] !== 'configuration-items' 
            ? pathParts[pathParts.length - 1] 
            : body.ciId;

        if (!ciId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'CI ID is required'
                }
            };
        }

        // Check if CI exists
        const existingCI = await pool.request()
            .input('ciId', ciId)
            .query('SELECT CiId FROM ConfigurationItems WHERE CiId = @ciId');

        if (existingCI.recordset.length === 0) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Configuration Item not found'
                }
            };
        }

        const result = await pool.request()
            .input('ciId', ciId)
            .input('ciName', body.ciName)
            .input('ciType', body.ciType)
            .input('subType', body.subType || null)
            .input('status', body.status || 'Active')
            .input('environment', body.environment || 'Production')
            .input('location', body.location || null)
            .input('ipAddress', body.ipAddress || null)
            .input('hostname', body.hostname || null)
            .input('version', body.version || null)
            .input('vendor', body.vendor || null)
            .input('supportGroupId', body.supportGroupId || null)
            .input('owner', body.owner || null)
            .input('description', body.description || null)
            .input('attributes', body.attributes ? JSON.stringify(body.attributes) : null)
            .input('serialNumber', body.serialNumber || null)
            .input('assetTag', body.assetTag || null)
            .input('purchaseDate', body.purchaseDate || null)
            .input('expiryDate', body.expiryDate || null)
            .input('cost', body.cost || null)
            .input('modifiedBy', userId)
            .query(`
                UPDATE ConfigurationItems
                SET CiName = @ciName,
                    CiType = @ciType,
                    SubType = @subType,
                    Status = @status,
                    Environment = @environment,
                    Location = @location,
                    IpAddress = @ipAddress,
                    Hostname = @hostname,
                    Version = @version,
                    Vendor = @vendor,
                    SupportGroupId = @supportGroupId,
                    Owner = @owner,
                    Description = @description,
                    Attributes = @attributes,
                    SerialNumber = @serialNumber,
                    AssetTag = @assetTag,
                    PurchaseDate = @purchaseDate,
                    ExpiryDate = @expiryDate,
                    Cost = @cost,
                    ModifiedDate = GETUTCDATE(),
                    ModifiedBy = @modifiedBy
                WHERE CiId = @ciId;
                
                SELECT CiId, CiName, CiType, Environment, Status
                FROM ConfigurationItems WHERE CiId = @ciId
            `);

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Configuration Item updated successfully',
                data: result.recordset[0]
            }
        };
    } catch (error) {
        context.log('Error updating configuration item:', error);
        return handleDbError(error);
    }
}

async function deleteConfigItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for DELETE configuration-items.');

    try {
        const pool = await getDbConnection();

        // Get ciId from URL path
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const ciId = pathParts[pathParts.length - 1];

        if (!ciId || ciId === 'configuration-items') {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'CI ID is required'
                }
            };
        }

        // Check if CI has relationships
        const relationships = await pool.request()
            .input('ciId', ciId)
            .query(`
                SELECT COUNT(*) as count FROM (
                    SELECT 1 FROM ServiceCiMapping WHERE CiId = @ciId
                    UNION ALL
                    SELECT 1 FROM CiRelationships WHERE SourceCiId = @ciId OR TargetCiId = @ciId
                ) AS combined
            `);

        if (relationships.recordset[0].count > 0) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Cannot delete CI with existing relationships. Remove the relationships first.'
                }
            };
        }

        const result = await pool.request()
            .input('ciId', ciId)
            .query('DELETE FROM ConfigurationItems WHERE CiId = @ciId');

        if (result.rowsAffected[0] === 0) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Configuration Item not found'
                }
            };
        }

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Configuration Item deleted successfully'
            }
        };
    } catch (error) {
        context.log('Error deleting configuration item:', error);
        return handleDbError(error);
    }
}

// Also add a helper endpoint for CI types
export async function ciTypes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET ci-types.');

    try {
        const pool = await getDbConnection();

        const result = await pool.request()
            .query(`
                SELECT TypeId, TypeName, Category, Icon
                FROM CiTypes
                WHERE IsActive = 1
                ORDER BY Category, TypeName
            `);

        return {
            status: 200,
            jsonBody: {
                success: true,
                data: result.recordset
            }
        };
    } catch (error) {
        context.log('Error fetching CI types:', error);
        return handleDbError(error);
    }
}

app.http('configuration-items', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'configuration-items/{id?}',
    handler: configurationItems
});

app.http('ci-types', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ci-types',
    handler: ciTypes
});
