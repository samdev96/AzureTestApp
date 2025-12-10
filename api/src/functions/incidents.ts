import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function incidents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for incidents.`);

    if (request.method === 'GET') {
        return await getIncidents(request, context);
    } else if (request.method === 'POST') {
        return await createIncident(request, context);
    } else if (request.method === 'PUT') {
        return await updateIncident(request, context);
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

async function getIncidents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET incidents.');

    try {
        const pool = await getDbConnection();
        
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userId = 'anonymous';
        let userRoles: string[] = [];
        let userPrincipal: any = null;
        
        context.log('Raw auth header:', userPrincipalHeader);
        
        if (userPrincipalHeader) {
            try {
                const decodedHeader = Buffer.from(userPrincipalHeader, 'base64').toString();
                context.log('Decoded auth header:', decodedHeader);
                
                userPrincipal = JSON.parse(decodedHeader);
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                userRoles = userPrincipal.userRoles || userPrincipal.roles || [];
                
                context.log('Full user principal object:', JSON.stringify(userPrincipal, null, 2));
                context.log('User ID:', userId);
                context.log('User Roles:', userRoles);
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        } else {
            context.log('No x-ms-client-principal header found');
        }
        
        // Get query parameters for filtering
        const status = request.query.get('status');
        const priority = request.query.get('priority');
        const assignedTo = request.query.get('assignedTo');
        const myTicketsOnly = request.query.get('myTicketsOnly') === 'true';
        
        let query = `
            SELECT 
                IncidentID,
                IncidentNumber,
                Title,
                Description,
                Category,
                Priority,
                Status,
                AffectedUser,
                ContactInfo,
                AssignedTo,
                AssignmentGroup,
                CreatedBy,
                CreatedDate,
                ModifiedDate,
                ResolvedDate
            FROM vw_IncidentsWithDetails
            WHERE 1=1
        `;
        
        const params: any = {};
        
        // Check if user is agent from database
        let isAgent = false;
        try {
            const agentCheckRequest = pool.request();
            agentCheckRequest.input('userEmail', userId);
            agentCheckRequest.input('userObjectId', userPrincipal?.userId || '');
            
            const agentResult = await agentCheckRequest.query(`
                SELECT COUNT(*) as AgentCount 
                FROM UserRoles 
                WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                    AND LOWER(RoleName) = 'agent' 
                    AND IsActive = 1
            `);
            
            isAgent = agentResult.recordset[0].AgentCount > 0;
            context.log('Database agent check:', { userId, isAgent, agentCount: agentResult.recordset[0].AgentCount });
        } catch (agentError) {
            context.log('Error checking agent status from database:', agentError);
            // Fallback to role-based check
            isAgent = userRoles.some(r => r.toLowerCase() === 'agent');
        }
        
        context.log('Agent check:', { isAgent, userId, userRoles, userPrincipal: userPrincipal?.userId, myTicketsOnly });
        
        // If user is not agent OR myTicketsOnly is explicitly requested, only show their own tickets
        if (!isAgent || myTicketsOnly) {
            query += ` AND CreatedBy = @userId`;
            params.userId = userId;
        }
        
        if (status) {
            query += ` AND Status = @status`;
            params.status = status;
        }
        
        if (priority) {
            query += ` AND Priority = @priority`;
            params.priority = priority;
        }
        
        if (assignedTo) {
            query += ` AND AssignedTo = @assignedTo`;
            params.assignedTo = assignedTo;
        }
        
        query += ` ORDER BY CreatedDate DESC`;
        
        const request_db = pool.request();
        
        // Add parameters to the request
        Object.keys(params).forEach(key => {
            request_db.input(key, params[key]);
        });
        
        const result = await request_db.query(query);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                data: result.recordset,
                total: result.recordset.length
            })
        };
        
    } catch (error) {
        context.log('Error fetching incidents:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorInfo.message
            })
        };
    }
}

async function createIncident(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for POST incident.');

    try {
        const body = await request.json() as any;
        
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userId = 'anonymous';
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                context.log('Creating incident for user:', userId);
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        }
        
        // Validate required fields
        const requiredFields = ['title', 'description', 'category', 'priority', 'affectedUser', 'contactInfo', 'assignmentGroup'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: `Missing required field: ${field}`
                    })
                };
            }
        }
        
        const pool = await getDbConnection();
        
        // Get category, priority, and assignment group IDs
        const lookupRequest = pool.request();
        lookupRequest.input('categoryName', body.category);
        lookupRequest.input('priorityName', body.priority);
        lookupRequest.input('assignmentGroupName', body.assignmentGroup);
        
        const lookupResult = await lookupRequest.query(`
            SELECT 
                (SELECT CategoryID FROM Categories WHERE CategoryName = @categoryName AND CategoryType = 'Incident') as CategoryID,
                (SELECT PriorityID FROM Priorities WHERE PriorityName = @priorityName) as PriorityID,
                (SELECT StatusID FROM Statuses WHERE StatusName = 'Open') as StatusID,
                (SELECT AssignmentGroupID FROM AssignmentGroups WHERE GroupName = @assignmentGroupName AND IsActive = 1) as AssignmentGroupID
        `);
        
        if (!lookupResult.recordset[0].CategoryID || !lookupResult.recordset[0].PriorityID || !lookupResult.recordset[0].AssignmentGroupID) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid category, priority, or assignment group'
                })
            };
        }
        
        const { CategoryID, PriorityID, StatusID, AssignmentGroupID } = lookupResult.recordset[0];
        
        // Insert the incident
        const insertRequest = pool.request();
        insertRequest.input('title', body.title);
        insertRequest.input('description', body.description);
        insertRequest.input('categoryId', CategoryID);
        insertRequest.input('priorityId', PriorityID);
        insertRequest.input('statusId', StatusID);
        insertRequest.input('assignmentGroupId', AssignmentGroupID);
        insertRequest.input('affectedUser', body.affectedUser);
        insertRequest.input('contactInfo', body.contactInfo);
        insertRequest.input('createdBy', userId);
        
        const insertResult = await insertRequest.query(`
            INSERT INTO Incidents (Title, Description, CategoryID, PriorityID, StatusID, AssignmentGroupID, AffectedUser, ContactInfo, CreatedBy)
            OUTPUT INSERTED.IncidentID, INSERTED.IncidentNumber
            VALUES (@title, @description, @categoryId, @priorityId, @statusId, @assignmentGroupId, @affectedUser, @contactInfo, @createdBy)
        `);
        
        const newIncident = insertResult.recordset[0];
        
        // Get the full incident details
        const detailRequest = pool.request();
        detailRequest.input('incidentId', newIncident.IncidentID);
        
        const detailResult = await detailRequest.query(`
            SELECT * FROM vw_IncidentsWithDetails WHERE IncidentID = @incidentId
        `);
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                data: detailResult.recordset[0],
                message: `Incident ${newIncident.IncidentNumber} created successfully`
            })
        };
        
    } catch (error) {
        context.log('Error creating incident:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorInfo.message
            })
        };
    }
}

async function updateIncident(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for PUT incident.');

    try {
        const pool = await getDbConnection();
        
        // Get user info from Static Web Apps authentication
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

        // Get the incident ID from the URL
        const incidentId = request.params?.id;
        if (!incidentId) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Incident ID is required'
                })
            };
        }

        // Parse the request body
        const requestBody = await request.text();
        const updatedTicket = JSON.parse(requestBody);

        // Map frontend field names to database field names
        const dbRequest = pool.request();
        dbRequest.input('IncidentID', incidentId);
        dbRequest.input('Title', updatedTicket.title);
        dbRequest.input('Description', updatedTicket.description);
        dbRequest.input('Category', updatedTicket.category);
        dbRequest.input('Priority', updatedTicket.priority);
        dbRequest.input('Status', updatedTicket.status);
        dbRequest.input('AssignmentGroup', updatedTicket.assignment_group || updatedTicket.assignmentGroup);
        dbRequest.input('AffectedUser', updatedTicket.affected_user || '');
        dbRequest.input('ContactInfo', updatedTicket.contact_info || '');
        dbRequest.input('AssignedTo', updatedTicket.assigned_to || null);
        dbRequest.input('ResolutionNotes', updatedTicket.resolution_notes || null);
        dbRequest.input('ModifiedBy', userId);

        let updateQuery = `
            UPDATE Incidents 
            SET 
                Title = @Title,
                Description = @Description,
                CategoryID = (SELECT CategoryID FROM Categories WHERE CategoryName = @Category AND CategoryType = 'Incident'),
                PriorityID = (SELECT PriorityID FROM Priorities WHERE PriorityName = @Priority),
                StatusID = (SELECT StatusID FROM Statuses WHERE StatusName = @Status),
                AssignmentGroupID = (SELECT AssignmentGroupID FROM AssignmentGroups WHERE GroupName = @AssignmentGroup AND IsActive = 1),
                AffectedUser = @AffectedUser,
                ContactInfo = @ContactInfo,
                AssignedTo = @AssignedTo,
                ModifiedBy = @ModifiedBy,
                ModifiedDate = GETUTCDATE()
        `;
        
        // Add ResolutionNotes and ResolvedDate if status is Resolved
        if (updatedTicket.status === 'Resolved') {
            updateQuery += `, ResolutionNotes = @ResolutionNotes, ResolvedDate = GETUTCDATE()`;
        }
        
        updateQuery += ` WHERE IncidentID = @IncidentID`;

        await dbRequest.query(updateQuery);

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                message: 'Incident updated successfully'
            })
        };
        
    } catch (error) {
        context.log('Error updating incident:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorInfo.message
            })
        };
    }
}

// Register the function
app.http('incidents', {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    route: 'incidents/{id?}',
    authLevel: 'anonymous',
    handler: incidents
});