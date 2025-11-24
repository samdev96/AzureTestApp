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
        const requestType = request.query.get('type');
        const urgency = request.query.get('urgency');
        const assignedTo = request.query.get('assignedTo');
        
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
        
        // Check if user is admin from database
        let isAdmin = false;
        try {
            const adminCheckRequest = pool.request();
            adminCheckRequest.input('userEmail', userId);
            adminCheckRequest.input('userObjectId', userPrincipal?.userId || '');
            
            const adminResult = await adminCheckRequest.query(`
                SELECT COUNT(*) as AdminCount 
                FROM UserRoles 
                WHERE (UserEmail = @userEmail OR UserObjectID = @userObjectId) 
                    AND RoleName = 'admin' 
                    AND IsActive = 1
            `);
            
            isAdmin = adminResult.recordset[0].AdminCount > 0;
            context.log('Database admin check:', { userId, isAdmin, adminCount: adminResult.recordset[0].AdminCount });
        } catch (adminError) {
            context.log('Error checking admin status from database:', adminError);
            // Fallback to role-based check
            isAdmin = userRoles.includes('admin');
        }
        
        context.log('Admin check:', { isAdmin, userId, userRoles, userPrincipalId: userPrincipal?.userId });
        
        // If user is not admin, only show their own tickets
        if (!isAdmin) {
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
        
        // Get user info from Static Web Apps authentication
        const userPrincipalHeader = request.headers.get('x-ms-client-principal');
        let userId = 'anonymous';
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                context.log('Creating request for user:', userId);
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        }
        
        // Validate required fields
        const requiredFields = [
            'title', 'description', 'requestType', 'urgency', 'justification',
            'requester', 'department', 'contactInfo', 'approver'
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
        
        // Get default status for new requests (Pending Approval)
        const statusRequest = pool.request();
        const statusResult = await statusRequest.query(`
            SELECT StatusID FROM Statuses WHERE StatusName = 'Pending Approval' AND StatusType = 'Request'
        `);
        
        if (!statusResult.recordset[0]) {
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Default status not found'
                })
            };
        }
        
        const statusId = statusResult.recordset[0].StatusID;
        
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
        insertRequest.input('createdBy', userId);
        
        const insertResult = await insertRequest.query(`
            INSERT INTO Requests (
                Title, Description, RequestType, Urgency, BusinessJustification, 
                RequesterName, Department, ContactInfo, ApproverName, StatusID, CreatedBy
            )
            OUTPUT INSERTED.RequestID, INSERTED.RequestNumber
            VALUES (
                @title, @description, @requestType, @urgency, @businessJustification,
                @requesterName, @department, @contactInfo, @approverName, @statusId, @createdBy
            )
        `);
        
        const newRequest = insertResult.recordset[0];
        
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
        dbRequest.input('BusinessJustification', updatedTicket.business_justification || '');
        dbRequest.input('RequesterName', updatedTicket.requester_name || '');
        dbRequest.input('Department', updatedTicket.department || '');
        dbRequest.input('ApproverName', updatedTicket.approver_name || '');
        dbRequest.input('AssignedTo', updatedTicket.assigned_to || null);
        dbRequest.input('CompletionNotes', updatedTicket.completion_notes || null);
        dbRequest.input('RejectionNotes', updatedTicket.rejection_notes || null);
        dbRequest.input('ModifiedBy', userId);

        let updateQuery = `
            UPDATE Requests 
            SET 
                Title = @Title,
                Description = @Description,
                RequestType = @RequestType,
                Urgency = @Urgency,
                StatusID = (SELECT StatusID FROM Statuses WHERE StatusName = @Status AND StatusType = 'Request'),
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