import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function requests(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for requests.`);

    if (request.method === 'GET') {
        return await getRequests(request, context);
    } else if (request.method === 'POST') {
        return await createRequest(request, context);
    } else if (request.method === 'PUT') {
        return await updateRequest(request, context);
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

async function getRequests(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET requests.');

    try {
        const pool = await getDbConnection();
        
        // Check for impersonation header
        const impersonatedUser = request.headers.get('X-Impersonated-User');
        
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userId = 'anonymous';
        let userRoles: string[] = [];
        let userPrincipal: any = null;
        
        context.log('Raw auth header:', userPrincipalHeader);
        context.log('Impersonated user:', impersonatedUser);
        
        if (userPrincipalHeader) {
            try {
                const decodedHeader = Buffer.from(userPrincipalHeader, 'base64').toString();
                context.log('Decoded auth header:', decodedHeader);
                
                userPrincipal = JSON.parse(decodedHeader);
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                userRoles = userPrincipal.userRoles || userPrincipal.roles || [];
                
                // Override with impersonated user if present
                if (impersonatedUser) {
                    userId = impersonatedUser;
                    context.log('Using impersonated user:', impersonatedUser);
                }
                
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
        const requestType = request.query.get('type');
        const urgency = request.query.get('urgency');
        const assignedTo = request.query.get('assignedTo');
        const myTicketsOnly = request.query.get('myTicketsOnly') === 'true';
        
        let query = `
            SELECT 
                RequestID,
                RequestNumber,
                Title,
                Description,
                RequestType,
                Urgency,
                BusinessJustification,
                RequesterName,
                Department,
                ContactInfo,
                ApproverName,
                Status,
                AssignedTo,
                AssignmentGroup,
                CreatedBy,
                CreatedDate,
                ModifiedDate,
                ApprovedDate,
                ApprovedBy,
                CompletedDate
            FROM vw_RequestsWithDetails
            WHERE 1=1
        `;
        
        const params: any = {};
        
        // Check if user is agent or admin from database
        let isAgentOrAdmin = false;
        try {
            const agentCheckRequest = pool.request();
            agentCheckRequest.input('userEmail', userId);
            agentCheckRequest.input('userObjectId', userPrincipal?.userId || '');
            
            const agentResult = await agentCheckRequest.query(`
                SELECT COUNT(*) as AgentCount 
                FROM UserRoles 
                WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                    AND LOWER(RoleName) IN ('agent', 'admin') 
                    AND IsActive = 1
            `);
            
            isAgentOrAdmin = agentResult.recordset[0].AgentCount > 0;
            context.log('Database agent/admin check:', { userId, isAgentOrAdmin, agentCount: agentResult.recordset[0].AgentCount });
        } catch (agentError) {
            context.log('Error checking agent/admin status from database:', agentError);
            // Fallback to role-based check
            isAgentOrAdmin = userRoles.some(r => r.toLowerCase() === 'agent' || r.toLowerCase() === 'admin');
        }
        
        context.log('Agent/Admin check:', { isAgentOrAdmin, userId, userRoles, userPrincipalId: userPrincipal?.userId, myTicketsOnly });
        
        // If user is not agent/admin OR myTicketsOnly is explicitly requested, only show their own tickets
        if (!isAgentOrAdmin || myTicketsOnly) {
            query += ` AND CreatedBy = @userId`;
            params.userId = userId;
        }
        
        if (status) {
            query += ` AND Status = @status`;
            params.status = status;
        }
        
        if (requestType) {
            query += ` AND RequestType = @requestType`;
            params.requestType = requestType;
        }
        
        if (urgency) {
            query += ` AND Urgency = @urgency`;
            params.urgency = urgency;
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
        context.log('Error fetching requests:', error);
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

async function createRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for POST request.');

    try {
        const body = await request.json() as any;
        
        // Check for impersonation header
        const impersonatedUser = request.headers.get('X-Impersonated-User');
        
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userId = 'anonymous';
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                
                // Override with impersonated user if present
                if (impersonatedUser) {
                    userId = impersonatedUser;
                    context.log('Creating request for impersonated user:', impersonatedUser);
                } else {
                    context.log('Creating request for user:', userId);
                }
                context.log('Creating request for user:', userId);
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        }
        
        // Validate required fields
        const requiredFields = [
            'title', 'description', 'requestType', 'urgency', 'justification',
            'requester', 'department', 'contactInfo', 'approver', 'assignmentGroup'
        ];
        
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
        
        // Get default status and assignment group ID for new requests
        const lookupRequest = pool.request();
        lookupRequest.input('assignmentGroupName', body.assignmentGroup);
        
        const lookupResult = await lookupRequest.query(`
            SELECT 
                (SELECT StatusID FROM Statuses WHERE StatusName = 'Pending Approval' AND StatusType = 'Request') as StatusID,
                (SELECT AssignmentGroupID FROM AssignmentGroups WHERE GroupName = @assignmentGroupName AND IsActive = 1) as AssignmentGroupID
        `);
        
        if (!lookupResult.recordset[0].StatusID || !lookupResult.recordset[0].AssignmentGroupID) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid assignment group or default status not found'
                })
            };
        }
        
        const { StatusID: statusId, AssignmentGroupID: assignmentGroupId } = lookupResult.recordset[0];
        
        // Insert the request
        const insertRequest = pool.request();
        insertRequest.input('title', body.title);
        insertRequest.input('description', body.description);
        insertRequest.input('requestType', body.requestType);
        insertRequest.input('urgency', body.urgency);
        insertRequest.input('businessJustification', body.justification);
        insertRequest.input('requesterName', body.requester);
        insertRequest.input('department', body.department);
        insertRequest.input('contactInfo', body.contactInfo);
        insertRequest.input('approverName', body.approver);
        insertRequest.input('statusId', statusId);
        insertRequest.input('assignmentGroupId', assignmentGroupId);
        insertRequest.input('createdBy', userId);
        
        const insertResult = await insertRequest.query(`
            INSERT INTO Requests (
                Title, Description, RequestType, Urgency, BusinessJustification, 
                RequesterName, Department, ContactInfo, ApproverName, StatusID, AssignmentGroupID, CreatedBy
            )
            OUTPUT INSERTED.RequestID, INSERTED.RequestNumber
            VALUES (
                @title, @description, @requestType, @urgency, @businessJustification,
                @requesterName, @department, @contactInfo, @approverName, @statusId, @assignmentGroupId, @createdBy
            )
        `);
        
        const newRequest = insertResult.recordset[0];
        
        // Create approval record if approver email is provided
        if (body.approver) {
            const approvalRequest = pool.request();
            approvalRequest.input('requestId', newRequest.RequestID);
            approvalRequest.input('approverEmail', body.approver);
            approvalRequest.input('createdBy', userId);
            
            await approvalRequest.query(`
                INSERT INTO Approvals (
                    ApprovalType, RequestID, ApproverEmail, Status, RequestedDate, CreatedBy
                )
                VALUES (
                    'Request', @requestId, @approverEmail, 'Pending', GETUTCDATE(), @createdBy
                )
            `);
            
            context.log(`Created approval record for request ${newRequest.RequestNumber} to be approved by ${body.approver}`);
        }
        
        // Get the full request details
        const detailRequest = pool.request();
        detailRequest.input('requestId', newRequest.RequestID);
        
        const detailResult = await detailRequest.query(`
            SELECT * FROM vw_RequestsWithDetails WHERE RequestID = @requestId
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
                message: `Service Request ${newRequest.RequestNumber} created successfully`
            })
        };
        
    } catch (error) {
        context.log('Error creating request:', error);
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

async function updateRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for PUT request.');

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

        // Get the request ID from the URL
        const requestId = request.params?.id;
        if (!requestId) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Request ID is required'
                })
            };
        }

        // Parse the request body
        const requestBody = await request.text();
        const updatedTicket = JSON.parse(requestBody);

        // Map frontend field names to database field names
        const dbRequest = pool.request();
        dbRequest.input('RequestID', requestId);
        dbRequest.input('Title', updatedTicket.title);
        dbRequest.input('Description', updatedTicket.description);
        dbRequest.input('RequestType', updatedTicket.request_type || 'Other');
        dbRequest.input('Urgency', updatedTicket.priority); // Frontend uses 'priority' but DB uses 'Urgency' for requests
        dbRequest.input('Status', updatedTicket.status);
        dbRequest.input('AssignmentGroup', updatedTicket.assignment_group || updatedTicket.assignmentGroup);
        dbRequest.input('BusinessJustification', updatedTicket.business_justification || '');
        dbRequest.input('RequesterName', updatedTicket.requester_name || '');
        dbRequest.input('Department', updatedTicket.department || '');
        dbRequest.input('ApproverName', updatedTicket.approver_name || '');
        dbRequest.input('AssignedTo', updatedTicket.assigned_to || null);
        dbRequest.input('CompletionNotes', updatedTicket.completion_notes || null);
        dbRequest.input('RejectionNotes', updatedTicket.rejection_notes || null);
        dbRequest.input('ModifiedBy', userId);

        // Validate that the status exists
        const statusCheck = await pool.request()
            .input('Status', updatedTicket.status)
            .query(`SELECT StatusID FROM Statuses WHERE StatusName = @Status`);
        
        if (statusCheck.recordset.length === 0) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: `Invalid status: ${updatedTicket.status}. Please select a valid status.`
                })
            };
        }

        // Validate that the assignment group exists if provided
        const assignmentGroup = updatedTicket.assignment_group || updatedTicket.assignmentGroup;
        if (assignmentGroup) {
            const groupCheck = await pool.request()
                .input('AssignmentGroup', assignmentGroup)
                .query(`SELECT AssignmentGroupID FROM AssignmentGroups WHERE GroupName = @AssignmentGroup AND IsActive = 1`);
            
            if (groupCheck.recordset.length === 0) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: `Invalid assignment group: ${assignmentGroup}. Please select a valid group.`
                    })
                };
            }
        }

        let updateQuery = `
            UPDATE Requests 
            SET 
                Title = @Title,
                Description = @Description,
                RequestType = @RequestType,
                Urgency = @Urgency,
                StatusID = (SELECT StatusID FROM Statuses WHERE StatusName = @Status),
                AssignmentGroupID = (SELECT AssignmentGroupID FROM AssignmentGroups WHERE GroupName = @AssignmentGroup AND IsActive = 1),
                BusinessJustification = @BusinessJustification,
                RequesterName = @RequesterName,
                Department = @Department,
                ApproverName = @ApproverName,
                AssignedTo = @AssignedTo,
                ModifiedBy = @ModifiedBy,
                ModifiedDate = GETUTCDATE()
        `;
        
        // Add specific notes and dates based on status
        if (updatedTicket.status === 'Completed') {
            updateQuery += `, CompletionNotes = @CompletionNotes, CompletedDate = GETUTCDATE()`;
        } else if (updatedTicket.status === 'Rejected') {
            updateQuery += `, CompletionNotes = @RejectionNotes`; // Store rejection notes in completion notes field
        }
        
        updateQuery += ` WHERE RequestID = @RequestID`;

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
                message: 'Request updated successfully'
            })
        };
        
    } catch (error) {
        context.log('Error updating request:', error);
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
app.http('requests', {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    route: 'requests/{id?}',
    authLevel: 'anonymous',
    handler: requests
});