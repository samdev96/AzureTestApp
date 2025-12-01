import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function services(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for services.`);

    if (request.method === 'GET') {
        return await getServices(request, context);
    } else if (request.method === 'POST') {
        return await createService(request, context);
    } else if (request.method === 'PUT') {
        return await updateService(request, context);
    } else if (request.method === 'DELETE') {
        return await deleteService(request, context);
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

async function getServices(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET services.');

    try {
        const pool = await getDbConnection();

        // Get query parameters for filtering
        const status = request.query.get('status');
        const criticality = request.query.get('criticality');
        const serviceId = request.query.get('id');

        // Single service lookup
        if (serviceId) {
            const result = await pool.request()
                .input('serviceId', serviceId)
                .query(`
                    SELECT 
                        s.ServiceId,
                        s.ServiceName,
                        s.Description,
                        s.BusinessOwner,
                        s.TechnicalOwner,
                        s.Criticality,
                        s.Status,
                        s.SLA,
                        s.SupportGroupId,
                        ag.GroupName AS SupportGroup,
                        s.CreatedDate,
                        s.CreatedBy,
                        s.ModifiedDate,
                        s.ModifiedBy,
                        (SELECT COUNT(*) FROM ServiceCiMapping WHERE ServiceId = s.ServiceId) AS CiCount
                    FROM Services s
                    LEFT JOIN AssignmentGroups ag ON s.SupportGroupId = ag.AssignmentGroupID
                    WHERE s.ServiceId = @serviceId
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: 'Service not found'
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
                s.ServiceId,
                s.ServiceName,
                s.Description,
                s.BusinessOwner,
                s.TechnicalOwner,
                s.Criticality,
                s.Status,
                s.SLA,
                s.SupportGroupId,
                ag.GroupName AS SupportGroup,
                s.CreatedDate,
                s.CreatedBy,
                s.ModifiedDate,
                s.ModifiedBy,
                (SELECT COUNT(*) FROM ServiceCiMapping WHERE ServiceId = s.ServiceId) AS CiCount
            FROM Services s
            LEFT JOIN AssignmentGroups ag ON s.SupportGroupId = ag.AssignmentGroupID
            WHERE 1=1
        `;

        const queryRequest = pool.request();

        if (status) {
            query += ' AND s.Status = @status';
            queryRequest.input('status', status);
        }

        if (criticality) {
            query += ' AND s.Criticality = @criticality';
            queryRequest.input('criticality', criticality);
        }

        query += ' ORDER BY s.ServiceName';

        const result = await queryRequest.query(query);

        return {
            status: 200,
            jsonBody: {
                success: true,
                data: result.recordset
            }
        };
    } catch (error) {
        context.log('Error fetching services:', error);
        return handleDbError(error);
    }
}

async function createService(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for POST services.');

    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        // Validate required fields
        if (!body.serviceName) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Service name is required'
                }
            };
        }

        const result = await pool.request()
            .input('serviceName', body.serviceName)
            .input('description', body.description || null)
            .input('businessOwner', body.businessOwner || null)
            .input('technicalOwner', body.technicalOwner || null)
            .input('criticality', body.criticality || 'Medium')
            .input('status', body.status || 'Active')
            .input('sla', body.sla || null)
            .input('supportGroupId', body.supportGroupId || null)
            .input('createdBy', userId)
            .query(`
                INSERT INTO Services (
                    ServiceName, Description, BusinessOwner, TechnicalOwner,
                    Criticality, Status, SLA, SupportGroupId, CreatedBy
                )
                OUTPUT INSERTED.ServiceId, INSERTED.ServiceName, INSERTED.Criticality, INSERTED.Status
                VALUES (
                    @serviceName, @description, @businessOwner, @technicalOwner,
                    @criticality, @status, @sla, @supportGroupId, @createdBy
                )
            `);

        context.log('Service created:', result.recordset[0]);

        return {
            status: 201,
            jsonBody: {
                success: true,
                message: 'Service created successfully',
                data: result.recordset[0]
            }
        };
    } catch (error) {
        context.log('Error creating service:', error);
        return handleDbError(error);
    }
}

async function updateService(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for PUT services.');

    try {
        const pool = await getDbConnection();
        const { userId } = await getUserInfo(request, context);
        const body = await request.json() as any;

        // Get serviceId from URL path or body
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const serviceId = pathParts[pathParts.length - 1] !== 'services' 
            ? pathParts[pathParts.length - 1] 
            : body.serviceId;

        if (!serviceId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Service ID is required'
                }
            };
        }

        // Check if service exists
        const existingService = await pool.request()
            .input('serviceId', serviceId)
            .query('SELECT ServiceId FROM Services WHERE ServiceId = @serviceId');

        if (existingService.recordset.length === 0) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Service not found'
                }
            };
        }

        const result = await pool.request()
            .input('serviceId', serviceId)
            .input('serviceName', body.serviceName)
            .input('description', body.description || null)
            .input('businessOwner', body.businessOwner || null)
            .input('technicalOwner', body.technicalOwner || null)
            .input('criticality', body.criticality || 'Medium')
            .input('status', body.status || 'Active')
            .input('sla', body.sla || null)
            .input('supportGroupId', body.supportGroupId || null)
            .input('modifiedBy', userId)
            .query(`
                UPDATE Services
                SET ServiceName = @serviceName,
                    Description = @description,
                    BusinessOwner = @businessOwner,
                    TechnicalOwner = @technicalOwner,
                    Criticality = @criticality,
                    Status = @status,
                    SLA = @sla,
                    SupportGroupId = @supportGroupId,
                    ModifiedDate = GETUTCDATE(),
                    ModifiedBy = @modifiedBy
                WHERE ServiceId = @serviceId;
                
                SELECT ServiceId, ServiceName, Criticality, Status
                FROM Services WHERE ServiceId = @serviceId
            `);

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Service updated successfully',
                data: result.recordset[0]
            }
        };
    } catch (error) {
        context.log('Error updating service:', error);
        return handleDbError(error);
    }
}

async function deleteService(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for DELETE services.');

    try {
        const pool = await getDbConnection();

        // Get serviceId from URL path
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const serviceId = pathParts[pathParts.length - 1];

        if (!serviceId || serviceId === 'services') {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Service ID is required'
                }
            };
        }

        // Check if service has linked CIs
        const linkedCIs = await pool.request()
            .input('serviceId', serviceId)
            .query('SELECT COUNT(*) as count FROM ServiceCiMapping WHERE ServiceId = @serviceId');

        if (linkedCIs.recordset[0].count > 0) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Cannot delete service with linked Configuration Items. Remove the mappings first.'
                }
            };
        }

        const result = await pool.request()
            .input('serviceId', serviceId)
            .query('DELETE FROM Services WHERE ServiceId = @serviceId');

        if (result.rowsAffected[0] === 0) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Service not found'
                }
            };
        }

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Service deleted successfully'
            }
        };
    } catch (error) {
        context.log('Error deleting service:', error);
        return handleDbError(error);
    }
}

app.http('services', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'services/{id?}',
    handler: services
});
