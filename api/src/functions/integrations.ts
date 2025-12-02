import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection } from "../utils/database";

// =============================================
// INTEGRATIONS ENDPOINTS
// =============================================

// GET /api/integrations - List all integrations
app.http('integrations-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integrations',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            const result = await pool.request().query(`
                SELECT * FROM vw_IntegrationsExpanded
                ORDER BY IntegrationName
            `);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching integrations:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// GET /api/integrations/:id - Get single integration with data fields
app.http('integrations-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integrations/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            
            // Get integration
            const integrationResult = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM vw_IntegrationsExpanded WHERE IntegrationId = @id`);
            
            if (integrationResult.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Integration not found' } };
            }
            
            // Get data fields
            const fieldsResult = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM IntegrationDataFields WHERE IntegrationId = @id ORDER BY FieldName`);
            
            // Get dependencies
            const depsResult = await pool.request()
                .input('id', id)
                .query(`
                    SELECT d.*, i.IntegrationName AS DependsOnName
                    FROM IntegrationDependencies d
                    JOIN Integrations i ON d.DependsOnIntegrationId = i.IntegrationId
                    WHERE d.IntegrationId = @id
                `);
            
            return {
                status: 200,
                jsonBody: { 
                    success: true, 
                    data: {
                        ...integrationResult.recordset[0],
                        dataFields: fieldsResult.recordset,
                        dependencies: depsResult.recordset
                    }
                }
            };
        } catch (error: any) {
            context.error('Error fetching integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// POST /api/integrations - Create integration
app.http('integrations-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'integrations',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('integrationName', body.integrationName)
                .input('description', body.description || null)
                .input('integrationType', body.integrationType)
                .input('direction', body.direction || 'Outbound')
                .input('sourceType', body.sourceType)
                .input('sourceServiceId', body.sourceType === 'Service' ? body.sourceId : null)
                .input('sourceCiId', body.sourceType === 'CI' ? body.sourceId : null)
                .input('sourceExternalId', body.sourceType === 'External' ? body.sourceId : null)
                .input('targetType', body.targetType)
                .input('targetServiceId', body.targetType === 'Service' ? body.targetId : null)
                .input('targetCiId', body.targetType === 'CI' ? body.targetId : null)
                .input('targetExternalId', body.targetType === 'External' ? body.targetId : null)
                .input('protocol', body.protocol || null)
                .input('authMethod', body.authMethod || null)
                .input('endpoint', body.endpoint || null)
                .input('port', body.port || null)
                .input('dataFormat', body.dataFormat || null)
                .input('dataClassification', body.dataClassification || 'Internal')
                .input('frequencyType', body.frequencyType || 'OnDemand')
                .input('frequencyDetails', body.frequencyDetails || null)
                .input('status', body.status || 'Active')
                .input('healthStatus', body.healthStatus || 'Unknown')
                .input('sla', body.sla || null)
                .input('owner', body.owner || null)
                .input('supportGroupId', body.supportGroupId || null)
                .input('createdBy', body.createdBy || 'system')
                .query(`
                    INSERT INTO Integrations 
                    (IntegrationName, Description, IntegrationType, Direction,
                     SourceType, SourceServiceId, SourceCiId, SourceExternalId,
                     TargetType, TargetServiceId, TargetCiId, TargetExternalId,
                     Protocol, AuthMethod, Endpoint, Port,
                     DataFormat, DataClassification, FrequencyType, FrequencyDetails,
                     Status, HealthStatus, SLA, Owner, SupportGroupId, CreatedBy)
                    OUTPUT INSERTED.*
                    VALUES (@integrationName, @description, @integrationType, @direction,
                            @sourceType, @sourceServiceId, @sourceCiId, @sourceExternalId,
                            @targetType, @targetServiceId, @targetCiId, @targetExternalId,
                            @protocol, @authMethod, @endpoint, @port,
                            @dataFormat, @dataClassification, @frequencyType, @frequencyDetails,
                            @status, @healthStatus, @sla, @owner, @supportGroupId, @createdBy)
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error creating integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// PUT /api/integrations/:id - Update integration
app.http('integrations-update', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'integrations/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('id', id)
                .input('integrationName', body.integrationName)
                .input('description', body.description || null)
                .input('integrationType', body.integrationType)
                .input('direction', body.direction)
                .input('sourceType', body.sourceType)
                .input('sourceServiceId', body.sourceType === 'Service' ? body.sourceId : null)
                .input('sourceCiId', body.sourceType === 'CI' ? body.sourceId : null)
                .input('sourceExternalId', body.sourceType === 'External' ? body.sourceId : null)
                .input('targetType', body.targetType)
                .input('targetServiceId', body.targetType === 'Service' ? body.targetId : null)
                .input('targetCiId', body.targetType === 'CI' ? body.targetId : null)
                .input('targetExternalId', body.targetType === 'External' ? body.targetId : null)
                .input('protocol', body.protocol || null)
                .input('authMethod', body.authMethod || null)
                .input('endpoint', body.endpoint || null)
                .input('port', body.port || null)
                .input('dataFormat', body.dataFormat || null)
                .input('dataClassification', body.dataClassification)
                .input('frequencyType', body.frequencyType)
                .input('frequencyDetails', body.frequencyDetails || null)
                .input('status', body.status)
                .input('healthStatus', body.healthStatus)
                .input('sla', body.sla || null)
                .input('owner', body.owner || null)
                .input('supportGroupId', body.supportGroupId || null)
                .input('modifiedBy', body.modifiedBy || 'system')
                .query(`
                    UPDATE Integrations SET
                        IntegrationName = @integrationName,
                        Description = @description,
                        IntegrationType = @integrationType,
                        Direction = @direction,
                        SourceType = @sourceType,
                        SourceServiceId = @sourceServiceId,
                        SourceCiId = @sourceCiId,
                        SourceExternalId = @sourceExternalId,
                        TargetType = @targetType,
                        TargetServiceId = @targetServiceId,
                        TargetCiId = @targetCiId,
                        TargetExternalId = @targetExternalId,
                        Protocol = @protocol,
                        AuthMethod = @authMethod,
                        Endpoint = @endpoint,
                        Port = @port,
                        DataFormat = @dataFormat,
                        DataClassification = @dataClassification,
                        FrequencyType = @frequencyType,
                        FrequencyDetails = @frequencyDetails,
                        Status = @status,
                        HealthStatus = @healthStatus,
                        SLA = @sla,
                        Owner = @owner,
                        SupportGroupId = @supportGroupId,
                        ModifiedDate = GETUTCDATE(),
                        ModifiedBy = @modifiedBy
                    OUTPUT INSERTED.*
                    WHERE IntegrationId = @id
                `);
            
            if (result.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Integration not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error updating integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/integrations/:id - Delete integration
app.http('integrations-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'integrations/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            
            // Data fields will be deleted via cascade
            const result = await pool.request()
                .input('id', id)
                .query(`DELETE FROM Integrations WHERE IntegrationId = @id`);
            
            if (result.rowsAffected[0] === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Integration not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Integration deleted' }
            };
        } catch (error: any) {
            context.error('Error deleting integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// DATA FIELDS ENDPOINTS
// =============================================

// POST /api/integrations/:id/fields - Add data field
app.http('integration-fields-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'integrations/{id}/fields',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const integrationId = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('integrationId', integrationId)
                .input('fieldName', body.fieldName)
                .input('fieldType', body.fieldType || null)
                .input('direction', body.direction || 'Sent')
                .input('isPII', body.isPII || false)
                .input('isRequired', body.isRequired || false)
                .input('description', body.description || null)
                .query(`
                    INSERT INTO IntegrationDataFields
                    (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description)
                    OUTPUT INSERTED.*
                    VALUES (@integrationId, @fieldName, @fieldType, @direction, @isPII, @isRequired, @description)
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error creating data field:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/integrations/:id/fields/:fieldId - Delete data field
app.http('integration-fields-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'integrations/{id}/fields/{fieldId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const fieldId = request.params.fieldId;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('fieldId', fieldId)
                .query(`DELETE FROM IntegrationDataFields WHERE FieldId = @fieldId`);
            
            if (result.rowsAffected[0] === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Data field not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Data field deleted' }
            };
        } catch (error: any) {
            context.error('Error deleting data field:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// REFERENCE DATA ENDPOINTS
// =============================================

// GET /api/integration-types - List integration types
app.http('integration-types', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integration-types',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            const result = await pool.request().query(`
                SELECT * FROM IntegrationTypes WHERE IsActive = 1 ORDER BY TypeName
            `);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching integration types:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// GET /api/integrations/graph - Get integration graph data for visualization
app.http('integrations-graph', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integrations/graph',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            
            // Get all integrations with resolved names
            const integrationsResult = await pool.request().query(`
                SELECT * FROM vw_IntegrationsExpanded WHERE Status = 'Active'
            `);
            
            // Get all external systems
            const externalResult = await pool.request().query(`
                SELECT * FROM ExternalSystems WHERE Status = 'Active'
            `);
            
            return {
                status: 200,
                jsonBody: { 
                    success: true, 
                    data: {
                        integrations: integrationsResult.recordset,
                        externalSystems: externalResult.recordset
                    }
                }
            };
        } catch (error: any) {
            context.error('Error fetching integration graph:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});
