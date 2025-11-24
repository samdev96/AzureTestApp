import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ConnectionPool } from "mssql";
import { getDbConnection } from "../utils/database";

interface AssignmentGroup {
    AssignmentGroupID: number;
    GroupName: string;
    Description: string;
    IsActive: boolean;
    CreatedDate: string;
    CreatedBy: string;
}

interface AssignmentGroupMember {
    AssignmentGroupMemberID: number;
    AssignmentGroup: string;
    AssignmentGroupID: number;
    UserEmail: string;
    UserObjectID: string;
    RoleName: string;
    AssignedDate: string;
    AssignedBy: string;
    IsActive: boolean;
}

interface AssignGroupMemberRequest {
    assignmentGroupId: number;
    userEmail: string;
}

export async function assignmentGroups(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const method = request.method;

    try {
        const pool = await getDbConnection();

        switch (method) {
            case 'GET':
                return await getAssignmentGroups(pool, request);
            case 'POST':
                return await assignUserToGroup(pool, request, context);
            case 'DELETE':
                return await removeUserFromGroup(pool, request, context);
            default:
                return {
                    status: 405,
                    jsonBody: { error: 'Method not allowed' }
                };
        }
    } catch (error) {
        context.error('Database connection error:', error);
        return {
            status: 500,
            jsonBody: { error: 'Database connection failed' }
        };
    }
}

async function getAssignmentGroups(pool: ConnectionPool, request: HttpRequest): Promise<HttpResponseInit> {
    const url = new URL(request.url);
    const includeMembers = url.searchParams.get('includeMembers') === 'true';

    try {
        if (includeMembers) {
            // Get assignment groups with their members
            const query = `
                SELECT 
                    ag.AssignmentGroupID,
                    ag.GroupName,
                    ag.Description,
                    ag.IsActive,
                    ag.CreatedDate,
                    ag.CreatedBy,
                    agm.AssignmentGroupMemberID,
                    agm.UserEmail,
                    agm.UserObjectID,
                    agm.AssignedDate,
                    agm.AssignedBy,
                    agm.IsActive as MemberIsActive
                FROM AssignmentGroups ag
                LEFT JOIN vw_AssignmentGroupMembers agm ON ag.AssignmentGroupID = agm.AssignmentGroupID
                WHERE ag.IsActive = 1
                ORDER BY ag.GroupName, agm.UserEmail
            `;
            
            const result = await pool.request().query(query);
            
            // Group the results by assignment group
            const groupsMap = new Map<number, any>();
            
            result.recordset.forEach(row => {
                if (!groupsMap.has(row.AssignmentGroupID)) {
                    groupsMap.set(row.AssignmentGroupID, {
                        AssignmentGroupID: row.AssignmentGroupID,
                        GroupName: row.GroupName,
                        Description: row.Description,
                        IsActive: row.IsActive,
                        CreatedDate: row.CreatedDate,
                        CreatedBy: row.CreatedBy,
                        Members: []
                    });
                }
                
                if (row.AssignmentGroupMemberID) {
                    groupsMap.get(row.AssignmentGroupID)!.Members.push({
                        AssignmentGroupMemberID: row.AssignmentGroupMemberID,
                        UserEmail: row.UserEmail,
                        UserObjectID: row.UserObjectID,
                        AssignedDate: row.AssignedDate,
                        AssignedBy: row.AssignedBy,
                        IsActive: row.MemberIsActive
                    });
                }
            });
            
            return {
                status: 200,
                jsonBody: Array.from(groupsMap.values())
            };
        } else {
            // Get just the assignment groups
            const query = `
                SELECT AssignmentGroupID, GroupName, Description, IsActive, CreatedDate, CreatedBy
                FROM AssignmentGroups
                WHERE IsActive = 1
                ORDER BY GroupName
            `;
            
            const result = await pool.request().query(query);
            
            return {
                status: 200,
                jsonBody: result.recordset as AssignmentGroup[]
            };
        }
    } catch (error) {
        console.error('Error getting assignment groups:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to get assignment groups' }
        };
    }
}

async function assignUserToGroup(pool: ConnectionPool, request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Get user info from headers
        const userPrincipalName = request.headers.get('x-ms-client-principal-name');
        const userObjectId = request.headers.get('x-ms-client-principal-id');

        if (!userPrincipalName || !userObjectId) {
            return {
                status: 401,
                jsonBody: { error: 'User authentication required' }
            };
        }

        // Check if the requesting user is an admin
        const adminCheck = await pool.request()
            .input('userEmail', userPrincipalName)
            .query(`
                SELECT RoleName 
                FROM UserRoles 
                WHERE UserEmail = @userEmail AND IsActive = 1
            `);

        if (adminCheck.recordset.length === 0 || adminCheck.recordset[0].RoleName !== 'Admin') {
            return {
                status: 403,
                jsonBody: { error: 'Admin access required' }
            };
        }

        const requestBody = await request.json() as any;
        const { assignmentGroupId, userEmail } = requestBody;

        if (!assignmentGroupId || !userEmail) {
            return {
                status: 400,
                jsonBody: { error: 'Assignment Group ID and User Email are required' }
            };
        }

        // Check if the target user is an admin
        const userRoleCheck = await pool.request()
            .input('targetUserEmail', userEmail)
            .query(`
                SELECT UserRoleID, RoleName 
                FROM UserRoles 
                WHERE UserEmail = @targetUserEmail AND RoleName = 'Admin' AND IsActive = 1
            `);

        if (userRoleCheck.recordset.length === 0) {
            return {
                status: 400,
                jsonBody: { error: 'User must be an Admin to be assigned to an Assignment Group' }
            };
        }

        const userRoleId = userRoleCheck.recordset[0].UserRoleID;

        // Check if user is already assigned to this group
        const existingAssignment = await pool.request()
            .input('assignmentGroupId', assignmentGroupId)
            .input('userRoleId', userRoleId)
            .query(`
                SELECT AssignmentGroupMemberID 
                FROM AssignmentGroupMembers 
                WHERE AssignmentGroupID = @assignmentGroupId AND UserRoleID = @userRoleId AND IsActive = 1
            `);

        if (existingAssignment.recordset.length > 0) {
            return {
                status: 409,
                jsonBody: { error: 'User is already assigned to this Assignment Group' }
            };
        }

        // Assign user to the group
        await pool.request()
            .input('assignmentGroupId', assignmentGroupId)
            .input('userRoleId', userRoleId)
            .input('assignedBy', userPrincipalName)
            .query(`
                INSERT INTO AssignmentGroupMembers (AssignmentGroupID, UserRoleID, AssignedBy)
                VALUES (@assignmentGroupId, @userRoleId, @assignedBy)
            `);

        return {
            status: 201,
            jsonBody: { message: 'User successfully assigned to Assignment Group' }
        };

    } catch (error) {
        context.error('Error assigning user to group:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to assign user to Assignment Group' }
        };
    }
}

async function removeUserFromGroup(pool: ConnectionPool, request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Get user info from headers
        const userPrincipalName = request.headers.get('x-ms-client-principal-name');
        const userObjectId = request.headers.get('x-ms-client-principal-id');

        if (!userPrincipalName || !userObjectId) {
            return {
                status: 401,
                jsonBody: { error: 'User authentication required' }
            };
        }

        // Check if the requesting user is an admin
        const adminCheck = await pool.request()
            .input('userEmail', userPrincipalName)
            .query(`
                SELECT RoleName 
                FROM UserRoles 
                WHERE UserEmail = @userEmail AND IsActive = 1
            `);

        if (adminCheck.recordset.length === 0 || adminCheck.recordset[0].RoleName !== 'Admin') {
            return {
                status: 403,
                jsonBody: { error: 'Admin access required' }
            };
        }

        const url = new URL(request.url);
        const assignmentGroupId = url.searchParams.get('assignmentGroupId');
        const userEmail = url.searchParams.get('userEmail');

        if (!assignmentGroupId || !userEmail) {
            return {
                status: 400,
                jsonBody: { error: 'Assignment Group ID and User Email are required' }
            };
        }

        // Get the user's role ID
        const userRoleCheck = await pool.request()
            .input('targetUserEmail', userEmail)
            .query(`
                SELECT UserRoleID 
                FROM UserRoles 
                WHERE UserEmail = @targetUserEmail AND IsActive = 1
            `);

        if (userRoleCheck.recordset.length === 0) {
            return {
                status: 404,
                jsonBody: { error: 'User not found' }
            };
        }

        const userRoleId = userRoleCheck.recordset[0].UserRoleID;

        // Remove user from the group (soft delete)
        const result = await pool.request()
            .input('assignmentGroupId', parseInt(assignmentGroupId))
            .input('userRoleId', userRoleId)
            .query(`
                UPDATE AssignmentGroupMembers 
                SET IsActive = 0 
                WHERE AssignmentGroupID = @assignmentGroupId AND UserRoleID = @userRoleId AND IsActive = 1
            `);

        if (result.rowsAffected[0] === 0) {
            return {
                status: 404,
                jsonBody: { error: 'Assignment Group membership not found' }
            };
        }

        return {
            status: 200,
            jsonBody: { message: 'User successfully removed from Assignment Group' }
        };

    } catch (error) {
        context.error('Error removing user from group:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to remove user from Assignment Group' }
        };
    }
}

app.http("assignment-groups", {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: assignmentGroups,
});