-- Users Table Schema
-- Run this script in Azure SQL Database Query Editor

-- Create Users table
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    UserPrincipalName NVARCHAR(255) NULL,
    Username NVARCHAR(100) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    DisplayName NVARCHAR(200) NOT NULL,
    PreferredName NVARCHAR(100) NULL,
    
    -- Organizational Hierarchy
    ManagerEmail NVARCHAR(255) NULL,
    ManagerID INT NULL,
    Department NVARCHAR(100) NULL,
    CostCenter NVARCHAR(50) NULL,
    Division NVARCHAR(100) NULL,
    Location NVARCHAR(100) NULL,
    Country NVARCHAR(100) NULL,
    
    -- Job Information
    JobTitle NVARCHAR(100) NULL,
    EmployeeID NVARCHAR(50) NULL,
    EmployeeType NVARCHAR(50) NULL, -- 'Employee', 'Contractor', 'Vendor'
    CompanyName NVARCHAR(100) NULL,
    
    -- Contact Information
    BusinessPhone NVARCHAR(50) NULL,
    MobilePhone NVARCHAR(50) NULL,
    OfficeLocation NVARCHAR(100) NULL,
    
    -- System Integration
    ExternalID NVARCHAR(255) NULL UNIQUE, -- Azure AD objectId, Google ID, etc.
    ExternalSource NVARCHAR(50) NULL, -- 'AzureAD', 'Google', 'Okta', 'Manual'
    LastSyncDate DATETIME2 NULL,
    
    -- Application Fields
    Role NVARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin', 'agent', 'user'
    AssignmentGroupIDs NVARCHAR(MAX) NULL, -- JSON array
    TimeZone NVARCHAR(50) NULL DEFAULT 'UTC',
    Locale NVARCHAR(10) NULL DEFAULT 'en-US',
    
    -- Status
    IsActive BIT DEFAULT 1,
    AccountEnabled BIT DEFAULT 1,
    
    -- Audit
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100) NULL,
    ModifiedBy NVARCHAR(100) NULL,
    ModifiedDate DATETIME2 NULL,
    
    CONSTRAINT FK_Users_Manager FOREIGN KEY (ManagerID) REFERENCES Users(UserID)
);

-- Create indexes for performance
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_ManagerEmail ON Users(ManagerEmail);
CREATE INDEX IX_Users_ExternalID ON Users(ExternalID);
CREATE INDEX IX_Users_Department ON Users(Department);
CREATE INDEX IX_Users_IsActive ON Users(IsActive);
CREATE INDEX IX_Users_Role ON Users(Role);

GO

-- Create view for manager lookup (useful for workflows)
CREATE VIEW vw_UserWithManager AS
SELECT 
    u.UserID,
    u.Email,
    u.DisplayName,
    u.FirstName,
    u.LastName,
    u.Department,
    u.JobTitle,
    u.Role,
    u.IsActive,
    u.ManagerEmail,
    m.Email AS ManagerEmailResolved,
    m.DisplayName AS ManagerDisplayName,
    m.UserID AS ManagerUserID
FROM Users u
LEFT JOIN Users m ON u.ManagerID = m.UserID;

GO

PRINT 'Users table and indexes created successfully';
