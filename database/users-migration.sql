-- Migrate existing user data from Requests and Incidents
-- Run this AFTER creating the Users table
-- This extracts unique users and creates basic user records

-- Create a temp table with all unique users first to avoid duplicates
IF OBJECT_ID('tempdb..#TempUsers') IS NOT NULL DROP TABLE #TempUsers;

CREATE TABLE #TempUsers (
    Email NVARCHAR(255),
    Username NVARCHAR(100),
    DisplayName NVARCHAR(200),
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    Department NVARCHAR(100),
    Role NVARCHAR(20)
);

-- Insert unique users from Requests table (requesters)
INSERT INTO #TempUsers (Email, Username, DisplayName, FirstName, LastName, Department, Role)
SELECT DISTINCT
    r.CreatedBy AS Email,
    CASE 
        WHEN CHARINDEX('@', r.CreatedBy) > 0 
        THEN LEFT(r.CreatedBy, CHARINDEX('@', r.CreatedBy) - 1)
        ELSE r.CreatedBy
    END AS Username,
    MAX(r.RequesterName) AS DisplayName,
    CASE 
        WHEN CHARINDEX(' ', MAX(r.RequesterName)) > 0 
        THEN LEFT(MAX(r.RequesterName), CHARINDEX(' ', MAX(r.RequesterName)) - 1)
        ELSE MAX(r.RequesterName)
    END AS FirstName,
    CASE 
        WHEN CHARINDEX(' ', MAX(r.RequesterName)) > 0 
        THEN SUBSTRING(MAX(r.RequesterName), CHARINDEX(' ', MAX(r.RequesterName)) + 1, LEN(MAX(r.RequesterName)))
        ELSE ''
    END AS LastName,
    MAX(r.Department) AS Department,
    'user' AS Role
FROM Requests r
WHERE r.CreatedBy IS NOT NULL 
    AND r.CreatedBy <> ''
GROUP BY r.CreatedBy;

-- Insert unique users from Incidents table (requesters)
INSERT INTO #TempUsers (Email, Username, DisplayName, FirstName, LastName, Department, Role)
SELECT DISTINCT
    i.CreatedBy AS Email,
    CASE 
        WHEN CHARINDEX('@', i.CreatedBy) > 0 
        THEN LEFT(i.CreatedBy, CHARINDEX('@', i.CreatedBy) - 1)
        ELSE i.CreatedBy
    END AS Username,
    MAX(i.AffectedUser) AS DisplayName,
    CASE 
        WHEN CHARINDEX(' ', MAX(i.AffectedUser)) > 0 
        THEN LEFT(MAX(i.AffectedUser), CHARINDEX(' ', MAX(i.AffectedUser)) - 1)
        ELSE MAX(i.AffectedUser)
    END AS FirstName,
    CASE 
        WHEN CHARINDEX(' ', MAX(i.AffectedUser)) > 0 
        THEN SUBSTRING(MAX(i.AffectedUser), CHARINDEX(' ', MAX(i.AffectedUser)) + 1, LEN(MAX(i.AffectedUser)))
        ELSE ''
    END AS LastName,
    NULL AS Department,
    'user' AS Role
FROM Incidents i
WHERE i.CreatedBy IS NOT NULL 
    AND i.CreatedBy <> ''
    AND NOT EXISTS (SELECT 1 FROM #TempUsers WHERE Email = i.CreatedBy)
GROUP BY i.CreatedBy;

-- Insert unique assigned agents from Requests
INSERT INTO #TempUsers (Email, Username, DisplayName, FirstName, LastName, Department, Role)
SELECT DISTINCT
    r.AssignedTo AS Email,
    CASE 
        WHEN CHARINDEX('@', r.AssignedTo) > 0 
        THEN LEFT(r.AssignedTo, CHARINDEX('@', r.AssignedTo) - 1)
        ELSE r.AssignedTo
    END AS Username,
    r.AssignedTo AS DisplayName,
    CASE 
        WHEN CHARINDEX(' ', r.AssignedTo) > 0 
        THEN LEFT(r.AssignedTo, CHARINDEX(' ', r.AssignedTo) - 1)
        ELSE r.AssignedTo
    END AS FirstName,
    CASE 
        WHEN CHARINDEX(' ', r.AssignedTo) > 0 
        THEN SUBSTRING(r.AssignedTo, CHARINDEX(' ', r.AssignedTo) + 1, LEN(r.AssignedTo))
        ELSE ''
    END AS LastName,
    NULL AS Department,
    'agent' AS Role
FROM Requests r
WHERE r.AssignedTo IS NOT NULL 
    AND r.AssignedTo <> ''
    AND NOT EXISTS (SELECT 1 FROM #TempUsers WHERE Email = r.AssignedTo)
GROUP BY r.AssignedTo;

-- Insert unique assigned agents from Incidents
INSERT INTO #TempUsers (Email, Username, DisplayName, FirstName, LastName, Department, Role)
SELECT DISTINCT
    i.AssignedTo AS Email,
    CASE 
        WHEN CHARINDEX('@', i.AssignedTo) > 0 
        THEN LEFT(i.AssignedTo, CHARINDEX('@', i.AssignedTo) - 1)
        ELSE i.AssignedTo
    END AS Username,
    i.AssignedTo AS DisplayName,
    CASE 
        WHEN CHARINDEX(' ', i.AssignedTo) > 0 
        THEN LEFT(i.AssignedTo, CHARINDEX(' ', i.AssignedTo) - 1)
        ELSE i.AssignedTo
    END AS FirstName,
    CASE 
        WHEN CHARINDEX(' ', i.AssignedTo) > 0 
        THEN SUBSTRING(i.AssignedTo, CHARINDEX(' ', i.AssignedTo) + 1, LEN(i.AssignedTo))
        ELSE ''
    END AS LastName,
    NULL AS Department,
    'agent' AS Role
FROM Incidents i
WHERE i.AssignedTo IS NOT NULL 
    AND i.AssignedTo <> ''
    AND NOT EXISTS (SELECT 1 FROM #TempUsers WHERE Email = i.AssignedTo)
GROUP BY i.AssignedTo;

-- Insert unique approvers from Requests
INSERT INTO #TempUsers (Email, Username, DisplayName, FirstName, LastName, Department, Role)
SELECT DISTINCT
    r.ApproverName AS Email,
    CASE 
        WHEN CHARINDEX('@', r.ApproverName) > 0 
        THEN LEFT(r.ApproverName, CHARINDEX('@', r.ApproverName) - 1)
        ELSE r.ApproverName
    END AS Username,
    r.ApproverName AS DisplayName,
    CASE 
        WHEN CHARINDEX(' ', r.ApproverName) > 0 
        THEN LEFT(r.ApproverName, CHARINDEX(' ', r.ApproverName) - 1)
        ELSE r.ApproverName
    END AS FirstName,
    CASE 
        WHEN CHARINDEX(' ', r.ApproverName) > 0 
        THEN SUBSTRING(r.ApproverName, CHARINDEX(' ', r.ApproverName) + 1, LEN(r.ApproverName))
        ELSE ''
    END AS LastName,
    NULL AS Department,
    'agent' AS Role
FROM Requests r
WHERE r.ApproverName IS NOT NULL 
    AND r.ApproverName <> ''
    AND NOT EXISTS (SELECT 1 FROM #TempUsers WHERE Email = r.ApproverName)
GROUP BY r.ApproverName;

-- Update roles: if someone is both user and agent, make them agent
UPDATE #TempUsers
SET Role = 'agent'
WHERE Email IN (
    SELECT Email 
    FROM #TempUsers 
    GROUP BY Email 
    HAVING COUNT(DISTINCT Role) > 1
);

-- Remove duplicates, keeping the agent role
DELETE FROM #TempUsers
WHERE Role = 'user'
  AND Email IN (
      SELECT Email 
      FROM #TempUsers 
      WHERE Role = 'agent'
  );

-- Now insert all unique users into the actual Users table
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Department, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    Email,
    Username,
    DisplayName,
    FirstName,
    LastName,
    Department,
    Role,
    'System Migration' AS CreatedBy,
    GETUTCDATE() AS CreatedDate
FROM #TempUsers
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE Users.Email = #TempUsers.Email);

-- Clean up temp table
DROP TABLE #TempUsers;

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
