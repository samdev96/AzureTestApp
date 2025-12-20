-- Migrate existing user data from Requests and Incidents
-- Run this AFTER creating the Users table
-- This extracts unique users and creates basic user records

-- Simple migration - just insert emails without complex name parsing
-- Insert unique users from Requests (requesters)
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Department, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    r.CreatedBy,
    LEFT(r.CreatedBy, CHARINDEX('@', r.CreatedBy + '@') - 1),
    COALESCE(r.RequesterName, r.CreatedBy),
    COALESCE(r.RequesterName, r.CreatedBy),
    '',
    r.Department,
    'user',
    'System Migration',
    GETUTCDATE()
FROM Requests r
WHERE r.CreatedBy IS NOT NULL 
    AND LTRIM(RTRIM(r.CreatedBy)) <> ''
    AND r.CreatedBy NOT LIKE '%NULL%'
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = r.CreatedBy);

-- Insert unique users from Incidents (requesters)
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    i.CreatedBy,
    LEFT(i.CreatedBy, CHARINDEX('@', i.CreatedBy + '@') - 1),
    COALESCE(i.AffectedUser, i.CreatedBy),
    COALESCE(i.AffectedUser, i.CreatedBy),
    '',
    'user',
    'System Migration',
    GETUTCDATE()
FROM Incidents i
WHERE i.CreatedBy IS NOT NULL 
    AND LTRIM(RTRIM(i.CreatedBy)) <> ''
    AND i.CreatedBy NOT LIKE '%NULL%'
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = i.CreatedBy);

-- Insert agents from Requests
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    r.AssignedTo,
    LEFT(r.AssignedTo, CHARINDEX('@', r.AssignedTo + '@') - 1),
    r.AssignedTo,
    r.AssignedTo,
    '',
    'agent',
    'System Migration',
    GETUTCDATE()
FROM Requests r
WHERE r.AssignedTo IS NOT NULL 
    AND LTRIM(RTRIM(r.AssignedTo)) <> ''
    AND r.AssignedTo NOT LIKE '%NULL%'
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = r.AssignedTo);

-- Insert agents from Incidents
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    i.AssignedTo,
    LEFT(i.AssignedTo, CHARINDEX('@', i.AssignedTo + '@') - 1),
    i.AssignedTo,
    i.AssignedTo,
    '',
    'agent',
    'System Migration',
    GETUTCDATE()
FROM Incidents i
WHERE i.AssignedTo IS NOT NULL 
    AND LTRIM(RTRIM(i.AssignedTo)) <> ''
    AND i.AssignedTo NOT LIKE '%NULL%'
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = i.AssignedTo);

-- Insert approvers from Requests
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT DISTINCT
    r.ApproverName,
    LEFT(r.ApproverName, CHARINDEX('@', r.ApproverName + '@') - 1),
    r.ApproverName,
    r.ApproverName,
    '',
    'agent',
    'System Migration',
    GETUTCDATE()
FROM Requests r
WHERE r.ApproverName IS NOT NULL 
    AND LTRIM(RTRIM(r.ApproverName)) <> ''
    AND r.ApproverName NOT LIKE '%NULL%'
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = r.ApproverName);

-- Update users who are both user and agent to agent role
UPDATE Users 
SET Role = 'agent'
WHERE Email IN (
    SELECT CreatedBy FROM Requests WHERE AssignedTo IS NOT NULL
    UNION
    SELECT CreatedBy FROM Incidents WHERE AssignedTo IS NOT NULL
)
AND Role = 'user';

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
