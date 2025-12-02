-- Integration Catalog Schema for VibeNow ITSM
-- Tracks all integrations between systems (internal and external)
-- Run this script in Azure SQL Query Editor (Run each section separately if needed)

-- =============================================
-- DROP EXISTING OBJECTS (if re-running)
-- =============================================
IF OBJECT_ID('vw_ExternalSystemsSummary', 'V') IS NOT NULL DROP VIEW vw_ExternalSystemsSummary;
IF OBJECT_ID('vw_IntegrationCatalog', 'V') IS NOT NULL DROP VIEW vw_IntegrationCatalog;
IF OBJECT_ID('IntegrationDependencies', 'U') IS NOT NULL DROP TABLE IntegrationDependencies;
IF OBJECT_ID('IntegrationDataFields', 'U') IS NOT NULL DROP TABLE IntegrationDataFields;
IF OBJECT_ID('Integrations', 'U') IS NOT NULL DROP TABLE Integrations;
IF OBJECT_ID('ExternalSystems', 'U') IS NOT NULL DROP TABLE ExternalSystems;
IF OBJECT_ID('IntegrationTypes', 'U') IS NOT NULL DROP TABLE IntegrationTypes;
IF OBJECT_ID('ExternalSystemCategories', 'U') IS NOT NULL DROP TABLE ExternalSystemCategories;

PRINT 'Dropped existing objects';

-- =============================================
-- 1. EXTERNAL SYSTEMS TABLE
-- =============================================
CREATE TABLE ExternalSystems (
    ExternalSystemId INT IDENTITY(1,1) PRIMARY KEY,
    SystemName NVARCHAR(255) NOT NULL,
    Vendor NVARCHAR(255) NULL,
    Category NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    BaseUrl NVARCHAR(500) NULL,
    DocumentationUrl NVARCHAR(500) NULL,
    ContactEmail NVARCHAR(255) NULL,
    ContractExpiry DATE NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CreatedBy NVARCHAR(255) NULL
);

CREATE INDEX IX_ExternalSystems_Category ON ExternalSystems(Category);
CREATE INDEX IX_ExternalSystems_Status ON ExternalSystems(Status);

PRINT 'ExternalSystems table created';

-- =============================================
-- 2. INTEGRATIONS TABLE
-- =============================================
CREATE TABLE Integrations (
    IntegrationId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    IntegrationType NVARCHAR(50) NOT NULL,
    Direction NVARCHAR(20) NOT NULL DEFAULT 'Outbound',
    
    -- Source
    SourceType NVARCHAR(20) NOT NULL,
    SourceServiceId INT NULL,
    SourceCiId INT NULL,
    SourceExternalId INT NULL,
    
    -- Target
    TargetType NVARCHAR(20) NOT NULL,
    TargetServiceId INT NULL,
    TargetCiId INT NULL,
    TargetExternalId INT NULL,
    
    -- Technical
    Protocol NVARCHAR(50) NULL,
    AuthMethod NVARCHAR(50) NULL,
    Endpoint NVARCHAR(500) NULL,
    Port INT NULL,
    DataFormat NVARCHAR(50) NULL,
    DataClassification NVARCHAR(50) NOT NULL DEFAULT 'Internal',
    FrequencyType NVARCHAR(50) NOT NULL DEFAULT 'OnDemand',
    FrequencyDetails NVARCHAR(100) NULL,
    
    -- Status
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    HealthStatus NVARCHAR(50) NOT NULL DEFAULT 'Unknown',
    LastHealthCheck DATETIME2 NULL,
    SLA NVARCHAR(100) NULL,
    
    -- Ownership
    Owner NVARCHAR(255) NULL,
    
    -- Audit
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CreatedBy NVARCHAR(255) NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_Int_SourceService FOREIGN KEY (SourceServiceId) REFERENCES Services(ServiceId),
    CONSTRAINT FK_Int_SourceCI FOREIGN KEY (SourceCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT FK_Int_SourceExternal FOREIGN KEY (SourceExternalId) REFERENCES ExternalSystems(ExternalSystemId),
    CONSTRAINT FK_Int_TargetService FOREIGN KEY (TargetServiceId) REFERENCES Services(ServiceId),
    CONSTRAINT FK_Int_TargetCI FOREIGN KEY (TargetCiId) REFERENCES ConfigurationItems(CiId),
    CONSTRAINT FK_Int_TargetExternal FOREIGN KEY (TargetExternalId) REFERENCES ExternalSystems(ExternalSystemId)
);

CREATE INDEX IX_Integrations_Type ON Integrations(IntegrationType);
CREATE INDEX IX_Integrations_Status ON Integrations(Status);
CREATE INDEX IX_Integrations_Health ON Integrations(HealthStatus);

PRINT 'Integrations table created';

-- =============================================
-- 3. INTEGRATION DATA FIELDS TABLE
-- =============================================
CREATE TABLE IntegrationDataFields (
    DataFieldId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationId INT NOT NULL,
    FieldName NVARCHAR(255) NOT NULL,
    FieldType NVARCHAR(50) NULL,
    Direction NVARCHAR(20) NOT NULL DEFAULT 'Sent',
    IsPII BIT DEFAULT 0,
    IsRequired BIT DEFAULT 0,
    SampleValue NVARCHAR(500) NULL,
    Description NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    
    CONSTRAINT FK_DataField_Integration FOREIGN KEY (IntegrationId) REFERENCES Integrations(IntegrationId) ON DELETE CASCADE
);

CREATE INDEX IX_DataField_Integration ON IntegrationDataFields(IntegrationId);

PRINT 'IntegrationDataFields table created';

-- =============================================
-- 4. INTEGRATION DEPENDENCIES TABLE
-- =============================================
CREATE TABLE IntegrationDependencies (
    DependencyId INT IDENTITY(1,1) PRIMARY KEY,
    IntegrationId INT NOT NULL,
    DependsOnIntegrationId INT NOT NULL,
    DependencyType NVARCHAR(50) NOT NULL DEFAULT 'Requires',
    Description NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_IntDep_Int FOREIGN KEY (IntegrationId) REFERENCES Integrations(IntegrationId),
    CONSTRAINT FK_IntDep_Depends FOREIGN KEY (DependsOnIntegrationId) REFERENCES Integrations(IntegrationId)
);

CREATE INDEX IX_IntDep_Integration ON IntegrationDependencies(IntegrationId);

PRINT 'IntegrationDependencies table created';

-- =============================================
-- 5. REFERENCE TABLES
-- =============================================
CREATE TABLE IntegrationTypes (
    TypeId INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    IsActive BIT DEFAULT 1
);

INSERT INTO IntegrationTypes (TypeName, Description) VALUES
('API', 'REST, SOAP, or GraphQL API calls'),
('Webhook', 'Event-driven HTTP callbacks'),
('FileTransfer', 'SFTP, FTP, or cloud storage file exchange'),
('MessageQueue', 'Async messaging via queues'),
('ETL', 'Scheduled data extraction and loading'),
('DatabaseLink', 'Direct database connections');

CREATE TABLE ExternalSystemCategories (
    CategoryId INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL
);

INSERT INTO ExternalSystemCategories (CategoryName, Description) VALUES
('Payment', 'Payment processors and gateways'),
('CRM', 'Customer relationship management'),
('HR', 'Human resources and payroll'),
('Analytics', 'Business intelligence and analytics'),
('Communication', 'Email, SMS, push notifications'),
('Security', 'Identity and authentication services'),
('Monitoring', 'APM, logging, alerting services'),
('eCommerce', 'Shopping carts and marketplaces'),
('Cloud', 'Cloud infrastructure providers');

PRINT 'Reference tables created';

PRINT '';
PRINT '=============================================';
PRINT 'Integration Catalog Schema created!';
PRINT '=============================================';
