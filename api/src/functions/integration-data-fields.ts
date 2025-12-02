import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection } from "../utils/database";

// Get all data fields for a specific integration
app.http('integrationDataFields', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integrations/{integrationId}/data-fields',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Integration Data Fields function processing request');
        
        const integrationId = request.params.integrationId;
        
        if (!integrationId || isNaN(Number(integrationId))) {
            return {
                status: 400,
                jsonBody: { error: 'Valid integration ID is required' }
            };
        }
        
        try {
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('integrationId', integrationId)
                .query(`
                    SELECT 
                        DataFieldId,
                        IntegrationId,
                        FieldName,
                        FieldType,
                        Direction,
                        IsPII,
                        IsRequired,
                        SampleValue,
                        Description,
                        CreatedAt,
                        UpdatedAt
                    FROM IntegrationDataFields
                    WHERE IntegrationId = @integrationId
                    ORDER BY Direction, FieldName
                `);
            
            return {
                jsonBody: result.recordset
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});

// Get a specific data field by ID
app.http('integrationDataFieldById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'integration-data-fields/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Get Integration Data Field by ID');
        
        const id = request.params.id;
        
        if (!id || isNaN(Number(id))) {
            return {
                status: 400,
                jsonBody: { error: 'Valid data field ID is required' }
            };
        }
        
        try {
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('id', id)
                .query(`
                    SELECT 
                        df.DataFieldId,
                        df.IntegrationId,
                        df.FieldName,
                        df.FieldType,
                        df.Direction,
                        df.IsPII,
                        df.IsRequired,
                        df.SampleValue,
                        df.Description,
                        df.CreatedAt,
                        df.UpdatedAt,
                        i.IntegrationName
                    FROM IntegrationDataFields df
                    LEFT JOIN Integrations i ON df.IntegrationId = i.IntegrationId
                    WHERE df.DataFieldId = @id
                `);
            
            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: 'Data field not found' }
                };
            }
            
            return {
                jsonBody: result.recordset[0]
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});

// Create a new data field
app.http('createIntegrationDataField', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'integration-data-fields',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Create Integration Data Field');
        
        try {
            const body = await request.json() as {
                integrationId: number;
                fieldName: string;
                fieldType?: string;
                direction?: string;
                isPII?: boolean;
                isRequired?: boolean;
                sampleValue?: string;
                description?: string;
            };
            
            if (!body.integrationId || !body.fieldName) {
                return {
                    status: 400,
                    jsonBody: { error: 'integrationId and fieldName are required' }
                };
            }
            
            const pool = await getDbConnection();
            
            // Verify integration exists
            const integrationCheck = await pool.request()
                .input('integrationId', body.integrationId)
                .query('SELECT IntegrationId FROM Integrations WHERE IntegrationId = @integrationId');
            
            if (integrationCheck.recordset.length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'Integration not found' }
                };
            }
            
            const result = await pool.request()
                .input('integrationId', body.integrationId)
                .input('fieldName', body.fieldName)
                .input('fieldType', body.fieldType || 'String')
                .input('direction', body.direction || 'Sent')
                .input('isPII', body.isPII || false)
                .input('isRequired', body.isRequired || false)
                .input('sampleValue', body.sampleValue || null)
                .input('description', body.description || null)
                .query(`
                    INSERT INTO IntegrationDataFields 
                        (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, SampleValue, Description)
                    OUTPUT INSERTED.*
                    VALUES 
                        (@integrationId, @fieldName, @fieldType, @direction, @isPII, @isRequired, @sampleValue, @description)
                `);
            
            return {
                status: 201,
                jsonBody: result.recordset[0]
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});

// Update a data field
app.http('updateIntegrationDataField', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'integration-data-fields/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Update Integration Data Field');
        
        const id = request.params.id;
        
        if (!id || isNaN(Number(id))) {
            return {
                status: 400,
                jsonBody: { error: 'Valid data field ID is required' }
            };
        }
        
        try {
            const body = await request.json() as {
                fieldName?: string;
                fieldType?: string;
                direction?: string;
                isPII?: boolean;
                isRequired?: boolean;
                sampleValue?: string;
                description?: string;
            };
            
            const pool = await getDbConnection();
            
            // Build dynamic update query
            const updates: string[] = [];
            const params: { [key: string]: any } = { id };
            
            if (body.fieldName !== undefined) {
                updates.push('FieldName = @fieldName');
                params.fieldName = body.fieldName;
            }
            if (body.fieldType !== undefined) {
                updates.push('FieldType = @fieldType');
                params.fieldType = body.fieldType;
            }
            if (body.direction !== undefined) {
                updates.push('Direction = @direction');
                params.direction = body.direction;
            }
            if (body.isPII !== undefined) {
                updates.push('IsPII = @isPII');
                params.isPII = body.isPII;
            }
            if (body.isRequired !== undefined) {
                updates.push('IsRequired = @isRequired');
                params.isRequired = body.isRequired;
            }
            if (body.sampleValue !== undefined) {
                updates.push('SampleValue = @sampleValue');
                params.sampleValue = body.sampleValue;
            }
            if (body.description !== undefined) {
                updates.push('Description = @description');
                params.description = body.description;
            }
            
            if (updates.length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'No fields to update' }
                };
            }
            
            updates.push('UpdatedAt = GETUTCDATE()');
            
            const request2 = pool.request().input('id', id);
            for (const [key, value] of Object.entries(params)) {
                if (key !== 'id') {
                    request2.input(key, value);
                }
            }
            
            const result = await request2.query(`
                UPDATE IntegrationDataFields 
                SET ${updates.join(', ')}
                OUTPUT INSERTED.*
                WHERE DataFieldId = @id
            `);
            
            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: 'Data field not found' }
                };
            }
            
            return {
                jsonBody: result.recordset[0]
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});

// Delete a data field
app.http('deleteIntegrationDataField', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'integration-data-fields/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Delete Integration Data Field');
        
        const id = request.params.id;
        
        if (!id || isNaN(Number(id))) {
            return {
                status: 400,
                jsonBody: { error: 'Valid data field ID is required' }
            };
        }
        
        try {
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('id', id)
                .query(`
                    DELETE FROM IntegrationDataFields 
                    OUTPUT DELETED.DataFieldId
                    WHERE DataFieldId = @id
                `);
            
            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: 'Data field not found' }
                };
            }
            
            return {
                status: 204,
                body: undefined
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});

// Bulk create data fields for an integration
app.http('bulkCreateIntegrationDataFields', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'integrations/{integrationId}/data-fields/bulk',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Bulk Create Integration Data Fields');
        
        const integrationId = request.params.integrationId;
        
        if (!integrationId || isNaN(Number(integrationId))) {
            return {
                status: 400,
                jsonBody: { error: 'Valid integration ID is required' }
            };
        }
        
        try {
            const body = await request.json() as {
                fields: Array<{
                    fieldName: string;
                    fieldType?: string;
                    direction?: string;
                    isPII?: boolean;
                    isRequired?: boolean;
                    sampleValue?: string;
                    description?: string;
                }>;
            };
            
            if (!body.fields || !Array.isArray(body.fields) || body.fields.length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'fields array is required' }
                };
            }
            
            const pool = await getDbConnection();
            
            // Verify integration exists
            const integrationCheck = await pool.request()
                .input('integrationId', integrationId)
                .query('SELECT IntegrationId FROM Integrations WHERE IntegrationId = @integrationId');
            
            if (integrationCheck.recordset.length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'Integration not found' }
                };
            }
            
            const createdFields = [];
            
            for (const field of body.fields) {
                if (!field.fieldName) continue;
                
                const result = await pool.request()
                    .input('integrationId', integrationId)
                    .input('fieldName', field.fieldName)
                    .input('fieldType', field.fieldType || 'String')
                    .input('direction', field.direction || 'Sent')
                    .input('isPII', field.isPII || false)
                    .input('isRequired', field.isRequired || false)
                    .input('sampleValue', field.sampleValue || null)
                    .input('description', field.description || null)
                    .query(`
                        INSERT INTO IntegrationDataFields 
                            (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, SampleValue, Description)
                        OUTPUT INSERTED.*
                        VALUES 
                            (@integrationId, @fieldName, @fieldType, @direction, @isPII, @isRequired, @sampleValue, @description)
                    `);
                
                createdFields.push(result.recordset[0]);
            }
            
            return {
                status: 201,
                jsonBody: {
                    created: createdFields.length,
                    fields: createdFields
                }
            };
        } catch (error) {
            context.error('Database error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Database connection failed', details: String(error) }
            };
        }
    }
});
