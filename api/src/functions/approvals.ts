import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function approvals(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for approvals.`);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Impersonated-User'
            }
        };
    }

    if (request.method === 'GET') {
        return await getApprovals(request, context);
    } else if (request.method === 'PUT') {
        return await updateApproval(request, context);
    } else {
        return {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed'
            })
        };
    }
}

async function getApprovals(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for GET approvals.');

    try {
        const pool = await getDbConnection();
        
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
                    context.log('Fetching approvals for impersonated user:', impersonatedUser);
                } else {
                    context.log('Fetching approvals for user:', userId);
                }
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        }
        
        // Get query parameters for filtering
        const status = request.query.get('status') || 'Pending'; // Default to pending approvals
        const approvalType = request.query.get('type'); // 'Request' or 'Incident'
        
        let query = `
            SELECT 
                ApprovalID,
                ApprovalType,
                RequestID,
                IncidentID,
                ApproverEmail,
                ApproverName,
                Status,
                RequestedDate,
                ResponseDate,
                Comments,
                RespondedBy,
                RequestNumber,
                RequestTitle,
                RequestDescription,
                RequestType,
                RequestUrgency,
                RequestRequester,
                RequestDepartment,
                RequestCreatedBy,
                RequestCreatedDate,
                IncidentNumber,
                IncidentTitle,
                IncidentDescription,
                IncidentCategory,
                IncidentPriority,
                IncidentAffectedUser,
                IncidentCreatedBy,
                IncidentCreatedDate,
                HoursPending
            FROM vw_ApprovalDetails
            WHERE ApproverEmail = @userEmail
        `;
        
        const sqlRequest = pool.request();
        sqlRequest.input('userEmail', userId);
        
        if (status) {
            query += ` AND Status = @status`;
            sqlRequest.input('status', status);
        }
        
        if (approvalType) {
            query += ` AND ApprovalType = @approvalType`;
            sqlRequest.input('approvalType', approvalType);
        }
        
        query += ` ORDER BY RequestedDate DESC`;
        
        const result = await sqlRequest.query(query);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: result.recordset,
                total: result.recordset.length
            })
        };
        
    } catch (error: any) {
        context.log('Error fetching approvals:', error);
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

async function updateApproval(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request for PUT approval.');

    try {
        const body = await request.json() as any;
        const approvalId = body.approvalId;
        const action = body.action; // 'approve' or 'reject'
        const comments = body.comments || '';
        
        if (!approvalId || !action) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Approval ID and action are required'
                })
            };
        }
        
        if (!['approve', 'reject'].includes(action.toLowerCase())) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Action must be "approve" or "reject"'
                })
            };
        }
        
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
                    context.log('Updating approval as impersonated user:', impersonatedUser);
                } else {
                    context.log('Updating approval as user:', userId);
                }
            } catch (e) {
                context.log('Error parsing user principal:', e);
            }
        }
        
        const pool = await getDbConnection();
        
        // Verify the approval exists and belongs to this user
        const checkRequest = pool.request();
        checkRequest.input('approvalId', approvalId);
        checkRequest.input('userEmail', userId);
        
        const checkResult = await checkRequest.query(`
            SELECT ApprovalID, ApprovalType, RequestID, IncidentID, Status, ApproverEmail
            FROM Approvals
            WHERE ApprovalID = @approvalId AND ApproverEmail = @userEmail
        `);
        
        if (checkResult.recordset.length === 0) {
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Approval not found or you do not have permission to respond to it'
                })
            };
        }
        
        const approval = checkResult.recordset[0];
        
        if (approval.Status !== 'Pending') {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: `Approval has already been ${approval.Status.toLowerCase()}`
                })
            };
        }
        
        const newStatus = action.toLowerCase() === 'approve' ? 'Approved' : 'Rejected';
        
        // Update the approval
        const updateRequest = pool.request();
        updateRequest.input('approvalId', approvalId);
        updateRequest.input('status', newStatus);
        updateRequest.input('responseDate', new Date());
        updateRequest.input('comments', comments);
        updateRequest.input('respondedBy', userId);
        updateRequest.input('modifiedBy', userId);
        
        await updateRequest.query(`
            UPDATE Approvals
            SET Status = @status,
                ResponseDate = @responseDate,
                Comments = @comments,
                RespondedBy = @respondedBy,
                ModifiedBy = @modifiedBy,
                ModifiedDate = GETUTCDATE()
            WHERE ApprovalID = @approvalId
        `);
        
        // Update the related Request or Incident status
        if (approval.ApprovalType === 'Request' && approval.RequestID) {
            const requestStatusRequest = pool.request();
            requestStatusRequest.input('requestId', approval.RequestID);
            
            if (newStatus === 'Approved') {
                // Get "Approved" status ID for requests
                const approvedStatusResult = await requestStatusRequest.query(`
                    SELECT StatusID FROM Statuses WHERE StatusName = 'Approved' AND StatusType = 'Request'
                `);
                
                if (approvedStatusResult.recordset.length > 0) {
                    const approvedStatusId = approvedStatusResult.recordset[0].StatusID;
                    const updateReqRequest = pool.request();
                    updateReqRequest.input('requestId', approval.RequestID);
                    updateReqRequest.input('statusId', approvedStatusId);
                    updateReqRequest.input('approvedBy', userId);
                    updateReqRequest.input('approvedDate', new Date());
                    
                    await updateReqRequest.query(`
                        UPDATE Requests
                        SET StatusID = @statusId,
                            ApprovedBy = @approvedBy,
                            ApprovedDate = @approvedDate
                        WHERE RequestID = @requestId
                    `);
                }
            } else {
                // Get "Rejected" status ID for requests
                const rejectedStatusResult = await requestStatusRequest.query(`
                    SELECT StatusID FROM Statuses WHERE StatusName = 'Rejected' AND StatusType = 'Request'
                `);
                
                if (rejectedStatusResult.recordset.length > 0) {
                    const rejectedStatusId = rejectedStatusResult.recordset[0].StatusID;
                    const updateReqRequest = pool.request();
                    updateReqRequest.input('requestId', approval.RequestID);
                    updateReqRequest.input('statusId', rejectedStatusId);
                    
                    await updateReqRequest.query(`
                        UPDATE Requests
                        SET StatusID = @statusId
                        WHERE RequestID = @requestId
                    `);
                }
            }
        }
        
        // Get updated approval details
        const detailRequest = pool.request();
        detailRequest.input('approvalId', approvalId);
        
        const detailResult = await detailRequest.query(`
            SELECT * FROM vw_ApprovalDetails WHERE ApprovalID = @approvalId
        `);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: `Request ${newStatus.toLowerCase()} successfully`,
                data: detailResult.recordset[0]
            })
        };
        
    } catch (error: any) {
        context.log('Error updating approval:', error);
        const errorInfo = handleDbError(error);
        
        return {
            status: errorInfo.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorInfo.message,
                details: error.message
            })
        };
    }
}

app.http('approvals', {
    methods: ['GET', 'PUT', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: approvals
});
