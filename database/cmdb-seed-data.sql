-- CMDB Seed Data for VibeNow ITSM
-- Creates 10 Services with corresponding CIs and relationships
-- Run this after cmdb-schema.sql

-- =============================================
-- CLEAR EXISTING DATA (in correct order for FK constraints)
-- =============================================
DELETE FROM CiRelationships;
DELETE FROM ServiceCiMapping;
DELETE FROM ConfigurationItems;
DELETE FROM Services;

PRINT 'Cleared existing CMDB data';

-- Reset identity seeds
DBCC CHECKIDENT ('Services', RESEED, 0);
DBCC CHECKIDENT ('ConfigurationItems', RESEED, 0);
DBCC CHECKIDENT ('ServiceCiMapping', RESEED, 0);
DBCC CHECKIDENT ('CiRelationships', RESEED, 0);

PRINT 'Reset identity seeds';

-- =============================================
-- SERVICES (10 Business Services)
-- =============================================
SET IDENTITY_INSERT Services ON;

INSERT INTO Services (ServiceId, ServiceName, Description, BusinessOwner, TechnicalOwner, Criticality, Status, SLA, CreatedBy) VALUES
(1, 'Customer Portal', 'Public-facing customer self-service portal', 'Sarah Johnson', 'Mike Chen', 'Critical', 'Active', '99.9% uptime, 15min response', 'system'),
(2, 'Internal HR System', 'Employee management and HR processes', 'Lisa Brown', 'David Kim', 'High', 'Active', '99.5% uptime, 1hr response', 'system'),
(3, 'Payment Processing', 'Credit card and payment gateway services', 'Tom Wilson', 'Anna Lee', 'Critical', 'Active', '99.99% uptime, 5min response', 'system'),
(4, 'Email Service', 'Corporate email and calendar system', 'Mark Davis', 'Chris Wong', 'High', 'Active', '99.9% uptime, 30min response', 'system'),
(5, 'Data Analytics Platform', 'Business intelligence and reporting', 'Emma Garcia', 'Ryan Taylor', 'Medium', 'Active', '99% uptime, 4hr response', 'system'),
(6, 'Mobile App Backend', 'API services for mobile applications', 'John Smith', 'Mike Chen', 'Critical', 'Active', '99.9% uptime, 15min response', 'system'),
(7, 'Document Management', 'File storage and document collaboration', 'Lisa Brown', 'Kevin Patel', 'Medium', 'Active', '99.5% uptime, 2hr response', 'system'),
(8, 'Identity & Access', 'SSO, authentication and authorization', 'Tom Wilson', 'Anna Lee', 'Critical', 'Active', '99.99% uptime, 10min response', 'system'),
(9, 'Monitoring Platform', 'Infrastructure and application monitoring', 'Mark Davis', 'Ryan Taylor', 'High', 'Active', '99.9% uptime, 15min response', 'system'),
(10, 'Dev/Test Environment', 'Development and testing infrastructure', 'Emma Garcia', 'David Kim', 'Low', 'Active', '95% uptime, 8hr response', 'system');

SET IDENTITY_INSERT Services OFF;

PRINT 'Inserted 10 Services';

-- =============================================
-- CONFIGURATION ITEMS (35 CIs)
-- =============================================
SET IDENTITY_INSERT ConfigurationItems ON;

-- Web/Application Servers
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(1, 'WEB-PROD-01', 'Server', 'Windows Server 2022', 'Active', 'Production', 'Azure East US', '10.0.1.10', 'web-prod-01.vibenow.com', '2022', 'Microsoft', 'mike.chen@vibenow.com', 'Primary web server for Customer Portal', 'system'),
(2, 'WEB-PROD-02', 'Server', 'Windows Server 2022', 'Active', 'Production', 'Azure East US', '10.0.1.11', 'web-prod-02.vibenow.com', '2022', 'Microsoft', 'mike.chen@vibenow.com', 'Secondary web server for Customer Portal', 'system'),
(3, 'API-PROD-01', 'Server', 'Ubuntu 22.04', 'Active', 'Production', 'Azure East US', '10.0.2.10', 'api-prod-01.vibenow.com', '22.04 LTS', 'Canonical', 'mike.chen@vibenow.com', 'API server for mobile backend', 'system'),
(4, 'API-PROD-02', 'Server', 'Ubuntu 22.04', 'Active', 'Production', 'Azure East US', '10.0.2.11', 'api-prod-02.vibenow.com', '22.04 LTS', 'Canonical', 'mike.chen@vibenow.com', 'API server for mobile backend', 'system');

-- Databases
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(5, 'SQL-PROD-PRIMARY', 'Database', 'Azure SQL', 'Active', 'Production', 'Azure East US', '10.0.3.10', 'sql-prod.database.windows.net', 'Latest', 'Microsoft', 'david.kim@vibenow.com', 'Primary production database', 'system'),
(6, 'SQL-PROD-REPLICA', 'Database', 'Azure SQL', 'Active', 'Production', 'Azure West US', '10.0.3.11', 'sql-prod-west.database.windows.net', 'Latest', 'Microsoft', 'david.kim@vibenow.com', 'Geo-replicated production database', 'system'),
(7, 'REDIS-PROD-01', 'Cache', 'Azure Redis Cache', 'Active', 'Production', 'Azure East US', '10.0.3.20', 'redis-prod.redis.cache.windows.net', '6.0', 'Microsoft', 'david.kim@vibenow.com', 'Production caching layer', 'system'),
(8, 'MONGO-ANALYTICS', 'Database', 'MongoDB Atlas', 'Active', 'Production', 'Azure East US', '10.0.3.30', 'analytics.mongodb.net', '6.0', 'MongoDB Inc', 'ryan.taylor@vibenow.com', 'Analytics data store', 'system');

-- Load Balancers & Network
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(9, 'ALB-PROD-WEB', 'Load Balancer', 'Azure Application Gateway', 'Active', 'Production', 'Azure East US', '10.0.0.10', 'alb-web.vibenow.com', 'v2', 'Microsoft', 'chris.wong@vibenow.com', 'Web tier load balancer', 'system'),
(10, 'ALB-PROD-API', 'Load Balancer', 'Azure Application Gateway', 'Active', 'Production', 'Azure East US', '10.0.0.11', 'alb-api.vibenow.com', 'v2', 'Microsoft', 'chris.wong@vibenow.com', 'API tier load balancer', 'system'),
(11, 'FW-PROD-01', 'Firewall', 'Azure Firewall', 'Active', 'Production', 'Azure East US', '10.0.0.1', 'fw-prod.vibenow.com', 'Premium', 'Microsoft', 'chris.wong@vibenow.com', 'Production firewall', 'system'),
(12, 'CDN-GLOBAL', 'CDN', 'Azure Front Door', 'Active', 'Production', 'Global', NULL, 'cdn.vibenow.com', 'Standard', 'Microsoft', 'chris.wong@vibenow.com', 'Global content delivery network', 'system');

-- Applications
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(13, 'CustomerPortal-App', 'Application', 'React SPA', 'Active', 'Production', 'Azure East US', NULL, 'portal.vibenow.com', '3.2.1', 'In-house', 'mike.chen@vibenow.com', 'Customer Portal frontend application', 'system'),
(14, 'MobileAPI-App', 'API', 'Node.js Express', 'Active', 'Production', 'Azure East US', NULL, 'api.vibenow.com', '2.5.0', 'In-house', 'mike.chen@vibenow.com', 'Mobile application REST API', 'system'),
(15, 'PaymentGateway-App', 'API', '.NET Core', 'Active', 'Production', 'Azure East US', NULL, 'payments.vibenow.com', '1.8.0', 'In-house', 'anna.lee@vibenow.com', 'Payment processing service', 'system'),
(16, 'HRPortal-App', 'Application', 'Angular', 'Active', 'Production', 'Azure East US', NULL, 'hr.vibenow.com', '2.1.0', 'In-house', 'david.kim@vibenow.com', 'HR Portal frontend application', 'system'),
(17, 'AnalyticsDashboard-App', 'Application', 'Power BI Embedded', 'Active', 'Production', 'Azure East US', NULL, 'analytics.vibenow.com', '2.0', 'Microsoft', 'ryan.taylor@vibenow.com', 'Business analytics dashboard', 'system');

-- Cloud Services
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(18, 'AKS-PROD-CLUSTER', 'Kubernetes Cluster', 'Azure Kubernetes Service', 'Active', 'Production', 'Azure East US', '10.0.4.0/24', 'aks-prod.vibenow.com', '1.28', 'Microsoft', 'mike.chen@vibenow.com', 'Production Kubernetes cluster', 'system'),
(19, 'BLOB-STORAGE-PROD', 'Storage', 'Azure Blob Storage', 'Active', 'Production', 'Azure East US', NULL, 'vibenowprod.blob.core.windows.net', NULL, 'Microsoft', 'kevin.patel@vibenow.com', 'Document and file storage', 'system'),
(20, 'AAD-TENANT', 'Cloud Service', 'Azure Active Directory', 'Active', 'Production', 'Global', NULL, 'vibenow.onmicrosoft.com', 'Premium P2', 'Microsoft', 'anna.lee@vibenow.com', 'Identity provider and SSO', 'system'),
(21, 'KEYVAULT-PROD', 'Cloud Service', 'Azure Key Vault', 'Active', 'Production', 'Azure East US', NULL, 'kv-vibenow-prod.vault.azure.net', 'Standard', 'Microsoft', 'anna.lee@vibenow.com', 'Secrets and certificate management', 'system');

-- Monitoring & Support
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(22, 'APPINSIGHTS-PROD', 'Cloud Service', 'Application Insights', 'Active', 'Production', 'Azure East US', NULL, 'ai-vibenow-prod.applicationinsights.io', 'Latest', 'Microsoft', 'ryan.taylor@vibenow.com', 'Application performance monitoring', 'system'),
(23, 'LOGANALYTICS-PROD', 'Cloud Service', 'Log Analytics Workspace', 'Active', 'Production', 'Azure East US', NULL, 'la-vibenow-prod.oms.opinsights.azure.com', 'Latest', 'Microsoft', 'ryan.taylor@vibenow.com', 'Centralized logging', 'system'),
(24, 'GRAFANA-PROD', 'Application', 'Azure Managed Grafana', 'Active', 'Production', 'Azure East US', '10.0.5.10', 'grafana.vibenow.com', '10.0', 'Grafana Labs', 'ryan.taylor@vibenow.com', 'Metrics visualization', 'system');

-- Email & Messaging
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(25, 'EXCHANGE-ONLINE', 'SaaS Application', 'Microsoft 365 Exchange', 'Active', 'Production', 'Global', NULL, 'outlook.office365.com', 'Latest', 'Microsoft', 'chris.wong@vibenow.com', 'Corporate email service', 'system'),
(26, 'SERVICEBUS-PROD', 'Message Queue', 'Azure Service Bus', 'Active', 'Production', 'Azure East US', NULL, 'sb-vibenow-prod.servicebus.windows.net', 'Premium', 'Microsoft', 'mike.chen@vibenow.com', 'Message queue for async processing', 'system');

-- Development Environment
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(27, 'WEB-DEV-01', 'Server', 'Windows Server 2022', 'Active', 'Development', 'Azure East US', '10.1.1.10', 'web-dev-01.vibenow.com', '2022', 'Microsoft', 'david.kim@vibenow.com', 'Development web server', 'system'),
(28, 'SQL-DEV', 'Database', 'Azure SQL', 'Active', 'Development', 'Azure East US', '10.1.3.10', 'sql-dev.database.windows.net', 'Latest', 'Microsoft', 'david.kim@vibenow.com', 'Development database', 'system'),
(29, 'AKS-DEV-CLUSTER', 'Kubernetes Cluster', 'Azure Kubernetes Service', 'Active', 'Development', 'Azure East US', '10.1.4.0/24', 'aks-dev.vibenow.com', '1.28', 'Microsoft', 'david.kim@vibenow.com', 'Development Kubernetes cluster', 'system');

-- Backup & DR
INSERT INTO ConfigurationItems (CiId, CiName, CiType, SubType, Status, Environment, Location, IpAddress, Hostname, Version, Vendor, Owner, Description, CreatedBy) VALUES
(30, 'BACKUP-VAULT', 'Backup System', 'Azure Recovery Services Vault', 'Active', 'Production', 'Azure West US', NULL, 'rsv-vibenow-backup.vault.azure.net', 'Standard', 'Microsoft', 'kevin.patel@vibenow.com', 'Backup and disaster recovery vault', 'system');

SET IDENTITY_INSERT ConfigurationItems OFF;

PRINT 'Inserted 30 Configuration Items';

-- =============================================
-- SERVICE-CI MAPPINGS (Link Services to CIs)
-- =============================================

-- Customer Portal (ServiceId: 1)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(1, 1, 'Contains', 1, 'system'),   -- WEB-PROD-01
(1, 2, 'Contains', 1, 'system'),   -- WEB-PROD-02
(1, 9, 'Contains', 1, 'system'),   -- ALB-PROD-WEB
(1, 5, 'DependsOn', 1, 'system'),  -- SQL-PROD-PRIMARY
(1, 7, 'DependsOn', 0, 'system'),  -- REDIS-PROD-01
(1, 13, 'Contains', 1, 'system'),  -- CustomerPortal-App
(1, 12, 'Uses', 0, 'system'),      -- CDN-GLOBAL
(1, 20, 'DependsOn', 1, 'system'); -- AAD-TENANT

-- Internal HR System (ServiceId: 2)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(2, 16, 'Contains', 1, 'system'),  -- HRPortal-App
(2, 5, 'DependsOn', 1, 'system'),  -- SQL-PROD-PRIMARY
(2, 20, 'DependsOn', 1, 'system'), -- AAD-TENANT
(2, 18, 'Contains', 0, 'system');  -- AKS-PROD-CLUSTER

-- Payment Processing (ServiceId: 3)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(3, 15, 'Contains', 1, 'system'),  -- PaymentGateway-App
(3, 5, 'DependsOn', 1, 'system'),  -- SQL-PROD-PRIMARY
(3, 21, 'DependsOn', 1, 'system'), -- KEYVAULT-PROD
(3, 11, 'DependsOn', 1, 'system'), -- FW-PROD-01
(3, 18, 'Contains', 1, 'system');  -- AKS-PROD-CLUSTER

-- Email Service (ServiceId: 4)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(4, 25, 'Contains', 1, 'system'),  -- EXCHANGE-ONLINE
(4, 20, 'DependsOn', 1, 'system'); -- AAD-TENANT

-- Data Analytics Platform (ServiceId: 5)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(5, 17, 'Contains', 1, 'system'),  -- AnalyticsDashboard-App
(5, 8, 'DependsOn', 1, 'system'),  -- MONGO-ANALYTICS
(5, 5, 'DependsOn', 0, 'system'),  -- SQL-PROD-PRIMARY
(5, 20, 'DependsOn', 1, 'system'); -- AAD-TENANT

-- Mobile App Backend (ServiceId: 6)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(6, 3, 'Contains', 1, 'system'),   -- API-PROD-01
(6, 4, 'Contains', 1, 'system'),   -- API-PROD-02
(6, 10, 'Contains', 1, 'system'),  -- ALB-PROD-API
(6, 14, 'Contains', 1, 'system'),  -- MobileAPI-App
(6, 5, 'DependsOn', 1, 'system'),  -- SQL-PROD-PRIMARY
(6, 7, 'DependsOn', 1, 'system'),  -- REDIS-PROD-01
(6, 26, 'DependsOn', 0, 'system'), -- SERVICEBUS-PROD
(6, 20, 'DependsOn', 1, 'system'); -- AAD-TENANT

-- Document Management (ServiceId: 7)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(7, 19, 'Contains', 1, 'system'),  -- BLOB-STORAGE-PROD
(7, 20, 'DependsOn', 1, 'system'), -- AAD-TENANT
(7, 18, 'Contains', 0, 'system');  -- AKS-PROD-CLUSTER

-- Identity & Access (ServiceId: 8)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(8, 20, 'Contains', 1, 'system'),  -- AAD-TENANT
(8, 21, 'Contains', 1, 'system');  -- KEYVAULT-PROD

-- Monitoring Platform (ServiceId: 9)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(9, 22, 'Contains', 1, 'system'),  -- APPINSIGHTS-PROD
(9, 23, 'Contains', 1, 'system'),  -- LOGANALYTICS-PROD
(9, 24, 'Contains', 1, 'system');  -- GRAFANA-PROD

-- Dev/Test Environment (ServiceId: 10)
INSERT INTO ServiceCiMapping (ServiceId, CiId, RelationshipType, IsCritical, CreatedBy) VALUES
(10, 27, 'Contains', 1, 'system'), -- WEB-DEV-01
(10, 28, 'Contains', 1, 'system'), -- SQL-DEV
(10, 29, 'Contains', 1, 'system'); -- AKS-DEV-CLUSTER

PRINT 'Inserted Service-CI Mappings';

-- =============================================
-- CI RELATIONSHIPS (CI-to-CI dependencies)
-- =============================================

-- Web servers run behind load balancer
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(1, 9, 'RunsOn', 'Web server 1 is load balanced by ALB', 'system'),
(2, 9, 'RunsOn', 'Web server 2 is load balanced by ALB', 'system');

-- API servers run behind load balancer
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(3, 10, 'RunsOn', 'API server 1 is load balanced by ALB', 'system'),
(4, 10, 'RunsOn', 'API server 2 is load balanced by ALB', 'system');

-- Web servers depend on database
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(1, 5, 'DependsOn', 'Web server connects to primary database', 'system'),
(2, 5, 'DependsOn', 'Web server connects to primary database', 'system'),
(1, 7, 'DependsOn', 'Web server uses Redis cache', 'system'),
(2, 7, 'DependsOn', 'Web server uses Redis cache', 'system');

-- API servers depend on database and cache
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(3, 5, 'DependsOn', 'API server connects to primary database', 'system'),
(4, 5, 'DependsOn', 'API server connects to primary database', 'system'),
(3, 7, 'DependsOn', 'API server uses Redis cache', 'system'),
(4, 7, 'DependsOn', 'API server uses Redis cache', 'system'),
(3, 26, 'ConnectsTo', 'API server publishes to Service Bus', 'system'),
(4, 26, 'ConnectsTo', 'API server publishes to Service Bus', 'system');

-- Database replication
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(6, 5, 'ReplicaOf', 'West US is replica of East US primary', 'system');

-- Applications run on servers/clusters
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(13, 1, 'RunsOn', 'Customer Portal runs on web server 1', 'system'),
(13, 2, 'RunsOn', 'Customer Portal runs on web server 2', 'system'),
(14, 3, 'RunsOn', 'Mobile API runs on API server 1', 'system'),
(14, 4, 'RunsOn', 'Mobile API runs on API server 2', 'system'),
(15, 18, 'RunsOn', 'Payment Gateway runs in AKS', 'system'),
(16, 18, 'RunsOn', 'HR Portal runs in AKS', 'system');

-- Applications depend on identity
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(13, 20, 'DependsOn', 'Customer Portal authenticates via AAD', 'system'),
(14, 20, 'DependsOn', 'Mobile API authenticates via AAD', 'system'),
(15, 20, 'DependsOn', 'Payment Gateway authenticates via AAD', 'system'),
(16, 20, 'DependsOn', 'HR Portal authenticates via AAD', 'system'),
(17, 20, 'DependsOn', 'Analytics Dashboard authenticates via AAD', 'system');

-- Payment gateway needs secrets
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(15, 21, 'DependsOn', 'Payment Gateway retrieves secrets from Key Vault', 'system');

-- Analytics connections
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(17, 8, 'DependsOn', 'Analytics Dashboard queries MongoDB', 'system'),
(17, 5, 'DependsOn', 'Analytics Dashboard queries SQL for reports', 'system');

-- CDN fronts web servers
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(12, 9, 'ConnectsTo', 'CDN routes to web load balancer', 'system');

-- Firewall protects network
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(9, 11, 'DependsOn', 'Web LB traffic flows through firewall', 'system'),
(10, 11, 'DependsOn', 'API LB traffic flows through firewall', 'system');

-- Monitoring connections
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(22, 1, 'ManagedBy', 'App Insights monitors web server 1', 'system'),
(22, 2, 'ManagedBy', 'App Insights monitors web server 2', 'system'),
(22, 3, 'ManagedBy', 'App Insights monitors API server 1', 'system'),
(22, 4, 'ManagedBy', 'App Insights monitors API server 2', 'system'),
(24, 23, 'DependsOn', 'Grafana queries Log Analytics', 'system');

-- Backup relationships
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(30, 5, 'BackupOf', 'Recovery vault backs up primary database', 'system'),
(30, 19, 'BackupOf', 'Recovery vault backs up blob storage', 'system');

-- Kubernetes cluster dependencies
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(18, 20, 'DependsOn', 'AKS cluster uses AAD for RBAC', 'system'),
(18, 21, 'DependsOn', 'AKS cluster retrieves secrets from Key Vault', 'system');

-- Dev environment mirrors prod (simplified)
INSERT INTO CiRelationships (SourceCiId, TargetCiId, RelationshipType, Description, CreatedBy) VALUES
(27, 28, 'DependsOn', 'Dev web server connects to dev database', 'system');

PRINT 'Inserted CI Relationships';

-- =============================================
-- SUMMARY
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'CMDB Seed Data inserted successfully!';
PRINT '=============================================';
PRINT '';

SELECT 'Services' AS TableName, COUNT(*) AS RecordCount FROM Services
UNION ALL
SELECT 'ConfigurationItems', COUNT(*) FROM ConfigurationItems
UNION ALL
SELECT 'ServiceCiMapping', COUNT(*) FROM ServiceCiMapping
UNION ALL
SELECT 'CiRelationships', COUNT(*) FROM CiRelationships;
