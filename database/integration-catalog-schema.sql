-- Integration Catalog Schema for VibeNow ITSM
-- Tracks all integrations between systems (internal and external)
-- Run this script in Azure SQL Query Editor

-- =============================================
-- 1. EXTERNAL SYSTEMS TABLE
-- Systems outside our CMDB (third-party vendors, SaaS, etc.)
-- =============================================
CREATE TABLE ExternalSystems (
    ExternalSystemId INT IDENTITY(1,1) PRIMARY KEY,
    SystemName NVARCHAR(255) NOT NULL,
    Vendor NVARCHAR(255) NULL,
    Category NVARCHAR(100) NOT NULL, -- Payment, CRM, HR, Analytics, Communication, Security, etc.
    Description NVARCHAR(MAX) NULL,
    BaseUrl NVARCHAR(500) NULL,
    DocumentationUrl NVARCHAR(500) NULL,
    ContactEmail NVARCHAR(255) NULL,
    ContractExpiry DATE NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Deprecated, Evaluating, Retired
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    ModifiedDate DATETIME2 NULL,
    ModifiedBy NVARCHAR(255) NULL
);

CREATE INDEX IX_ExternalSystems_Category ON ExternalSystems(Category);
CREATE INDEX IX_ExternalSystems_Status ON ExternalSystems(Status);
CREATE INDEX IX_ExternalSystems_SystemName ON ExternalSystems(SystemName);

PRINT 'ExternalSystems table created successfully';

-- =============================================
-- 2. INTEGRATIONS TABLE
-- The main integration catalog
-- =============================================
CREATE TABLE Integrations (
    IntegrationId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    
    -- Integration Type
    IntegrationType NVARCHAR(50) NOT NULL, -- API, Webhook, FileTransfer, MessageQueue, ETL, DatabaseLink
    Direction NVARCHAR(20) NOT NULL DEFAULT 'Outbound', -- Inbound, Outbound, Bidirectional
    
    -- Source System (one of these should be set)
    SourceType NVARCHAR(20) NOT NULL, -- Service, CI, External
    SourceServiceId INT NULL,
    SourceCiId INT NULL,
    SourceExternalId INT NULL,
    
    -- Target System (one of these should be set)
    TargetType NVARCHAR(20) NOT NULL, -- Service, CI, External
    TargetServiceId INT NULL,
    TargetCiId INT NULL,
    TargetExternalId INT NULL,
    
    -- Technical Details
    Protocol NVARCHAR(50) NULL, -- REST, SOAP, GraphQL, SFTP, AMQP, JDBC, gRPC, etc.
    AuthMethod NVARCHAR(50) NULL, -- OAuth2, APIKey, Certificate, BasicAuth, None, SAML
    Endpoint NVARCHAR(500) NULL, -- URL, queue name, file path, connection string
    Port INT NULL,
    
    -- Data Flow
    DataFormat NVARCHAR(50) NULL, -- JSON, XML, CSV, Parquet, Binary, Avro
    DataClassification NVARCHAR(50) NOT NULL DEFAULT 'Internal', -- Public, Internal, Confidential, PII, Restricted
    FrequencyType NVARCHAR(50) NOT NULL DEFAULT 'OnDemand', -- RealTime, Scheduled, OnDemand, Batch, Event
    FrequencyDetails NVARCHAR(100) NULL, -- "Every 15 min", "Daily 2am UTC", "On user action"
    
    -- Status & Health
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Inactive, Deprecated, Planned, Testing
    HealthStatus NVARCHAR(50) NOT NULL DEFAULT 'Unknown', -- Healthy, Degraded, Down, Unknown
    LastHealthCheck DATETIME2 NULL,
    SLA NVARCHAR(100) NULL, -- "99.9% uptime", "Best effort", "4hr response"
    
    -- Ownership
    Owner NVARCHAR(255) NULL,
    SupportGroupId INT NULL,
    
    -- Audit
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NOT NULL,
    ModifiedDate DATETIME2 NULL,
    ModifiedBy NVARCHAR(255) NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_Integration_SourceService FOREIGN KEY (SourceServiceId) REFERENCES Services(ServiceId),
    CONSTRAINT FK_Integration_SourceCI FOREIGN KEY (SourceCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT FK_Integration_SourceExternal FOREIGN KEY (SourceExternalId) REFERENCES ExternalSystems(ExternalSystemId),
    CONSTRAINT FK_Integration_TargetService FOREIGN KEY (TargetServiceId) REFERENCES Services(ServiceId),
    CONSTRAINT FK_Integration_TargetCI FOREIGN KEY (TargetCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT FK_Integration_TargetExternal FOREIGN KEY (TargetExternalId) REFERENCES ExternalSystems(ExternalSystemId),
    CONSTRAINT FK_Integration_SupportGroup FOREIGN KEY (SupportGroupId) REFERENCES AssignmentGroups(AssignmentGroupID),
    
    -- Constraints to ensure valid source/target combinations
    CONSTRAINT CHK_Integration_SourceValid CHECK (
        (SourceType = 'Service' AND SourceServiceId IS NOT NULL AND SourceCiId IS NULL AND SourceExternalId IS NULL) OR
        (SourceType = 'CI' AND SourceCiId IS NOT NULL AND SourceServiceId IS NULL AND SourceExternalId IS NULL) OR
        (SourceType = 'External' AND SourceExternalId IS NOT NULL AND SourceServiceId IS NULL AND SourceCiId IS NULL)
    ),
    CONSTRAINT CHK_Integration_TargetValid CHECK (
        (TargetType = 'Service' AND TargetServiceId IS NOT NULL AND TargetCiId IS NULL AND TargetExternalId IS NULL) OR
        (TargetType = 'CI' AND TargetCiId IS NOT NULL AND TargetServiceId IS NULL AND TargetExternalId IS NULL) OR
        (TargetType = 'External' AND TargetExternalId IS NOT NULL AND TargetServiceId IS NULL AND TargetCiId IS NULL)
    )
);

-- Indexes for Integrations
CREATE INDEX IX_Integration_Type ON Integrations(IntegrationType);
CREATE INDEX IX_Integration_Status ON Integrations(Status);
CREATE INDEX IX_Integration_HealthStatus ON Integrations(HealthStatus);
CREATE INDEX IX_Integration_DataClassification ON Integrations(DataClassification);
CREATE INDEX IX_Integration_SourceService ON Integrations(SourceServiceId);
CREATE INDEX IX_Integration_SourceCI ON Integrations(SourceCiId);
CREATE INDEX IX_Integration_SourceExternal ON Integrations(SourceExternalId);
CREATE INDEX IX_Integration_TargetService ON Integrations(TargetServiceId);
CREATE INDEX IX_Integration_TargetCI ON Integrations(TargetCiId);
CREATE INDEX IX_Integration_TargetExternal ON Integrations(TargetExternalId);

PRINT 'Integrations table created successfully';

-- =============================================
-- 3. INTEGRATION DATA FIELDS TABLE
-- Tracks what data fields flow through each integration
-- =============================================
CREATE TABLE IntegrationDataFields (
    FieldId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationId INT NOT NULL,
    FieldName NVARCHAR(255) NOT NULL,
    FieldType NVARCHAR(50) NULL, -- String, Integer, Decimal, Date, DateTime, Boolean, Object, Array
    Direction NVARCHAR(20) NOT NULL DEFAULT 'Sent', -- Sent, Received, Both
    IsPII BIT DEFAULT 0,
    IsRequired BIT DEFAULT 0,
    Description NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_DataField_Integration FOREIGN KEY (IntegrationId) REFERENCES Integrations(IntegrationId) ON DELETE CASCADE,
    CONSTRAINT UQ_DataField_Integration_Name UNIQUE (IntegrationId, FieldName)
);

CREATE INDEX IX_DataField_Integration ON IntegrationDataFields(IntegrationId);
CREATE INDEX IX_DataField_IsPII ON IntegrationDataFields(IsPII);

PRINT 'IntegrationDataFields table created successfully';

-- =============================================
-- 4. INTEGRATION DEPENDENCIES TABLE
-- Tracks integration chains (Integration A triggers Integration B)
-- =============================================
CREATE TABLE IntegrationDependencies (
    DependencyId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationId INT NOT NULL,
    DependsOnIntegrationId INT NOT NULL,
    DependencyType NVARCHAR(50) NOT NULL DEFAULT 'Requires', -- Requires, Triggers, Follows
    Description NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_IntDep_Integration FOREIGN KEY (IntegrationId) REFERENCES Integrations(IntegrationId),
    CONSTRAINT FK_IntDep_DependsOn FOREIGN KEY (DependsOnIntegrationId) REFERENCES Integrations(IntegrationId),
    CONSTRAINT UQ_IntDep_Unique UNIQUE (IntegrationId, DependsOnIntegrationId),
    CONSTRAINT CHK_IntDep_NotSelf CHECK (IntegrationId != DependsOnIntegrationId)
);

CREATE INDEX IX_IntDep_Integration ON IntegrationDependencies(IntegrationId);
CREATE INDEX IX_IntDep_DependsOn ON IntegrationDependencies(DependsOnIntegrationId);

PRINT 'IntegrationDependencies table created successfully';

-- =============================================
-- 5. REFERENCE DATA: INTEGRATION TYPES
-- =============================================
CREATE TABLE IntegrationTypes (
    TypeId INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    Icon NVARCHAR(50) NULL,
    IsActive BIT DEFAULT 1
);

INSERT INTO IntegrationTypes (TypeName, Description, Icon) VALUES
('API', 'REST, SOAP, or GraphQL API calls', '🔌'),
('Webhook', 'Event-driven HTTP callbacks', '🪝'),
('FileTransfer', 'SFTP, FTP, or cloud storage file exchange', '📁'),
('MessageQueue', 'Async messaging via queues (Service Bus, Kafka)', '📨'),
('ETL', 'Scheduled data extraction, transformation, loading', '🔄'),
('DatabaseLink', 'Direct database connections or replication', '🗄️'),
('Event', 'Event-driven pub/sub (Event Grid, SNS)', '⚡'),
('gRPC', 'High-performance RPC protocol', '🚀');

PRINT 'IntegrationTypes reference table created and populated';

-- =============================================
-- 6. REFERENCE DATA: EXTERNAL SYSTEM CATEGORIES
-- =============================================
CREATE TABLE ExternalSystemCategories (
    CategoryId INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    Icon NVARCHAR(50) NULL
);

INSERT INTO ExternalSystemCategories (CategoryName, Description, Icon) VALUES
('Payment', 'Payment processors and gateways', '💳'),
('CRM', 'Customer relationship management', '👥'),
('HR', 'Human resources and payroll', '👔'),
('Analytics', 'Business intelligence and analytics', '📊'),
('Communication', 'Email, SMS, push notifications', '📧'),
('Security', 'Identity, authentication, security services', '🔐'),
('Cloud', 'Cloud infrastructure providers', '☁️'),
('Storage', 'File storage and CDN services', '💾'),
('Monitoring', 'APM, logging, alerting services', '📈'),
('Marketing', 'Marketing automation and advertising', '📣'),
('ERP', 'Enterprise resource planning', '🏢'),
('eCommerce', 'Shopping carts and marketplaces', '🛒'),
('Social', 'Social media platforms', '📱'),
('Shipping', 'Logistics and shipping providers', '📦'),
('Support', 'Help desk and ticketing systems', '🎫');

PRINT 'ExternalSystemCategories reference table created and populated';
GO

-- =============================================
-- 7. HELPFUL VIEWS
-- =============================================

-- View: Integration catalog with resolved source/target names
CREATE VIEW vw_IntegrationCatalog AS
SELECT 
    i.IntegrationId,
    i.IntegrationName,
    i.Description,
    i.IntegrationType,
    i.Direction,
    
    -- Source resolution
    i.SourceType,
    CASE 
        WHEN i.SourceType = 'Service' THEN s_src.ServiceName
        WHEN i.SourceType = 'CI' THEN ci_src.CiName
        WHEN i.SourceType = 'External' THEN ext_src.SystemName
    END AS SourceName,
    i.SourceServiceId,
    i.SourceCiId,
    i.SourceExternalId,
    
    -- Target resolution
    i.TargetType,
    CASE 
        WHEN i.TargetType = 'Service' THEN s_tgt.ServiceName
        WHEN i.TargetType = 'CI' THEN ci_tgt.CiName
        WHEN i.TargetType = 'External' THEN ext_tgt.SystemName
    END AS TargetName,
    i.TargetServiceId,
    i.TargetCiId,
    i.TargetExternalId,
    
    -- Technical
    i.Protocol,
    i.AuthMethod,
    i.Endpoint,
    i.DataFormat,
    i.DataClassification,
    i.FrequencyType,
    i.FrequencyDetails,
    
    -- Status
    i.Status,
    i.HealthStatus,
    i.LastHealthCheck,
    i.SLA,
    
    -- Ownership
    i.Owner,
    ag.GroupName AS SupportGroup,
    
    -- Counts
    (SELECT COUNT(*) FROM IntegrationDataFields WHERE IntegrationId = i.IntegrationId) AS FieldCount,
    (SELECT COUNT(*) FROM IntegrationDataFields WHERE IntegrationId = i.IntegrationId AND IsPII = 1) AS PIIFieldCount,
    
    -- Audit
    i.CreatedDate,
    i.CreatedBy
FROM Integrations i
LEFT JOIN Services s_src ON i.SourceServiceId = s_src.ServiceId
LEFT JOIN ConfigurationItems ci_src ON i.SourceCiId = ci_src.CiId
LEFT JOIN ExternalSystems ext_src ON i.SourceExternalId = ext_src.ExternalSystemId
LEFT JOIN Services s_tgt ON i.TargetServiceId = s_tgt.ServiceId
LEFT JOIN ConfigurationItems ci_tgt ON i.TargetCiId = ci_tgt.CiId
LEFT JOIN ExternalSystems ext_tgt ON i.TargetExternalId = ext_tgt.ExternalSystemId
LEFT JOIN AssignmentGroups ag ON i.SupportGroupId = ag.AssignmentGroupID;
GO

PRINT 'vw_IntegrationCatalog view created';
GO

-- View: External systems with integration counts
CREATE VIEW vw_ExternalSystemsSummary AS
SELECT 
    es.ExternalSystemId,
    es.SystemName,
    es.Vendor,
    es.Category,
    es.Status,
    es.ContractExpiry,
    (SELECT COUNT(*) FROM Integrations WHERE SourceExternalId = es.ExternalSystemId OR TargetExternalId = es.ExternalSystemId) AS IntegrationCount,
    (SELECT COUNT(*) FROM Integrations WHERE (SourceExternalId = es.ExternalSystemId OR TargetExternalId = es.ExternalSystemId) AND Status = 'Active') AS ActiveIntegrationCount
FROM ExternalSystems es;
GO

PRINT 'vw_ExternalSystemsSummary view created';
GO

PRINT '';
PRINT '=============================================';
PRINT 'Integration Catalog Schema created successfully!';
PRINT '=============================================';
PRINT 'Tables created:';
PRINT '  - ExternalSystems';
PRINT '  - Integrations';
PRINT '  - IntegrationDataFields';
PRINT '  - IntegrationDependencies';
PRINT '  - IntegrationTypes (reference)';
PRINT '  - ExternalSystemCategories (reference)';
PRINT '';
PRINT 'Views created:';
PRINT '  - vw_IntegrationCatalog';
PRINT '  - vw_ExternalSystemsSummary';
PRINT '=============================================';
