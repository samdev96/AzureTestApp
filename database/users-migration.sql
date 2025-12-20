-- Migrate existing user data from Requests and Incidents
-- Run this AFTER creating the Users table
-- This extracts unique users and creates basic user records

-- Collect all unique users with their best role (agent > user)
WITH AllUsers AS (
    -- Requesters from Requests
    SELECT DISTINCT
        r.CreatedBy AS Email,
        COALESCE(r.RequesterName, r.CreatedBy) AS DisplayName,
        r.Department,
        'user' AS Role
    FROM Requests r
    WHERE r.CreatedBy IS NOT NULL 
        AND LTRIM(RTRIM(r.CreatedBy)) <> ''
        AND r.CreatedBy NOT LIKE '%NULL%'
    
    UNION
    
    -- Requesters from Incidents
    SELECT DISTINCT
        i.CreatedBy,
        COALESCE(i.AffectedUser, i.CreatedBy),
        NULL,
        'user'
    FROM Incidents i
    WHERE i.CreatedBy IS NOT NULL 
        AND LTRIM(RTRIM(i.CreatedBy)) <> ''
        AND i.CreatedBy NOT LIKE '%NULL%'
    
    UNION
    
    -- Agents from Requests
    SELECT DISTINCT
        r.AssignedTo,
        r.AssignedTo,
        NULL,
        'agent'
    FROM Requests r
    WHERE r.AssignedTo IS NOT NULL 
        AND LTRIM(RTRIM(r.AssignedTo)) <> ''
        AND r.AssignedTo NOT LIKE '%NULL%'
    
    UNION
    
    -- Agents from Incidents
    SELECT DISTINCT
        i.AssignedTo,
        i.AssignedTo,
        NULL,
        'agent'
    FROM Incidents i
    WHERE i.AssignedTo IS NOT NULL 
        AND LTRIM(RTRIM(i.AssignedTo)) <> ''
        AND i.AssignedTo NOT LIKE '%NULL%'
    
    UNION
    
    -- Approvers from Requests
    SELECT DISTINCT
        r.ApproverName,
        r.ApproverName,
        NULL,
        'agent'
    FROM Requests r
    WHERE r.ApproverName IS NOT NULL 
        AND LTRIM(RTRIM(r.ApproverName)) <> ''
        AND r.ApproverName NOT LIKE '%NULL%'
),
BestRole AS (
    SELECT 
        Email,
        MAX(DisplayName) AS DisplayName,
        MAX(Department) AS Department,
        CASE WHEN MAX(CASE WHEN Role = 'agent' THEN 1 ELSE 0 END) = 1 THEN 'agent' ELSE 'user' END AS Role
    FROM AllUsers
    GROUP BY Email
)
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Department, Role, CreatedBy, CreatedDate)
SELECT
    Email,
    LEFT(Email, CHARINDEX('@', Email + '@') - 1),
    DisplayName,
    DisplayName,
    '',
    Department,
    Role,
    'System Migration',
    GETUTCDATE()
FROM BestRole
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE Users.Email = BestRole.Email);

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
