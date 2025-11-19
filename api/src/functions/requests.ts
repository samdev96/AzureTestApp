import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function requests(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for requests.`);

    if (request.method === 'GET') {
        return await getRequests(request, context);
    } else if (request.method === 'POST') {
        return await createRequest(request, context);
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
        
        if (userPrincipalHeader) {
            try {
                const userPrincipal = JSON.parse(Buffer.from(userPrincipalHeader, 'base64').toString());
                userId = userPrincipal.userDetails || userPrincipal.userId || 'anonymous';
                userRoles = userPrincipal.roles || [];
                context.log('User ID:', userId);
                context.log('User Roles:', userRoles);
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
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
        
        // If user is not admin, only show their own tickets
        const isAdmin = userRoles.includes('admin');
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

// Register the function
app.http('requests', {
    methods: ['GET', 'POST', 'OPTIONS'],
    route: 'requests',
    authLevel: 'anonymous',
    handler: requests
});