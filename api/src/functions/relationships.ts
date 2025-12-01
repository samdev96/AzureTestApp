import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

// =============================================
// SERVICE-CI MAPPINGS
// =============================================
export async function serviceCiMappings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for service-ci-mappings.`);

    if (request.method === 'GET') {
        return await getMappings(request, context);
    } else if (request.method === 'POST') {
        return await createMapping(request, context);
    } else if (request.method === 'DELETE') {
        return await deleteMapping(request, context);
    } else {
        return {
            status: 405,
            jsonBody: { success: false, error: 'Method not allowed' }
        };
    }
}

async function getUserInfo(request: HttpRequest, context: InvocationContext): Promise<{ userId: string }> {
    const userPrincipalHeader = request.headers.get('x-ms-client-principal');
    let userId = 'anonymous';

    if (userPrincipalHeader) {
        try {
            const decodedHeader = Buffer.from(userPrincipalHeader, 'base64').toString();
            const userPrincipal = JSON.parse(decodedHeader);
            userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
        } catch (e) {
            context.log('Error parsing user principal:', e);
        }
    }

    return { userId };
}

async function getMappings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const serviceId = request.query.get('serviceId');
        const ciId = request.query.get('ciId');

        let query = `
            SELECT 
                scm.MappingId,
                scm.ServiceId,
                s.ServiceName,
                s.Criticality AS ServiceCriticality,
                scm.CiId,
                ci.CiName,
                ci.CiType,
                ci.Environment,
                ci.Status AS CiStatus,
                scm.RelationshipType,
                scm.IsCritical,
                scm.Notes,
                scm.CreatedDate,
                scm.CreatedBy
            FROM ServiceCiMapping scm
            INNER JOIN Services s ON scm.ServiceId = s.ServiceId
            INNER JOIN ConfigurationItems ci ON scm.CiId = ci.CiId
            WHERE 1=1
        `;

        const queryRequest = pool.request();

        if (serviceId) {
            query += ' AND scm.ServiceId = @serviceId';
            queryRequest.input('serviceId', serviceId);
        }

        if (ciId) {
            query += ' AND scm.CiId = @ciId';
            queryRequest.input('ciId', ciId);
        }

        query += ' ORDER BY s.ServiceName, ci.CiName';

        const result = await queryRequest.query(query);

        return {
            status: 200,
            jsonBody: { success: true, data: result.recordset }
        };
    } catch (error) {
        context.log('Error fetching service-ci mappings:', error);
        return handleDbError(error);
    }
}

async function createMapping(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        if (!body.serviceId || !body.ciId) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Service ID and CI ID are required' }
            };
        }

        const result = await pool.request()
            .input('serviceId', body.serviceId)
            .input('ciId', body.ciId)
            .input('relationshipType', body.relationshipType || 'Contains')
            .input('isCritical', body.isCritical || false)
            .input('notes', body.notes || null)
            .input('createdBy', userId)
            .query(`
                INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, Notes, CreatedBy)
                OUTPUT INSERTED.MappingId, INSERTED.ServiceId, INSERTED.CiId, INSERTED.RelationshipType
                VALUES (@serviceId, @ciId, @relationshipType, @isCritical, @notes, @createdBy)
            `);

        return {
            status: 201,
            jsonBody: {
                success: true,
                message: 'Service-CI mapping created successfully',
                data: result.recordset[0]
            }
        };
    } catch (error: any) {
        context.log('Error creating service-ci mapping:', error);
        if (error.message?.includes('UQ_ServiceCiMapping')) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'This mapping already exists' }
            };
        }
        return handleDbError(error);
    }
}

async function deleteMapping(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const mappingId = pathParts[pathParts.length - 1];

        if (!mappingId || mappingId === 'service-ci-mappings') {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Mapping ID is required' }
            };
        }

        const result = await pool.request()
            .input('mappingId', mappingId)
            .query('DELETE FROM ServiceCiMapping WHERE MappingId = @mappingId');

        if (result.rowsAffected[0] === 0) {
            return {
                status: 404,
                jsonBody: { success: false, error: 'Mapping not found' }
            };
        }

        return {
            status: 200,
            jsonBody: { success: true, message: 'Mapping deleted successfully' }
        };
    } catch (error) {
        context.log('Error deleting service-ci mapping:', error);
        return handleDbError(error);
    }
}

// =============================================
// CI-CI RELATIONSHIPS
// =============================================
export async function ciRelationships(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for ci-relationships.`);

    if (request.method === 'GET') {
        return await getRelationships(request, context);
    } else if (request.method === 'POST') {
        return await createRelationship(request, context);
    } else if (request.method === 'DELETE') {
        return await deleteRelationship(request, context);
    } else {
        return {
            status: 405,
            jsonBody: { success: false, error: 'Method not allowed' }
        };
    }
}

async function getRelationships(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const ciId = request.query.get('ciId');

        let query = `
            SELECT 
                cr.RelationshipId,
                cr.SourceCiId,
                src.CiName AS SourceCiName,
                src.CiType AS SourceCiType,
                src.Environment AS SourceEnvironment,
                cr.TargetCiId,
                tgt.CiName AS TargetCiName,
                tgt.CiType AS TargetCiType,
                tgt.Environment AS TargetEnvironment,
                cr.RelationshipType,
                rt.ReverseTypeName,
                rt.Category AS RelationshipCategory,
                cr.Description,
                cr.IsActive,
                cr.CreatedDate,
                cr.CreatedBy
            FROM CiRelationships cr
            INNER JOIN ConfigurationItems src ON cr.SourceCiId = src.CiId
            INNER JOIN ConfigurationItems tgt ON cr.TargetCiId = tgt.CiId
            LEFT JOIN RelationshipTypes rt ON cr.RelationshipType = rt.TypeName
            WHERE cr.IsActive = 1
        `;

        const queryRequest = pool.request();

        if (ciId) {
            query += ' AND (cr.SourceCiId = @ciId OR cr.TargetCiId = @ciId)';
            queryRequest.input('ciId', ciId);
        }

        query += ' ORDER BY src.CiName, tgt.CiName';

        const result = await queryRequest.query(query);

        return {
            status: 200,
            jsonBody: { success: true, data: result.recordset }
        };
    } catch (error) {
        context.log('Error fetching ci relationships:', error);
        return handleDbError(error);
    }
}

async function createRelationship(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        if (!body.sourceCiId || !body.targetCiId || !body.relationshipType) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Source CI, Target CI, and Relationship Type are required' }
            };
        }

        if (body.sourceCiId === body.targetCiId) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'A CI cannot have a relationship with itself' }
            };
        }

        const result = await pool.request()
            .input('sourceCiId', body.sourceCiId)
            .input('targetCiId', body.targetCiId)
            .input('relationshipType', body.relationshipType)
            .input('description', body.description || null)
            .input('createdBy', userId)
            .query(`
                INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy)
                OUTPUT INSERTED.RelationshipId, INSERTED.SourceCiId, INSERTED.TargetCiId, INSERTED.RelationshipType
                VALUES (@sourceCiId, @targetCiId, @relationshipType, @description, @createdBy)
            `);

        return {
            status: 201,
            jsonBody: {
                success: true,
                message: 'CI relationship created successfully',
                data: result.recordset[0]
            }
        };
    } catch (error: any) {
        context.log('Error creating ci relationship:', error);
        if (error.message?.includes('UQ_CiRelationships')) {
            return {
                status: 400,
                jsonBody: { success: false, error: 'This relationship already exists' }
            };
        }
        return handleDbError(error);
    }
}

async function deleteRelationship(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const relationshipId = pathParts[pathParts.length - 1];

        if (!relationshipId || relationshipId === 'ci-relationships') {
            return {
                status: 400,
                jsonBody: { success: false, error: 'Relationship ID is required' }
            };
        }

        const result = await pool.request()
            .input('relationshipId', relationshipId)
            .query('DELETE FROM CiRelationships WHERE RelationshipId = @relationshipId');

        if (result.rowsAffected[0] === 0) {
            return {
                status: 404,
                jsonBody: { success: false, error: 'Relationship not found' }
            };
        }

        return {
            status: 200,
            jsonBody: { success: true, message: 'Relationship deleted successfully' }
        };
    } catch (error) {
        context.log('Error deleting ci relationship:', error);
        return handleDbError(error);
    }
}

// =============================================
// RELATIONSHIP TYPES (Reference Data)
// =============================================
export async function relationshipTypes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await getDbConnection();

        const result = await pool.request()
            .query(`
                SELECT TypeId, TypeName, ReverseTypeName, Category, Description
                FROM RelationshipTypes
                WHERE IsActive = 1
                ORDER BY Category, TypeName
            `);

        return {
            status: 200,
            jsonBody: { success: true, data: result.recordset }
        };
    } catch (error) {
        context.log('Error fetching relationship types:', error);
        return handleDbError(error);
    }
}

// Register all endpoints
app.http('service-ci-mappings', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    route: 'service-ci-mappings/{id?}',
    handler: serviceCiMappings
});

app.http('ci-relationships', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    route: 'ci-relationships/{id?}',
    handler: ciRelationships
});

app.http('relationship-types', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'relationship-types',
    handler: relationshipTypes
});
