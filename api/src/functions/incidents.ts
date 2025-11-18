import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDbConnection, handleDbError } from "../utils/database";

export async function incidents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP trigger function processed a ${request.method} request for incidents.`);

    if (request.method === 'GET') {
        return await getIncidents(request, context);
    } else if (request.method === 'POST') {
        return await createIncident(request, context);
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
        
        // Get query parameters for filtering
        const status = request.query.get('status');
        const priority = request.query.get('priority');
        const assignedTo = request.query.get('assignedTo');
        
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
                CreatedBy,
                CreatedDate,
                ModifiedDate,
                ResolvedDate
            FROM vw_IncidentsWithDetails
            WHERE 1=1
        `;
        
        const params: any = {};
        
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
        
        // Validate required fields
        const requiredFields = ['title', 'description', 'category', 'priority', 'affectedUser', 'contactInfo'];
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
        
        // Get category and priority IDs
        const lookupRequest = pool.request();
        lookupRequest.input('categoryName', body.category);
        lookupRequest.input('priorityName', body.priority);
        
        const lookupResult = await lookupRequest.query(`
            SELECT 
                (SELECT CategoryID FROM Categories WHERE CategoryName = @categoryName AND CategoryType = 'Incident') as CategoryID,
                (SELECT PriorityID FROM Priorities WHERE PriorityName = @priorityName) as PriorityID,
                (SELECT StatusID FROM Statuses WHERE StatusName = 'Open' AND StatusType = 'Incident') as StatusID
        `);
        
        if (!lookupResult.recordset[0].CategoryID || !lookupResult.recordset[0].PriorityID) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid category or priority'
                })
            };
        }
        
        const { CategoryID, PriorityID, StatusID } = lookupResult.recordset[0];
        
        // Insert the incident
        const insertRequest = pool.request();
        insertRequest.input('title', body.title);
        insertRequest.input('description', body.description);
        insertRequest.input('categoryId', CategoryID);
        insertRequest.input('priorityId', PriorityID);
        insertRequest.input('statusId', StatusID);
        insertRequest.input('affectedUser', body.affectedUser);
        insertRequest.input('contactInfo', body.contactInfo);
        insertRequest.input('createdBy', body.createdBy || 'System');
        
        const insertResult = await insertRequest.query(`
            INSERT INTO Incidents (Title, Description, CategoryID, PriorityID, StatusID, AffectedUser, ContactInfo, CreatedBy)
            OUTPUT INSERTED.IncidentID, INSERTED.IncidentNumber
            VALUES (@title, @description, @categoryId, @priorityId, @statusId, @affectedUser, @contactInfo, @createdBy)
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

// Register the function
app.http('incidents', {
    methods: ['GET', 'POST', 'OPTIONS'],
    route: 'incidents',
    authLevel: 'anonymous',
    handler: incidents
});