-- VibeNow ITSM Database Schema
-- Run this script in Azure SQL Database Query Editor

-- Create Categories table for lookup values
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(50) NOT NULL UNIQUE,
    CategoryType NVARCHAR(20) NOT NULL, -- 'Incident' or 'Request'
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE()
);

-- Create Statuses table for lookup values
CREATE TABLE Statuses (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE,
    StatusType NVARCHAR(20) NOT NULL, -- 'Incident' or 'Request'
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE()
);

-- Create Priorities table for lookup values
CREATE TABLE Priorities (
    PriorityID INT IDENTITY(1,1) PRIMARY KEY,
    PriorityName NVARCHAR(20) NOT NULL UNIQUE,
    PriorityLevel INT NOT NULL, -- 1=Low, 2=Medium, 3=High, 4=Critical
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE()
);

-- Create Incidents table
CREATE TABLE Incidents (
    IncidentID INT IDENTITY(1,1) PRIMARY KEY,
    IncidentNumber AS 'INC-' + RIGHT('000000' + CAST(IncidentID AS NVARCHAR(6)), 6) PERSISTED,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    CategoryID INT NOT NULL,
    PriorityID INT NOT NULL,
    StatusID INT NOT NULL,
    AffectedUser NVARCHAR(100) NOT NULL,
    ContactInfo NVARCHAR(200) NOT NULL,
    AssignedTo NVARCHAR(100) NULL,
    CreatedBy NVARCHAR(100) NOT NULL,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(100) NULL,
    ModifiedDate DATETIME2 NULL,
    ResolvedDate DATETIME2 NULL,
    ResolutionNotes NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Incidents_Category FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID),
    CONSTRAINT FK_Incidents_Priority FOREIGN KEY (PriorityID) REFERENCES Priorities(PriorityID),
    CONSTRAINT FK_Incidents_Status FOREIGN KEY (StatusID) REFERENCES Statuses(StatusID)
);

-- Create Requests table
CREATE TABLE Requests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    RequestNumber AS 'REQ-' + RIGHT('000000' + CAST(RequestID AS NVARCHAR(6)), 6) PERSISTED,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    RequestType NVARCHAR(50) NOT NULL, -- 'Hardware', 'Software', 'Access', 'Service', 'Other'
    Urgency NVARCHAR(20) NOT NULL, -- 'Low', 'Medium', 'High'
    BusinessJustification NVARCHAR(MAX) NOT NULL,
    RequesterName NVARCHAR(100) NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    ContactInfo NVARCHAR(200) NOT NULL,
    ApproverName NVARCHAR(100) NOT NULL,
    StatusID INT NOT NULL,
    AssignedTo NVARCHAR(100) NULL,
    CreatedBy NVARCHAR(100) NOT NULL,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(100) NULL,
    ModifiedDate DATETIME2 NULL,
    ApprovedDate DATETIME2 NULL,
    ApprovedBy NVARCHAR(100) NULL,
    CompletedDate DATETIME2 NULL,
    CompletionNotes NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Requests_Status FOREIGN KEY (StatusID) REFERENCES Statuses(StatusID)
);

-- Insert initial lookup data
INSERT INTO Categories (CategoryName, CategoryType) VALUES
('Hardware', 'Incident'),
('Software', 'Incident'),
('Network', 'Incident'),
('Security', 'Incident'),
('Other', 'Incident');

INSERT INTO Statuses (StatusName, StatusType) VALUES
('Open', 'Incident'),
('In Progress', 'Incident'),
('Resolved', 'Incident'),
('Closed', 'Incident'),
('Pending Approval', 'Request'),
('Approved', 'Request'),
('In Progress', 'Request'),
('Completed', 'Request'),
('Rejected', 'Request');

INSERT INTO Priorities (PriorityName, PriorityLevel) VALUES
('Low', 1),
('Medium', 2),
('High', 3),
('Critical', 4);

-- Create indexes for better performance
CREATE INDEX IX_Incidents_Status ON Incidents(StatusID);
CREATE INDEX IX_Incidents_Priority ON Incidents(PriorityID);
CREATE INDEX IX_Incidents_CreatedDate ON Incidents(CreatedDate);
CREATE INDEX IX_Incidents_AssignedTo ON Incidents(AssignedTo);

CREATE INDEX IX_Requests_Status ON Requests(StatusID);
CREATE INDEX IX_Requests_CreatedDate ON Requests(CreatedDate);
CREATE INDEX IX_Requests_AssignedTo ON Requests(AssignedTo);

-- Create views for easier querying
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
    i.CreatedBy,
    i.CreatedDate,
    i.ModifiedDate,
    i.ResolvedDate
FROM Incidents i
JOIN Categories c ON i.CategoryID = c.CategoryID
JOIN Priorities p ON i.PriorityID = p.PriorityID
JOIN Statuses s ON i.StatusID = s.StatusID;

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
    r.CreatedBy,
    r.CreatedDate,
    r.ModifiedDate,
    r.ApprovedDate,
    r.ApprovedBy,
    r.CompletedDate
FROM Requests r
JOIN Statuses s ON r.StatusID = s.StatusID;

PRINT 'VibeNow ITSM Database schema created successfully!';