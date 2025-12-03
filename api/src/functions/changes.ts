import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection } from "../utils/database";

// =============================================
// CHANGE REQUESTS ENDPOINTS
// =============================================

// GET /api/changes - List all change requests
app.http('changes-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'changes',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            
            // Get query parameters for filtering
            const status = request.query.get('status');
            const changeType = request.query.get('changeType');
            const priority = request.query.get('priority');
            const environment = request.query.get('environment');
            const assignedTo = request.query.get('assignedTo');
            const myChangesOnly = request.query.get('myChangesOnly') === 'true';
            
            // Get user info
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
            
            let query = `SELECT * FROM vw_ChangeRequestsExpanded WHERE 1=1`;
            const params: any = {};
            
            if (status) {
                query += ` AND Status = @status`;
                params.status = status;
            }
            
            if (changeType) {
                query += ` AND ChangeType = @changeType`;
                params.changeType = changeType;
            }
            
            if (priority) {
                query += ` AND Priority = @priority`;
                params.priority = priority;
            }
            
            if (environment) {
                query += ` AND Environment = @environment`;
                params.environment = environment;
            }
            
            if (assignedTo) {
                query += ` AND AssignedTo = @assignedTo`;
                params.assignedTo = assignedTo;
            }
            
            if (myChangesOnly) {
                query += ` AND (RequestedBy = @userId OR AssignedTo = @userId)`;
                params.userId = userId;
            }
            
            query += ` ORDER BY CreatedDate DESC`;
            
            const dbRequest = pool.request();
            Object.keys(params).forEach(key => {
                dbRequest.input(key, params[key]);
            });
            
            const result = await dbRequest.query(query);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching changes:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// GET /api/changes/:id - Get single change request with details
app.http('changes-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'changes/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            
            // Get change request
            const changeResult = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM vw_ChangeRequestsExpanded WHERE ChangeId = @id`);
            
            if (changeResult.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Change request not found' } };
            }
            
            // Get impacted CIs
            const cisResult = await pool.request()
                .input('id', id)
                .query(`
                    SELECT 
                        ic.*,
                        s.ServiceName,
                        ci.CiName,
                        ci.CiType
                    FROM ChangeImpactedCIs ic
                    LEFT JOIN Services s ON ic.ServiceId = s.ServiceId
                    LEFT JOIN ConfigurationItems ci ON ic.CiId = ci.CiId
                    WHERE ic.ChangeId = @id
                `);
            
            // Get impacted integrations
            const integrationsResult = await pool.request()
                .input('id', id)
                .query(`
                    SELECT 
                        ii.*,
                        i.IntegrationName,
                        i.IntegrationType,
                        i.Direction
                    FROM ChangeImpactedIntegrations ii
                    JOIN Integrations i ON ii.IntegrationId = i.IntegrationId
                    WHERE ii.ChangeId = @id
                `);
            
            // Get approvals
            const approvalsResult = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM ChangeApprovals WHERE ChangeId = @id ORDER BY RequestedDate`);
            
            // Get tasks
            const tasksResult = await pool.request()
                .input('id', id)
                .query(`SELECT * FROM ChangeTasks WHERE ChangeId = @id ORDER BY Sequence, TaskId`);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        ...changeResult.recordset[0],
                        impactedCIs: cisResult.recordset,
                        impactedIntegrations: integrationsResult.recordset,
                        approvals: approvalsResult.recordset,
                        tasks: tasksResult.recordset
                    }
                }
            };
        } catch (error: any) {
            context.error('Error fetching change:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// POST /api/changes - Create new change request
app.http('changes-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'changes',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            // Get user info
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
            
            // Helper to convert empty strings to null for dates
            const parseDate = (val: any) => val && val.trim() !== '' ? val : null;
            const parseNumber = (val: any) => val && val !== '' ? parseInt(val, 10) : null;
            
            const result = await pool.request()
                .input('title', body.title)
                .input('description', body.description)
                .input('justification', body.justification || null)
                .input('changeType', body.changeType || 'Normal')
                .input('category', body.category || 'Other')
                .input('priority', body.priority || 'Medium')
                .input('riskLevel', body.riskLevel || 'Medium')
                .input('impact', body.impact || 'Medium')
                .input('status', body.status || 'Draft')
                .input('requestedStartDate', parseDate(body.requestedStartDate))
                .input('requestedEndDate', parseDate(body.requestedEndDate))
                .input('environment', body.environment || 'Production')
                .input('implementationPlan', body.implementationPlan || null)
                .input('backoutPlan', body.backoutPlan || null)
                .input('testPlan', body.testPlan || null)
                .input('communicationPlan', body.communicationPlan || null)
                .input('primaryServiceId', parseNumber(body.primaryServiceId))
                .input('requestedBy', body.requestedBy || userId)
                .input('assignedTo', body.assignedTo || null)
                .input('assignmentGroupId', parseNumber(body.assignmentGroupId))
                .input('changeManager', body.changeManager || null)
                .input('requiresCAB', body.requiresCAB || false)
                .input('createdBy', userId)
                .query(`
                    INSERT INTO ChangeRequests (
                        Title, Description, Justification, ChangeType, Category,
                        Priority, RiskLevel, Impact, Status,
                        RequestedStartDate, RequestedEndDate, Environment,
                        ImplementationPlan, BackoutPlan, TestPlan, CommunicationPlan,
                        PrimaryServiceId, RequestedBy, AssignedTo, AssignmentGroupId,
                        ChangeManager, RequiresCAB, CreatedBy
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @title, @description, @justification, @changeType, @category,
                        @priority, @riskLevel, @impact, @status,
                        @requestedStartDate, @requestedEndDate, @environment,
                        @implementationPlan, @backoutPlan, @testPlan, @communicationPlan,
                        @primaryServiceId, @requestedBy, @assignedTo, @assignmentGroupId,
                        @changeManager, @requiresCAB, @createdBy
                    )
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error creating change:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// PUT /api/changes/:id - Update change request
app.http('changes-update', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'changes/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            // Get user info
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
            
            // Helper to convert empty strings to null for dates
            const parseDate = (val: any) => val && val.trim && val.trim() !== '' ? val : (val || null);
            const parseNumber = (val: any) => val && val !== '' ? parseInt(val, 10) : null;
            
            const result = await pool.request()
                .input('id', id)
                .input('title', body.title)
                .input('description', body.description)
                .input('justification', body.justification || null)
                .input('changeType', body.changeType)
                .input('category', body.category)
                .input('priority', body.priority)
                .input('riskLevel', body.riskLevel)
                .input('impact', body.impact)
                .input('status', body.status)
                .input('requestedStartDate', parseDate(body.requestedStartDate))
                .input('requestedEndDate', parseDate(body.requestedEndDate))
                .input('scheduledStartDate', parseDate(body.scheduledStartDate))
                .input('scheduledEndDate', parseDate(body.scheduledEndDate))
                .input('actualStartDate', parseDate(body.actualStartDate))
                .input('actualEndDate', parseDate(body.actualEndDate))
                .input('environment', body.environment)
                .input('implementationPlan', body.implementationPlan || null)
                .input('backoutPlan', body.backoutPlan || null)
                .input('testPlan', body.testPlan || null)
                .input('communicationPlan', body.communicationPlan || null)
                .input('primaryServiceId', parseNumber(body.primaryServiceId))
                .input('assignedTo', body.assignedTo || null)
                .input('assignmentGroupId', parseNumber(body.assignmentGroupId))
                .input('changeManager', body.changeManager || null)
                .input('requiresCAB', body.requiresCAB || false)
                .input('cabDate', parseDate(body.cabDate))
                .input('cabNotes', body.cabNotes || null)
                .input('closureCode', body.closureCode || null)
                .input('closureNotes', body.closureNotes || null)
                .input('modifiedBy', userId)
                .query(`
                    UPDATE ChangeRequests SET
                        Title = @title,
                        Description = @description,
                        Justification = @justification,
                        ChangeType = @changeType,
                        Category = @category,
                        Priority = @priority,
                        RiskLevel = @riskLevel,
                        Impact = @impact,
                        Status = @status,
                        RequestedStartDate = @requestedStartDate,
                        RequestedEndDate = @requestedEndDate,
                        ScheduledStartDate = @scheduledStartDate,
                        ScheduledEndDate = @scheduledEndDate,
                        ActualStartDate = @actualStartDate,
                        ActualEndDate = @actualEndDate,
                        Environment = @environment,
                        ImplementationPlan = @implementationPlan,
                        BackoutPlan = @backoutPlan,
                        TestPlan = @testPlan,
                        CommunicationPlan = @communicationPlan,
                        PrimaryServiceId = @primaryServiceId,
                        AssignedTo = @assignedTo,
                        AssignmentGroupId = @assignmentGroupId,
                        ChangeManager = @changeManager,
                        RequiresCAB = @requiresCAB,
                        CABDate = @cabDate,
                        CABNotes = @cabNotes,
                        ClosureCode = @closureCode,
                        ClosureNotes = @closureNotes,
                        ModifiedDate = GETUTCDATE(),
                        ModifiedBy = @modifiedBy
                    OUTPUT INSERTED.*
                    WHERE ChangeId = @id
                `);
            
            if (result.recordset.length === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Change request not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error updating change:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/changes/:id - Delete change request
app.http('changes-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'changes/{id}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const id = request.params.id;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('id', id)
                .query(`DELETE FROM ChangeRequests WHERE ChangeId = @id`);
            
            if (result.rowsAffected[0] === 0) {
                return { status: 404, jsonBody: { success: false, error: 'Change request not found' } };
            }
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Change request deleted' }
            };
        } catch (error: any) {
            context.error('Error deleting change:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// CHANGE IMPACTED CIs ENDPOINTS
// =============================================

// POST /api/changes/:id/impacted-cis - Add impacted CI/Service
app.http('changes-add-impacted-ci', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'changes/{id}/impacted-cis',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const changeId = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const userPrincipalHeader = request.headers.get('x-ms-client-principal');
            let userId = 'anonymous';
            if (userPrincipalHeader) {
                try {
                    const decoded = Buffer.from(userPrincipalHeader, 'base64').toString();
                    const principal = JSON.parse(decoded);
                    userId = principal.userDetails || principal.userId || 'anonymous';
                } catch (e) {}
            }
            
            const result = await pool.request()
                .input('changeId', changeId)
                .input('serviceId', body.serviceId || null)
                .input('ciId', body.ciId || null)
                .input('impactType', body.impactType || 'Modified')
                .input('impactDescription', body.impactDescription || null)
                .input('riskLevel', body.riskLevel || null)
                .input('preChangeValidation', body.preChangeValidation || null)
                .input('postChangeValidation', body.postChangeValidation || null)
                .input('createdBy', userId)
                .query(`
                    INSERT INTO ChangeImpactedCIs (
                        ChangeId, ServiceId, CiId, ImpactType, ImpactDescription,
                        RiskLevel, PreChangeValidation, PostChangeValidation, CreatedBy
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @changeId, @serviceId, @ciId, @impactType, @impactDescription,
                        @riskLevel, @preChangeValidation, @postChangeValidation, @createdBy
                    )
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error adding impacted CI:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/changes/:id/impacted-cis/:impactId
app.http('changes-remove-impacted-ci', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'changes/{id}/impacted-cis/{impactId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { id, impactId } = request.params;
            const pool = await getDbConnection();
            
            await pool.request()
                .input('changeId', id)
                .input('impactId', impactId)
                .query(`DELETE FROM ChangeImpactedCIs WHERE ChangeId = @changeId AND ImpactId = @impactId`);
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Impacted CI removed' }
            };
        } catch (error: any) {
            context.error('Error removing impacted CI:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// CHANGE IMPACTED INTEGRATIONS ENDPOINTS
// =============================================

// POST /api/changes/:id/impacted-integrations
app.http('changes-add-impacted-integration', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'changes/{id}/impacted-integrations',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const changeId = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const userPrincipalHeader = request.headers.get('x-ms-client-principal');
            let userId = 'anonymous';
            if (userPrincipalHeader) {
                try {
                    const decoded = Buffer.from(userPrincipalHeader, 'base64').toString();
                    const principal = JSON.parse(decoded);
                    userId = principal.userDetails || principal.userId || 'anonymous';
                } catch (e) {}
            }
            
            const result = await pool.request()
                .input('changeId', changeId)
                .input('integrationId', body.integrationId)
                .input('impactType', body.impactType || 'Affected')
                .input('impactDescription', body.impactDescription || null)
                .input('preChangeAction', body.preChangeAction || null)
                .input('postChangeAction', body.postChangeAction || null)
                .input('notificationRequired', body.notificationRequired || false)
                .input('createdBy', userId)
                .query(`
                    INSERT INTO ChangeImpactedIntegrations (
                        ChangeId, IntegrationId, ImpactType, ImpactDescription,
                        PreChangeAction, PostChangeAction, NotificationRequired, CreatedBy
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @changeId, @integrationId, @impactType, @impactDescription,
                        @preChangeAction, @postChangeAction, @notificationRequired, @createdBy
                    )
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error adding impacted integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/changes/:id/impacted-integrations/:impactId
app.http('changes-remove-impacted-integration', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'changes/{id}/impacted-integrations/{impactId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { id, impactId } = request.params;
            const pool = await getDbConnection();
            
            await pool.request()
                .input('changeId', id)
                .input('impactId', impactId)
                .query(`DELETE FROM ChangeImpactedIntegrations WHERE ChangeId = @changeId AND ImpactId = @impactId`);
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Impacted integration removed' }
            };
        } catch (error: any) {
            context.error('Error removing impacted integration:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// CHANGE TASKS ENDPOINTS
// =============================================

// POST /api/changes/:id/tasks
app.http('changes-add-task', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'changes/{id}/tasks',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const changeId = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const userPrincipalHeader = request.headers.get('x-ms-client-principal');
            let userId = 'anonymous';
            if (userPrincipalHeader) {
                try {
                    const decoded = Buffer.from(userPrincipalHeader, 'base64').toString();
                    const principal = JSON.parse(decoded);
                    userId = principal.userDetails || principal.userId || 'anonymous';
                } catch (e) {}
            }
            
            const result = await pool.request()
                .input('changeId', changeId)
                .input('title', body.title)
                .input('description', body.description || null)
                .input('taskType', body.taskType || 'Implementation')
                .input('sequence', body.sequence || 0)
                .input('assignedTo', body.assignedTo || null)
                .input('plannedStartDate', body.plannedStartDate || null)
                .input('plannedEndDate', body.plannedEndDate || null)
                .input('createdBy', userId)
                .query(`
                    INSERT INTO ChangeTasks (
                        ChangeId, Title, Description, TaskType, Sequence,
                        AssignedTo, PlannedStartDate, PlannedEndDate, CreatedBy
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @changeId, @title, @description, @taskType, @sequence,
                        @assignedTo, @plannedStartDate, @plannedEndDate, @createdBy
                    )
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error adding task:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// PUT /api/changes/:id/tasks/:taskId
app.http('changes-update-task', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'changes/{id}/tasks/{taskId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { id, taskId } = request.params;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const userPrincipalHeader = request.headers.get('x-ms-client-principal');
            let userId = 'anonymous';
            if (userPrincipalHeader) {
                try {
                    const decoded = Buffer.from(userPrincipalHeader, 'base64').toString();
                    const principal = JSON.parse(decoded);
                    userId = principal.userDetails || principal.userId || 'anonymous';
                } catch (e) {}
            }
            
            const result = await pool.request()
                .input('changeId', id)
                .input('taskId', taskId)
                .input('title', body.title)
                .input('description', body.description || null)
                .input('taskType', body.taskType)
                .input('sequence', body.sequence)
                .input('assignedTo', body.assignedTo || null)
                .input('status', body.status)
                .input('plannedStartDate', body.plannedStartDate || null)
                .input('plannedEndDate', body.plannedEndDate || null)
                .input('actualStartDate', body.actualStartDate || null)
                .input('actualEndDate', body.actualEndDate || null)
                .input('notes', body.notes || null)
                .input('modifiedBy', userId)
                .query(`
                    UPDATE ChangeTasks SET
                        Title = @title,
                        Description = @description,
                        TaskType = @taskType,
                        Sequence = @sequence,
                        AssignedTo = @assignedTo,
                        Status = @status,
                        PlannedStartDate = @plannedStartDate,
                        PlannedEndDate = @plannedEndDate,
                        ActualStartDate = @actualStartDate,
                        ActualEndDate = @actualEndDate,
                        Notes = @notes,
                        ModifiedDate = GETUTCDATE(),
                        ModifiedBy = @modifiedBy
                    OUTPUT INSERTED.*
                    WHERE ChangeId = @changeId AND TaskId = @taskId
                `);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error updating task:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// DELETE /api/changes/:id/tasks/:taskId
app.http('changes-delete-task', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'changes/{id}/tasks/{taskId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { id, taskId } = request.params;
            const pool = await getDbConnection();
            
            await pool.request()
                .input('changeId', id)
                .input('taskId', taskId)
                .query(`DELETE FROM ChangeTasks WHERE ChangeId = @changeId AND TaskId = @taskId`);
            
            return {
                status: 200,
                jsonBody: { success: true, message: 'Task deleted' }
            };
        } catch (error: any) {
            context.error('Error deleting task:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// CHANGE APPROVALS ENDPOINTS
// =============================================

// POST /api/changes/:id/approvals - Request approval
app.http('changes-request-approval', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'changes/{id}/approvals',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const changeId = request.params.id;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('changeId', changeId)
                .input('approverEmail', body.approverEmail)
                .input('approverName', body.approverName || null)
                .input('approvalRole', body.approvalRole)
                .query(`
                    INSERT INTO ChangeApprovals (ChangeId, ApproverEmail, ApproverName, ApprovalRole)
                    OUTPUT INSERTED.*
                    VALUES (@changeId, @approverEmail, @approverName, @approvalRole)
                `);
            
            return {
                status: 201,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error requesting approval:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// PUT /api/changes/:id/approvals/:approvalId - Update approval decision
app.http('changes-update-approval', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'changes/{id}/approvals/{approvalId}',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { id, approvalId } = request.params;
            const body = await request.json() as any;
            const pool = await getDbConnection();
            
            const result = await pool.request()
                .input('changeId', id)
                .input('approvalId', approvalId)
                .input('status', body.status)
                .input('decision', body.decision)
                .input('comments', body.comments || null)
                .query(`
                    UPDATE ChangeApprovals SET
                        Status = @status,
                        Decision = @decision,
                        Comments = @comments,
                        DecisionDate = GETUTCDATE()
                    OUTPUT INSERTED.*
                    WHERE ChangeId = @changeId AND ApprovalId = @approvalId
                `);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset[0] }
            };
        } catch (error: any) {
            context.error('Error updating approval:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// CHANGE CALENDAR ENDPOINT
// =============================================

// GET /api/changes/calendar - Get changes for calendar view
app.http('changes-calendar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'changes-calendar',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const pool = await getDbConnection();
            
            const startDate = request.query.get('startDate');
            const endDate = request.query.get('endDate');
            
            let query = `SELECT * FROM vw_ChangeCalendar WHERE 1=1`;
            const params: any = {};
            
            if (startDate) {
                query += ` AND StartDate >= @startDate`;
                params.startDate = startDate;
            }
            
            if (endDate) {
                query += ` AND EndDate <= @endDate`;
                params.endDate = endDate;
            }
            
            query += ` ORDER BY StartDate`;
            
            const dbRequest = pool.request();
            Object.keys(params).forEach(key => {
                dbRequest.input(key, params[key]);
            });
            
            const result = await dbRequest.query(query);
            
            return {
                status: 200,
                jsonBody: { success: true, data: result.recordset }
            };
        } catch (error: any) {
            context.error('Error fetching change calendar:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});

// =============================================
// IMPACT ANALYSIS ENDPOINT
// =============================================

// GET /api/changes/:id/impact-analysis - Analyze impact of a change
app.http('changes-impact-analysis', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'changes/{id}/impact-analysis',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const changeId = request.params.id;
            const pool = await getDbConnection();
            
            // Get impacted CIs with their dependent services
            const dependentServicesResult = await pool.request()
                .input('changeId', changeId)
                .query(`
                    SELECT DISTINCT s.ServiceId, s.ServiceName, s.Criticality, s.BusinessOwner
                    FROM ChangeImpactedCIs ic
                    JOIN ServiceCiMapping scm ON ic.CiId = scm.CiId
                    JOIN Services s ON scm.ServiceId = s.ServiceId
                    WHERE ic.ChangeId = @changeId
                    UNION
                    SELECT DISTINCT s.ServiceId, s.ServiceName, s.Criticality, s.BusinessOwner
                    FROM ChangeImpactedCIs ic
                    JOIN Services s ON ic.ServiceId = s.ServiceId
                    WHERE ic.ChangeId = @changeId
                `);
            
            // Get downstream CIs (CIs that depend on impacted CIs)
            const downstreamCIsResult = await pool.request()
                .input('changeId', changeId)
                .query(`
                    SELECT DISTINCT ci.CiId, ci.CiName, ci.CiType, ci.Status, rel.RelationshipType
                    FROM ChangeImpactedCIs ic
                    JOIN CiRelationships rel ON ic.CiId = rel.TargetCiId
                    JOIN ConfigurationItems ci ON rel.SourceCiId = ci.CiId
                    WHERE ic.ChangeId = @changeId
                `);
            
            // Get integrations that might be affected
            const affectedIntegrationsResult = await pool.request()
                .input('changeId', changeId)
                .query(`
                    SELECT DISTINCT i.IntegrationId, i.IntegrationName, i.IntegrationType, i.Status, i.HealthStatus
                    FROM ChangeImpactedCIs ic
                    JOIN Integrations i ON (
                        (i.SourceCiId = ic.CiId OR i.TargetCiId = ic.CiId) OR
                        (i.SourceServiceId = ic.ServiceId OR i.TargetServiceId = ic.ServiceId)
                    )
                    WHERE ic.ChangeId = @changeId
                    AND NOT EXISTS (
                        SELECT 1 FROM ChangeImpactedIntegrations cii 
                        WHERE cii.ChangeId = @changeId AND cii.IntegrationId = i.IntegrationId
                    )
                `);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        dependentServices: dependentServicesResult.recordset,
                        downstreamCIs: downstreamCIsResult.recordset,
                        potentiallyAffectedIntegrations: affectedIntegrationsResult.recordset
                    }
                }
            };
        } catch (error: any) {
            context.error('Error analyzing impact:', error);
            return {
                status: 500,
                jsonBody: { success: false, error: error.message }
            };
        }
    }
});
