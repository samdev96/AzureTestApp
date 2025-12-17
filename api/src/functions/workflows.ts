import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { 
    getWorkflowsContainer, 
    Workflow, 
    WorkflowType,
    generateId 
} from '../utils/cosmosdb';

// GET /api/workflows - List all workflows or filter by type
async function getWorkflows(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const container = getWorkflowsContainer();
        const workflowType = request.query.get('type') as WorkflowType | null;
        const defaultOnly = request.query.get('defaultOnly') === 'true';

        let querySpec: any = {
            query: 'SELECT * FROM c WHERE c.isActive = true'
        };

        const parameters: any[] = [];

        if (workflowType) {
            querySpec.query += ' AND c.workflowType = @workflowType';
            parameters.push({ name: '@workflowType', value: workflowType });
        }

        if (defaultOnly) {
            querySpec.query += ' AND c.isDefault = true';
        }

        if (parameters.length > 0) {
            querySpec.parameters = parameters;
        }

        const { resources: workflows } = await container.items.query<Workflow>(querySpec).fetchAll();

        // Sort by workflowType and then by isDefault
        workflows.sort((a, b) => {
            if (a.workflowType !== b.workflowType) {
                return a.workflowType.localeCompare(b.workflowType);
            }
            if (a.isDefault !== b.isDefault) {
                return a.isDefault ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            status: 200,
            jsonBody: {
                success: true,
                data: workflows
            }
        };
    } catch (error) {
        context.error('Error fetching workflows:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Failed to fetch workflows',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

// GET /api/workflows/{id} - Get a specific workflow by ID
async function getWorkflowById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const workflowId = request.params.id;
        if (!workflowId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Workflow ID is required'
                }
            };
        }

        const container = getWorkflowsContainer();
        
        try {
            const { resource: workflow } = await container.item(workflowId, workflowId).read<Workflow>();
            
            if (!workflow) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: 'Workflow not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: workflow
                }
            };
        } catch (error: any) {
            if (error.code === 404) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: 'Workflow not found'
                    }
                };
            }
            throw error;
        }
    } catch (error) {
        context.error('Error fetching workflow:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Failed to fetch workflow',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

// POST /api/workflows - Create a new workflow
async function createWorkflow(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Partial<Workflow>;

        if (!body.workflowType || !body.name || !body.definition) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'workflowType, name, and definition are required'
                }
            };
        }

        // Get user info from headers (set by Easy Auth)
        const userEmail = request.headers.get('x-ms-client-principal-name') || 'system';

        const container = getWorkflowsContainer();
        const now = new Date().toISOString();
        
        const workflow: Workflow = {
            id: generateId(),
            workflowType: body.workflowType,
            name: body.name,
            description: body.description || '',
            isDefault: body.isDefault || false,
            isActive: body.isActive !== undefined ? body.isActive : true,
            version: body.version || '1.0.0',
            createdBy: userEmail,
            createdDate: now,
            modifiedBy: userEmail,
            modifiedDate: now,
            definition: body.definition
        };

        // If setting as default, unset other defaults for this workflow type
        if (workflow.isDefault) {
            const { resources: existingDefaults } = await container.items
                .query({
                    query: 'SELECT * FROM c WHERE c.workflowType = @workflowType AND c.isDefault = true',
                    parameters: [{ name: '@workflowType', value: workflow.workflowType }]
                })
                .fetchAll();

            for (const existing of existingDefaults) {
                await container.item(existing.id, existing.id).patch([
                    { op: 'replace', path: '/isDefault', value: false },
                    { op: 'replace', path: '/modifiedBy', value: userEmail },
                    { op: 'replace', path: '/modifiedDate', value: now }
                ]);
            }
        }

        const { resource: createdWorkflow } = await container.items.create(workflow);

        return {
            status: 201,
            jsonBody: {
                success: true,
                data: createdWorkflow
            }
        };
    } catch (error) {
        context.error('Error creating workflow:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Failed to create workflow',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

// PUT /api/workflows/{id} - Update an existing workflow
async function updateWorkflow(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const workflowId = request.params.id;
        if (!workflowId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Workflow ID is required'
                }
            };
        }

        const body = await request.json() as Partial<Workflow>;
        const userEmail = request.headers.get('x-ms-client-principal-name') || 'system';

        const container = getWorkflowsContainer();
        
        // Get existing workflow
        const { resource: existingWorkflow } = await container.item(workflowId, workflowId).read<Workflow>();
        
        if (!existingWorkflow) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Workflow not found'
                }
            };
        }

        const now = new Date().toISOString();

        // Build updated workflow
        const updatedWorkflow: Workflow = {
            ...existingWorkflow,
            name: body.name !== undefined ? body.name : existingWorkflow.name,
            description: body.description !== undefined ? body.description : existingWorkflow.description,
            isDefault: body.isDefault !== undefined ? body.isDefault : existingWorkflow.isDefault,
            isActive: body.isActive !== undefined ? body.isActive : existingWorkflow.isActive,
            version: body.version !== undefined ? body.version : existingWorkflow.version,
            definition: body.definition !== undefined ? body.definition : existingWorkflow.definition,
            modifiedBy: userEmail,
            modifiedDate: now
        };

        // If setting as default, unset other defaults for this workflow type
        if (updatedWorkflow.isDefault && !existingWorkflow.isDefault) {
            const { resources: existingDefaults } = await container.items
                .query({
                    query: 'SELECT * FROM c WHERE c.workflowType = @workflowType AND c.isDefault = true AND c.id != @id',
                    parameters: [
                        { name: '@workflowType', value: updatedWorkflow.workflowType },
                        { name: '@id', value: workflowId }
                    ]
                })
                .fetchAll();

            for (const existing of existingDefaults) {
                await container.item(existing.id, existing.id).patch([
                    { op: 'replace', path: '/isDefault', value: false },
                    { op: 'replace', path: '/modifiedBy', value: userEmail },
                    { op: 'replace', path: '/modifiedDate', value: now }
                ]);
            }
        }

        const { resource: result } = await container.item(workflowId, workflowId).replace(updatedWorkflow);

        return {
            status: 200,
            jsonBody: {
                success: true,
                data: result
            }
        };
    } catch (error) {
        context.error('Error updating workflow:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Failed to update workflow',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

// DELETE /api/workflows/{id} - Delete a workflow (soft delete by setting isActive to false)
async function deleteWorkflow(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const workflowId = request.params.id;
        if (!workflowId) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Workflow ID is required'
                }
            };
        }

        const userEmail = request.headers.get('x-ms-client-principal-name') || 'system';
        const container = getWorkflowsContainer();
        
        // Get existing workflow
        const { resource: existingWorkflow } = await container.item(workflowId, workflowId).read<Workflow>();
        
        if (!existingWorkflow) {
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: 'Workflow not found'
                }
            };
        }

        // Prevent deletion of default workflows
        if (existingWorkflow.isDefault) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Cannot delete default workflow. Set another workflow as default first.'
                }
            };
        }

        const now = new Date().toISOString();

        // Soft delete
        await container.item(workflowId, workflowId).patch([
            { op: 'replace', path: '/isActive', value: false },
            { op: 'replace', path: '/modifiedBy', value: userEmail },
            { op: 'replace', path: '/modifiedDate', value: now }
        ]);

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Workflow deleted successfully'
            }
        };
    } catch (error) {
        context.error('Error deleting workflow:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Failed to delete workflow',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

// Main handler function
async function workflowsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const method = request.method;

    if (method === 'GET' && request.params.id) {
        return getWorkflowById(request, context);
    } else if (method === 'GET') {
        return getWorkflows(request, context);
    } else if (method === 'POST') {
        return createWorkflow(request, context);
    } else if (method === 'PUT' && request.params.id) {
        return updateWorkflow(request, context);
    } else if (method === 'DELETE' && request.params.id) {
        return deleteWorkflow(request, context);
    }

    return {
        status: 405,
        jsonBody: {
            success: false,
            error: 'Method not allowed'
        }
    };
}

app.http('workflows', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'workflows/{id?}',
    handler: workflowsHandler
});
