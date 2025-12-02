-- Update views to include Assignment Group information

-- Drop existing view
IF OBJECT_ID('vw_IncidentsWithDetails', 'V') IS NOT NULL
    DROP VIEW vw_IncidentsWithDetails;
GO

-- Create updated Incidents view
CREATE VIEW vw_IncidentsWithDetails AS
SELECT 
    i.IncidentID,
    i.IncidentNumber,
    i.Title,
    i.Description,
    c.CategoryName as Category,
    p.PriorityName as Priority,
    s.StatusName as Status,
    i.AffectedUser,
    i.ContactInfo,
    i.AssignedTo,
    ag.GroupName as AssignmentGroup,
    i.CreatedBy,
    i.CreatedDate,
    i.ModifiedDate,
    i.ResolvedDate,
    i.ResolutionNotes
FROM Incidents i
JOIN Categories c ON i.CategoryID = c.CategoryID
JOIN Priorities p ON i.PriorityID = p.PriorityID
JOIN Statuses s ON i.StatusID = s.StatusID
LEFT JOIN AssignmentGroups ag ON i.AssignmentGroupID = ag.AssignmentGroupID;
GO

-- Drop existing view
IF OBJECT_ID('vw_RequestsWithDetails', 'V') IS NOT NULL
    DROP VIEW vw_RequestsWithDetails;
GO

-- Create updated Requests view
CREATE VIEW vw_RequestsWithDetails AS
SELECT 
    r.RequestID,
    r.RequestNumber,
    r.Title,
    r.Description,
    r.RequestType,
    r.Urgency,
    r.BusinessJustification,
    r.RequesterName,
    r.Department,
    r.ContactInfo,
    r.ApproverName,
    s.StatusName as Status,
    r.AssignedTo,
    ag.GroupName as AssignmentGroup,
    r.CreatedBy,
    r.CreatedDate,
    r.ModifiedDate,
    r.ApprovedDate,
    r.ApprovedBy,
    r.CompletedDate,
    r.CompletionNotes
FROM Requests r
JOIN Statuses s ON r.StatusID = s.StatusID
LEFT JOIN AssignmentGroups ag ON r.AssignmentGroupID = ag.AssignmentGroupID;
GO

-- Create view for Assignment Group Members with user details
CREATE VIEW vw_AssignmentGroupMembers AS
SELECT 
    agm.AssignmentGroupMemberID,
    ag.GroupName as AssignmentGroup,
    ag.AssignmentGroupID,
    ur.UserEmail,
    ur.UserObjectID,
    ur.RoleName,
    agm.AssignedDate,
    agm.AssignedBy,
    agm.IsActive
FROM AssignmentGroupMembers agm
JOIN AssignmentGroups ag ON agm.AssignmentGroupID = ag.AssignmentGroupID
JOIN UserRoles ur ON agm.UserRoleID = ur.UserRoleID
WHERE agm.IsActive = 1 AND ur.IsActive = 1 AND ur.RoleName = 'Admin';
GO