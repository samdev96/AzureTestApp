import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection } from "../utils/database";

// =============================================
// EXTERNAL SYSTEMS ENDPOINTS
// =============================================

// GET /api/external-systems - List all external systems
app.http('external-systems-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'external-systems',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            const result = await pool.request().query(`
                SELECT * FROM ExternalSystems
                ORDER BY SystemName
            `);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching external systems:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// GET /api/external-systems/:id - Get single external system
app.http('external-systems-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'external-systems/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            const result = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM ExternalSystems WHERE ExternalSystemId = @id`);
            
            if (result.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'External system not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error fetching external system:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// POST /api/external-systems - Create external system
app.http('external-systems-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'external-systems',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('systemName', body.systemName)
                .input('vendor', body.vendor || null)
                .input('category', body.category)
                .input('description', body.description || null)
                .input('baseUrl', body.baseUrl || null)
                .input('documentationUrl', body.documentationUrl || null)
                .input('contactEmail', body.contactEmail || null)
                .input('contractExpiry', body.contractExpiry || null)
                .input('status', body.status || 'Active')
                .input('createdBy', body.createdBy || 'system')
                .query(`
                    INSERT INTO ExternalSystems 
                    (SystemName, Vendor, Category, Description, BaseUrl, DocumentationUrl, ContactEmail, ContractExpiry, Status, CreatedBy)
                    OUTPUT INSERTED.*
                    VALUES (@systemName, @vendor, @category, @description, @baseUrl, @documentationUrl, @contactEmail, @contractExpiry, @status, @createdBy)
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error creating external system:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// PUT /api/external-systems/:id - Update external system
app.http('external-systems-update', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'external-systems/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('id', id)
                .input('systemName', body.systemName)
                .input('vendor', body.vendor || null)
                .input('category', body.category)
                .input('description', body.description || null)
                .input('baseUrl', body.baseUrl || null)
                .input('documentationUrl', body.documentationUrl || null)
                .input('contactEmail', body.contactEmail || null)
                .input('contractExpiry', body.contractExpiry || null)
                .input('status', body.status)
                .input('modifiedBy', body.modifiedBy || 'system')
                .query(`
                    UPDATE ExternalSystems SET
                        SystemName = @systemName,
                        Vendor = @vendor,
                        Category = @category,
                        Description = @description,
                        BaseUrl = @baseUrl,
                        DocumentationUrl = @documentationUrl,
                        ContactEmail = @contactEmail,
                        ContractExpiry = @contractExpiry,
                        Status = @status,
                        ModifiedDate = GETUTCDATE(),
                        ModifiedBy = @modifiedBy
                    OUTPUT INSERTED.*
                    WHERE ExternalSystemId = @id
                `);
            
            if (result.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'External system not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error updating external system:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/external-systems/:id - Delete external system
app.http('external-systems-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'external-systems/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            
            // Check if used in any integrations
            const checkResult = await pool.request()
                .input('id', id)
                .query(`SELECT COUNT(*) as count FROM Integrations WHERE SourceExternalId = @id OR TargetExternalId = @id`);
            
            if (checkResult.recordset[0].count > 0) {
                return {
                    status: 400,
                    jsonBody: { success: false, error: 'Cannot delete external system that is used in integrations' }
                };
            }
            
            const result = await pool.request()
                .input('id', id)
                .query(`DELETE FROM ExternalSystems WHERE ExternalSystemId = @id`);
            
            if (result.rowsAffected[0] === 0) {
                return { status: 404, jsonBody: { success: false, error: 'External system not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'External system deleted' }
            };
        } catch (error: any) {
            context.error('Error deleting external system:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// GET /api/external-system-categories - List categories
app.http('external-system-categories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'external-system-categories',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            const result = await pool.request().query(`SELECT * FROM ExternalSystemCategories ORDER BY CategoryName`);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching categories:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});
