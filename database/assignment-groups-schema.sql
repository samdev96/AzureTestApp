-- Assignment Groups Schema Update
-- Add Assignment Groups functionality to VibeNow ITSM Database

-- Create AssignmentGroups table
CREATE TABLE AssignmentGroups (
    AssignmentGroupID INT IDENTITY(1,1) PRIMARY KEY,
    GroupName NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(200) NULL,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100) NOT NULL
);

-- Create junction table for many-to-many relationship between Assignment Groups and Admin Users
CREATE TABLE AssignmentGroupMembers (
    AssignmentGroupMemberID INT IDENTITY(1,1) PRIMARY KEY,
    AssignmentGroupID INT NOT NULL,
    UserRoleID INT NOT NULL, -- References UserRoles table (only Admin users can be members)
    AssignedDate DATETIME2 DEFAULT GETUTCDATE(),
    AssignedBy NVARCHAR(100) NOT NULL,
    IsActive BIT DEFAULT 1,
    
    CONSTRAINT FK_AssignmentGroupMembers_AssignmentGroup FOREIGN KEY (AssignmentGroupID) REFERENCES AssignmentGroups(AssignmentGroupID),
    CONSTRAINT FK_AssignmentGroupMembers_UserRole FOREIGN KEY (UserRoleID) REFERENCES UserRoles(UserRoleID),
    CONSTRAINT UQ_AssignmentGroupMembers_GroupUser UNIQUE (AssignmentGroupID, UserRoleID)
);

-- Add AssignmentGroupID to Incidents table
ALTER TABLE Incidents ADD AssignmentGroupID INT NULL;
ALTER TABLE Incidents ADD CONSTRAINT FK_Incidents_AssignmentGroup FOREIGN KEY (AssignmentGroupID) REFERENCES AssignmentGroups(AssignmentGroupID);

-- Add AssignmentGroupID to Requests table  
ALTER TABLE Requests ADD AssignmentGroupID INT NULL;
ALTER TABLE Requests ADD CONSTRAINT FK_Requests_AssignmentGroup FOREIGN KEY (AssignmentGroupID) REFERENCES AssignmentGroups(AssignmentGroupID);

-- Insert the default assignment groups
INSERT INTO AssignmentGroups (GroupName, Description, CreatedBy) VALUES
('Development', 'Software development and application support team', 'system'),
('Infrastructure', 'IT infrastructure, servers, and network support team', 'system'),
('Service Desk', 'First-line support and general IT assistance team', 'system'),
('Security', 'Information security and compliance team', 'system');

-- Create indexes for better performance
CREATE INDEX IX_AssignmentGroupMembers_GroupID ON AssignmentGroupMembers(AssignmentGroupID);
CREATE INDEX IX_AssignmentGroupMembers_UserRoleID ON AssignmentGroupMembers(UserRoleID);
CREATE INDEX IX_Incidents_AssignmentGroup ON Incidents(AssignmentGroupID);
CREATE INDEX IX_Requests_AssignmentGroup ON Requests(AssignmentGroupID);

PRINT 'Assignment Groups schema update completed successfully!';

PRINT 'Assignment Groups schema update completed successfully!';