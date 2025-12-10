-- UserRoles table for managing user permissions
-- This should be run after the main schema.sql

-- Role Hierarchy:
-- 'user'  - Basic access (user portal, create/view own tickets)
-- 'agent' - Ticket management, CMDB, Changes, Integrations (agent dashboard)
-- 'admin' - All agent access + User Management + Assignment Group Management

-- Create UserRoles table
CREATE TABLE UserRoles (
    UserRoleID INT IDENTITY(1,1) PRIMARY KEY,
    UserEmail NVARCHAR(255) NOT NULL,
    UserObjectID NVARCHAR(255) NULL, -- Azure AD Object ID
    DisplayName NVARCHAR(255) NULL, -- User's display name
    RoleName NVARCHAR(50) NOT NULL, -- 'admin', 'agent', or 'user'
    IsActive BIT DEFAULT 1,
    AssignedDate DATETIME2 DEFAULT GETUTCDATE(),
    AssignedBy NVARCHAR(255) NOT NULL,
    ModifiedDate DATETIME2 NULL,
    ModifiedBy NVARCHAR(255) NULL
);

-- Create indexes for better performance
CREATE INDEX IX_UserRoles_UserEmail ON UserRoles(UserEmail);
CREATE INDEX IX_UserRoles_UserObjectID ON UserRoles(UserObjectID);
CREATE INDEX IX_UserRoles_RoleName ON UserRoles(RoleName);
CREATE INDEX IX_UserRoles_IsActive ON UserRoles(IsActive);

-- Create unique constraint to prevent duplicate active roles per user
CREATE UNIQUE INDEX UQ_UserRoles_ActiveUser ON UserRoles(UserEmail, RoleName) 
WHERE IsActive = 1;

-- Insert sample users for testing (replace with your actual emails)
INSERT INTO UserRoles (UserEmail, RoleName, AssignedBy) 
VALUES 
    ('admin@yourdomain.com', 'admin', 'system'),
    ('agent@yourdomain.com', 'agent', 'system'),
    ('user@yourdomain.com', 'user', 'system');

PRINT 'UserRoles table created successfully with sample data!';