-- CMDB Schema for VibeNow ITSM
-- Option 2: Tiered Hierarchy with Relationships
-- Run this script in Azure SQL Query Editor

-- =============================================
-- 1. SERVICES TABLE (Top tier - Business Services)
-- =============================================
CREATE TABLE Services (
    ServiceId INT IDENTITY(1,1) PRIMARY KEY,
    ServiceName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    BusinessOwner NVARCHAR(255) NULL,
    TechnicalOwner NVARCHAR(255) NULL,
    Criticality NVARCHAR(50) NOT NULL DEFAULT 'Medium', -- Critical, High, Medium, Low
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Inactive, Planned, Retired
    SLA NVARCHAR(255) NULL, -- e.g., "99.9% uptime", "4hr response"
    SupportGroupId INT NULL, -- FK to AssignmentGroups (added later)
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    ModifiedDate DATETIME2 NULL,
    ModifiedBy NVARCHAR(255) NULL
);

-- Indexes for Services
CREATE INDEX IX_Services_Status ON Services(Status);
CREATE INDEX IX_Services_Criticality ON Services(Criticality);
CREATE INDEX IX_Services_ServiceName ON Services(ServiceName);

PRINT 'Services table created successfully';

-- =============================================
-- 2. CONFIGURATION ITEMS TABLE (Infrastructure)
-- =============================================
CREATE TABLE ConfigurationItems (
    CiId INT IDENTITY(1,1) PRIMARY KEY,
    CiName NVARCHAR(255) NOT NULL,
    CiType NVARCHAR(100) NOT NULL, -- Server, Database, Application, Network, Storage, Container, LoadBalancer, Cloud Service
    SubType NVARCHAR(100) NULL, -- e.g., "Windows Server 2022", "PostgreSQL 15", "React App"
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Inactive, Decommissioned, Planned, Maintenance
    Environment NVARCHAR(50) NOT NULL DEFAULT 'Production', -- Production, Staging, Development, Test, DR
    Location NVARCHAR(255) NULL, -- Region/Datacenter e.g., "Azure East US", "On-Prem DC1"
    IpAddress NVARCHAR(50) NULL,
    Hostname NVARCHAR(255) NULL,
    Version NVARCHAR(100) NULL,
    Vendor NVARCHAR(255) NULL, -- e.g., "Microsoft", "Oracle", "AWS"
    SupportGroupId INT NULL, -- FK to AssignmentGroups
    Owner NVARCHAR(255) NULL, -- Email of owner
    Description NVARCHAR(MAX) NULL,
    Attributes NVARCHAR(MAX) NULL, -- JSON for type-specific data (CPU, RAM, etc.)
    SerialNumber NVARCHAR(255) NULL,
    AssetTag NVARCHAR(255) NULL,
    PurchaseDate DATE NULL,
    ExpiryDate DATE NULL, -- Warranty/License expiry
    Cost DECIMAL(18,2) NULL,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    ModifiedDate DATETIME2 NULL,
    ModifiedBy NVARCHAR(255) NULL
);

-- Indexes for ConfigurationItems
CREATE INDEX IX_CI_CiType ON ConfigurationItems(CiType);
CREATE INDEX IX_CI_Status ON ConfigurationItems(Status);
CREATE INDEX IX_CI_Environment ON ConfigurationItems(Environment);
CREATE INDEX IX_CI_CiName ON ConfigurationItems(CiName);
CREATE INDEX IX_CI_SupportGroupId ON ConfigurationItems(SupportGroupId);

PRINT 'ConfigurationItems table created successfully';

-- =============================================
-- 3. SERVICE-CI MAPPING (Links Services to CIs)
-- =============================================
CREATE TABLE ServiceCiMapping (
    MappingId INT IDENTITY(1,1) PRIMARY KEY,
    ServiceId INT NOT NULL,
    CiId INT NOT NULL,
    RelationshipType NVARCHAR(50) NOT NULL DEFAULT 'Contains', -- Contains, DependsOn, Uses
    IsCritical BIT DEFAULT 0, -- Is this CI critical to the service?
    Notes NVARCHAR(MAX) NULL,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    
    CONSTRAINT FK_ServiceCiMapping_Service FOREIGN KEY (ServiceId) REFERENCES Services(ServiceId),
    CONSTRAINT FK_ServiceCiMapping_CI FOREIGN KEY (CiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT UQ_ServiceCiMapping UNIQUE (ServiceId, CiId, RelationshipType)
);

-- Indexes for ServiceCiMapping
CREATE INDEX IX_ServiceCiMapping_ServiceId ON ServiceCiMapping(ServiceId);
CREATE INDEX IX_ServiceCiMapping_CiId ON ServiceCiMapping(CiId);

PRINT 'ServiceCiMapping table created successfully';

-- =============================================
-- 4. CI RELATIONSHIPS (CI-to-CI dependencies)
-- =============================================
CREATE TABLE CiRelationships (
    RelationshipId INT IDENTITY(1,1) PRIMARY KEY,
    SourceCiId INT NOT NULL,
    TargetCiId INT NOT NULL,
    RelationshipType NVARCHAR(50) NOT NULL, -- DependsOn, ConnectsTo, RunsOn, HostedBy, ClusteredWith, BackupOf
    Description NVARCHAR(MAX) NULL,
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    
    CONSTRAINT FK_CiRelationships_Source FOREIGN KEY (SourceCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT FK_CiRelationships_Target FOREIGN KEY (TargetCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT UQ_CiRelationships UNIQUE (SourceCiId, TargetCiId, RelationshipType),
    CONSTRAINT CHK_CiRelationships_NotSelf CHECK (SourceCiId != TargetCiId)
);

-- Indexes for CiRelationships
CREATE INDEX IX_CiRelationships_SourceCiId ON CiRelationships(SourceCiId);
CREATE INDEX IX_CiRelationships_TargetCiId ON CiRelationships(TargetCiId);
CREATE INDEX IX_CiRelationships_Type ON CiRelationships(RelationshipType);

PRINT 'CiRelationships table created successfully';

-- =============================================
-- 5. ADD FOREIGN KEYS TO ASSIGNMENT GROUPS
-- =============================================
-- These will link CMDB to existing AssignmentGroups table
ALTER TABLE Services
ADD CONSTRAINT FK_Services_SupportGroup FOREIGN KEY (SupportGroupId) 
REFERENCES AssignmentGroups(AssignmentGroupID);

ALTER TABLE ConfigurationItems
ADD CONSTRAINT FK_CI_SupportGroup FOREIGN KEY (SupportGroupId) 
REFERENCES AssignmentGroups(AssignmentGroupID);

PRINT 'Foreign keys to AssignmentGroups added successfully';

-- =============================================
-- 6. REFERENCE DATA: CI TYPES
-- =============================================
-- This is optional - for dropdown values in UI
CREATE TABLE CiTypes (
    TypeId INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(100) NOT NULL UNIQUE,
    Category NVARCHAR(100) NULL, -- Hardware, Software, Cloud, Network
    Icon NVARCHAR(50) NULL, -- Emoji or icon name for UI
    IsActive BIT DEFAULT 1
);

INSERT INTO CiTypes (TypeName, Category, Icon) VALUES
('Server', 'Hardware', '🖥️'),
('Virtual Machine', 'Hardware', '💻'),
('Container', 'Cloud', '📦'),
('Database', 'Software', '🗄️'),
('Application', 'Software', '📱'),
('Web Server', 'Software', '🌐'),
('API', 'Software', '🔌'),
('Load Balancer', 'Network', '⚖️'),
('Firewall', 'Network', '🛡️'),
('Switch', 'Network', '🔀'),
('Router', 'Network', '📡'),
('Storage', 'Hardware', '💾'),
('Backup System', 'Hardware', '📀'),
('Cloud Service', 'Cloud', '☁️'),
('SaaS Application', 'Cloud', '🌩️'),
('Kubernetes Cluster', 'Cloud', '⚙️'),
('Message Queue', 'Software', '📨'),
('Cache', 'Software', '⚡'),
('CDN', 'Network', '🌍'),
('DNS', 'Network', '📋');

PRINT 'CiTypes reference table created and populated';

-- =============================================
-- 7. REFERENCE DATA: RELATIONSHIP TYPES
-- =============================================
CREATE TABLE RelationshipTypes (
    TypeId INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL UNIQUE,
    ReverseTypeName NVARCHAR(50) NOT NULL, -- For bidirectional display
    Category NVARCHAR(50) NULL, -- Infrastructure, Application, Data
    Description NVARCHAR(255) NULL,
    IsActive BIT DEFAULT 1
);

INSERT INTO RelationshipTypes (TypeName, ReverseTypeName, Category, Description) VALUES
('DependsOn', 'IsDependencyOf', 'Application', 'Source requires Target to function'),
('RunsOn', 'Hosts', 'Infrastructure', 'Source application runs on Target server/VM'),
('ConnectsTo', 'ConnectedFrom', 'Network', 'Network connection between CIs'),
('HostedBy', 'Hosts', 'Cloud', 'Source is hosted by Target cloud service'),
('ClusteredWith', 'ClusteredWith', 'Infrastructure', 'CIs are part of same cluster'),
('BackupOf', 'HasBackup', 'Infrastructure', 'Source is backup of Target'),
('ReplicaOf', 'HasReplica', 'Infrastructure', 'Source is replica of Target'),
('ManagedBy', 'Manages', 'Application', 'Source is managed by Target system');

PRINT 'RelationshipTypes reference table created and populated';
GO

-- =============================================
-- 8. HELPFUL VIEWS
-- =============================================

-- View: Services with their CIs
CREATE VIEW vw_ServiceCIs AS
SELECT 
    s.ServiceId,
    s.ServiceName,
    s.Criticality AS ServiceCriticality,
    s.Status AS ServiceStatus,
    scm.RelationshipType,
    scm.IsCritical,
    ci.CiId,
    ci.CiName,
    ci.CiType,
    ci.Status AS CiStatus,
    ci.Environment
FROM Services s
LEFT JOIN ServiceCiMapping scm ON s.ServiceId = scm.ServiceId
LEFT JOIN ConfigurationItems ci ON scm.CiId = ci.CiId;
GO

PRINT 'vw_ServiceCIs view created';
GO

-- View: CI with all its relationships
CREATE VIEW vw_CiRelationshipsExpanded AS
SELECT 
    cr.RelationshipId,
    source.CiId AS SourceCiId,
    source.CiName AS SourceCiName,
    source.CiType AS SourceCiType,
    cr.RelationshipType,
    target.CiId AS TargetCiId,
    target.CiName AS TargetCiName,
    target.CiType AS TargetCiType,
    cr.IsActive
FROM CiRelationships cr
JOIN ConfigurationItems source ON cr.SourceCiId = source.CiId
JOIN ConfigurationItems target ON cr.TargetCiId = target.CiId;
GO

PRINT 'vw_CiRelationshipsExpanded view created';
GO

-- View: CI summary with service count
CREATE VIEW vw_CiSummary AS
SELECT 
    ci.CiId,
    ci.CiName,
    ci.CiType,
    ci.SubType,
    ci.Status,
    ci.Environment,
    ci.Location,
    ci.Owner,
    ag.GroupName AS SupportGroup,
    (SELECT COUNT(*) FROM ServiceCiMapping WHERE CiId = ci.CiId) AS ServiceCount,
    (SELECT COUNT(*) FROM CiRelationships WHERE SourceCiId = ci.CiId OR TargetCiId = ci.CiId) AS RelationshipCount
FROM ConfigurationItems ci
LEFT JOIN AssignmentGroups ag ON ci.SupportGroupId = ag.AssignmentGroupID;
GO

PRINT 'vw_CiSummary view created';
GO

PRINT '';
PRINT '=============================================';
PRINT 'CMDB Schema created successfully!';
PRINT '=============================================';
PRINT 'Tables created:';
PRINT '  - Services';
PRINT '  - ConfigurationItems';
PRINT '  - ServiceCiMapping';
PRINT '  - CiRelationships';
PRINT '  - CiTypes (reference)';
PRINT '  - RelationshipTypes (reference)';
PRINT '';
PRINT 'Views created:';
PRINT '  - vw_ServiceCIs';
PRINT '  - vw_CiRelationshipsExpanded';
PRINT '  - vw_CiSummary';
PRINT '=============================================';
