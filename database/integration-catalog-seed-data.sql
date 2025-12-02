-- Integration Catalog Seed Data for VibeNow ITSM
-- Creates sample external systems and integrations
-- Run this after integration-catalog-schema.sql and cmdb-seed-data.sql

-- =============================================
-- CLEAR EXISTING DATA
-- =============================================
DELETE FROM IntegrationDependencies;
DELETE FROM IntegrationDataFields;
DELETE FROM Integrations;
DELETE FROM ExternalSystems;

PRINT 'Cleared existing Integration Catalog data';

-- Reset identity seeds
DBCC CHECKIDENT ('ExternalSystems', RESEED, 0);
DBCC CHECKIDENT ('Integrations', RESEED, 0);
DBCC CHECKIDENT ('IntegrationDataFields', RESEED, 0);
DBCC CHECKIDENT ('IntegrationDependencies', RESEED, 0);

PRINT 'Reset identity seeds';

-- =============================================
-- EXTERNAL SYSTEMS (Third-party vendors)
-- =============================================
SET IDENTITY_INSERT ExternalSystems ON;

INSERT INTO ExternalSystems (ExternalSystemId, SystemName, Vendor, Category, Description, BaseUrl, DocumentationUrl, ContactEmail, ContractExpiry, Status, CreatedBy) VALUES
(1, 'Stripe', 'Stripe Inc.', 'Payment', 'Payment processing and subscription management', 'https://api.stripe.com', 'https://stripe.com/docs/api', 'support@stripe.com', '2026-12-31', 'Active', 'system'),
(2, 'Twilio', 'Twilio Inc.', 'Communication', 'SMS, voice, and messaging APIs', 'https://api.twilio.com', 'https://www.twilio.com/docs', 'support@twilio.com', '2025-06-30', 'Active', 'system'),
(3, 'SendGrid', 'Twilio Inc.', 'Communication', 'Transactional and marketing email delivery', 'https://api.sendgrid.com', 'https://docs.sendgrid.com', 'support@sendgrid.com', '2025-06-30', 'Active', 'system'),
(4, 'Salesforce', 'Salesforce Inc.', 'CRM', 'Customer relationship management platform', 'https://vibenow.my.salesforce.com', 'https://developer.salesforce.com/docs', 'admin@salesforce.com', '2025-12-31', 'Active', 'system'),
(5, 'ADP Workforce', 'ADP Inc.', 'HR', 'Payroll and HR management system', 'https://api.adp.com', 'https://developers.adp.com', 'support@adp.com', '2026-03-31', 'Active', 'system'),
(6, 'Okta', 'Okta Inc.', 'Security', 'Identity and access management (backup IdP)', 'https://vibenow.okta.com', 'https://developer.okta.com/docs', 'support@okta.com', '2025-09-30', 'Active', 'system'),
(7, 'Datadog', 'Datadog Inc.', 'Monitoring', 'Infrastructure and application monitoring', 'https://api.datadoghq.com', 'https://docs.datadoghq.com/api', 'support@datadoghq.com', '2025-12-31', 'Active', 'system'),
(8, 'Snowflake', 'Snowflake Inc.', 'Analytics', 'Cloud data warehouse', 'https://vibenow.snowflakecomputing.com', 'https://docs.snowflake.com', 'support@snowflake.com', '2026-06-30', 'Active', 'system'),
(9, 'DocuSign', 'DocuSign Inc.', 'eCommerce', 'Electronic signature and agreement cloud', 'https://api.docusign.com', 'https://developers.docusign.com', 'support@docusign.com', '2025-08-31', 'Active', 'system'),
(10, 'Slack', 'Salesforce Inc.', 'Communication', 'Team messaging and collaboration', 'https://slack.com/api', 'https://api.slack.com', 'support@slack.com', '2025-12-31', 'Active', 'system');

SET IDENTITY_INSERT ExternalSystems OFF;

PRINT 'Inserted 10 External Systems';

-- =============================================
-- INTEGRATIONS
-- =============================================
SET IDENTITY_INSERT Integrations ON;

-- Payment Integrations
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceCiId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(1, 'Payment Gateway → Stripe', 'Process credit card payments via Stripe API', 'API', 'Outbound', 'CI', 15, 'External', 1, 'REST', 'APIKey', 'https://api.stripe.com/v1/charges', 443, 'JSON', 'PII', 'RealTime', 'On payment submission', 'Active', 'Healthy', '99.99% uptime', 'anna.lee@vibenow.com', 'system'),
(2, 'Stripe → Payment Webhooks', 'Receive payment status updates from Stripe', 'Webhook', 'Inbound', 'External', NULL, 'CI', 15, 'REST', 'APIKey', 'https://payments.vibenow.com/webhooks/stripe', 443, 'JSON', 'PII', 'Event', 'On payment event', 'Active', 'Healthy', '99.9% uptime', 'anna.lee@vibenow.com', 'system');
UPDATE Integrations SET SourceExternalId = 1, SourceCiId = NULL WHERE IntegrationId = 2;

-- Communication Integrations
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(3, 'Customer Portal → SendGrid', 'Send transactional emails (welcome, password reset)', 'API', 'Outbound', 'Service', 1, 'External', 3, 'REST', 'APIKey', 'https://api.sendgrid.com/v3/mail/send', 443, 'JSON', 'PII', 'Event', 'On user action', 'Active', 'Healthy', '99.9% uptime', 'mike.chen@vibenow.com', 'system'),
(4, 'Mobile App → Twilio SMS', 'Send 2FA codes and notifications via SMS', 'API', 'Outbound', 'Service', 6, 'External', 2, 'REST', 'BasicAuth', 'https://api.twilio.com/2010-04-01/Accounts', 443, 'JSON', 'PII', 'Event', 'On 2FA request', 'Active', 'Healthy', '99.9% uptime', 'mike.chen@vibenow.com', 'system');

-- CRM Integration
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(5, 'Customer Portal → Salesforce', 'Sync customer data to Salesforce CRM', 'API', 'Outbound', 'Service', 1, 'External', 4, 'REST', 'OAuth2', 'https://vibenow.my.salesforce.com/services/data/v58.0', 443, 'JSON', 'PII', 'Event', 'On customer update', 'Active', 'Healthy', '99.5% uptime', 'sales@vibenow.com', 'system'),
(6, 'Salesforce → Customer Sync', 'Receive customer updates from Salesforce', 'Webhook', 'Inbound', 'External', NULL, 'Service', 1, 'REST', 'OAuth2', 'https://portal.vibenow.com/webhooks/salesforce', 443, 'JSON', 'PII', 'Event', 'On CRM update', 'Active', 'Healthy', '99.5% uptime', 'sales@vibenow.com', 'system');
UPDATE Integrations SET SourceExternalId = 4, SourceServiceId = NULL WHERE IntegrationId = 6;

-- HR Integration
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(7, 'HR System → ADP Payroll', 'Export payroll data to ADP', 'FileTransfer', 'Outbound', 'Service', 2, 'External', 5, 'SFTP', 'Certificate', 'sftp://files.adp.com/vibenow/payroll', 22, 'CSV', 'Confidential', 'Scheduled', 'Daily at 6:00 AM UTC', 'Active', 'Healthy', '99% uptime', 'hr@vibenow.com', 'system'),
(8, 'ADP → HR Import', 'Import employee data changes from ADP', 'FileTransfer', 'Inbound', 'External', NULL, 'Service', 2, 'SFTP', 'Certificate', 'sftp://files.vibenow.com/adp/employees', 22, 'CSV', 'Confidential', 'Scheduled', 'Daily at 7:00 AM UTC', 'Active', 'Healthy', '99% uptime', 'hr@vibenow.com', 'system');
UPDATE Integrations SET SourceExternalId = 5, SourceServiceId = NULL WHERE IntegrationId = 8;

-- Internal Service-to-Service Integrations
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetServiceId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(9, 'Customer Portal → Payment Service', 'Internal payment processing requests', 'API', 'Outbound', 'Service', 1, 'Service', 3, 'REST', 'OAuth2', 'https://payments.vibenow.com/api/v1', 443, 'JSON', 'PII', 'RealTime', 'On checkout', 'Active', 'Healthy', '99.99% uptime', 'anna.lee@vibenow.com', 'system'),
(10, 'Customer Portal → Identity Service', 'Authentication and user management', 'API', 'Outbound', 'Service', 1, 'Service', 8, 'REST', 'OAuth2', 'https://auth.vibenow.com/api/v2', 443, 'JSON', 'PII', 'RealTime', 'On login/auth', 'Active', 'Healthy', '99.99% uptime', 'anna.lee@vibenow.com', 'system'),
(11, 'Mobile Backend → Identity Service', 'Mobile app authentication', 'API', 'Outbound', 'Service', 6, 'Service', 8, 'REST', 'OAuth2', 'https://auth.vibenow.com/api/v2', 443, 'JSON', 'PII', 'RealTime', 'On login/auth', 'Active', 'Healthy', '99.99% uptime', 'mike.chen@vibenow.com', 'system'),
(12, 'Mobile Backend → Payment Service', 'In-app payment processing', 'API', 'Outbound', 'Service', 6, 'Service', 3, 'REST', 'OAuth2', 'https://payments.vibenow.com/api/v1', 443, 'JSON', 'PII', 'RealTime', 'On checkout', 'Active', 'Healthy', '99.99% uptime', 'mike.chen@vibenow.com', 'system');

-- Message Queue Integrations
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceCiId, TargetType, TargetCiId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(13, 'API Servers → Service Bus', 'Async message publishing to Service Bus', 'MessageQueue', 'Bidirectional', 'CI', 14, 'CI', 26, 'AMQP', 'Certificate', 'sb-vibenow-prod.servicebus.windows.net', 5671, 'JSON', 'Internal', 'Event', 'On async operation', 'Active', 'Healthy', '99.9% uptime', 'mike.chen@vibenow.com', 'system');

-- Analytics/Data Integrations
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceCiId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(14, 'SQL Database → Snowflake', 'ETL pipeline to data warehouse', 'ETL', 'Outbound', 'CI', 5, 'External', 8, 'JDBC', 'Certificate', 'vibenow.snowflakecomputing.com', 443, 'Parquet', 'Confidential', 'Scheduled', 'Hourly', 'Active', 'Healthy', '99% uptime', 'ryan.taylor@vibenow.com', 'system'),
(15, 'MongoDB → Analytics Dashboard', 'Real-time analytics data feed', 'DatabaseLink', 'Outbound', 'CI', 8, 'CI', 17, 'MongoDB', 'Certificate', 'analytics.mongodb.net', 27017, 'JSON', 'Internal', 'RealTime', 'Continuous sync', 'Active', 'Healthy', '99.5% uptime', 'ryan.taylor@vibenow.com', 'system');

-- Monitoring Integration
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(16, 'Monitoring → Datadog', 'Export metrics and logs to Datadog', 'API', 'Outbound', 'Service', 9, 'External', 7, 'REST', 'APIKey', 'https://api.datadoghq.com/api/v1', 443, 'JSON', 'Internal', 'RealTime', 'Continuous', 'Active', 'Healthy', '99.9% uptime', 'ryan.taylor@vibenow.com', 'system'),
(17, 'Datadog → Slack Alerts', 'Send monitoring alerts to Slack', 'Webhook', 'Outbound', 'External', NULL, 'External', 10, 'REST', 'OAuth2', 'https://hooks.slack.com/services/vibenow', 443, 'JSON', 'Internal', 'Event', 'On alert trigger', 'Active', 'Healthy', 'Best effort', 'ryan.taylor@vibenow.com', 'system');
UPDATE Integrations SET SourceExternalId = 7, SourceServiceId = NULL WHERE IntegrationId = 17;

-- Document Signing Integration
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(18, 'Document Management → DocuSign', 'Send documents for e-signature', 'API', 'Outbound', 'Service', 7, 'External', 9, 'REST', 'OAuth2', 'https://api.docusign.com/v2.1', 443, 'JSON', 'Confidential', 'OnDemand', 'On signature request', 'Active', 'Healthy', '99.5% uptime', 'kevin.patel@vibenow.com', 'system'),
(19, 'DocuSign → Document Webhooks', 'Receive signature completion events', 'Webhook', 'Inbound', 'External', NULL, 'Service', 7, 'REST', 'OAuth2', 'https://docs.vibenow.com/webhooks/docusign', 443, 'JSON', 'Confidential', 'Event', 'On signature event', 'Active', 'Healthy', '99.5% uptime', 'kevin.patel@vibenow.com', 'system');
UPDATE Integrations SET SourceExternalId = 9, SourceServiceId = NULL WHERE IntegrationId = 19;

-- Identity Federation
INSERT INTO Integrations (IntegrationId, IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
(20, 'Identity Service → Okta (Backup)', 'Backup identity provider federation', 'API', 'Bidirectional', 'Service', 8, 'External', 6, 'SAML', 'Certificate', 'https://vibenow.okta.com', 443, 'XML', 'PII', 'RealTime', 'On auth request', 'Active', 'Healthy', '99.99% uptime', 'anna.lee@vibenow.com', 'system');

SET IDENTITY_INSERT Integrations OFF;

PRINT 'Inserted 20 Integrations';

-- =============================================
-- INTEGRATION DATA FIELDS (Sample fields for key integrations)
-- =============================================

-- Stripe Payment Integration Fields
INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
(1, 'amount', 'Integer', 'Sent', 0, 1, 'Payment amount in cents'),
(1, 'currency', 'String', 'Sent', 0, 1, 'Three-letter currency code'),
(1, 'customer_id', 'String', 'Sent', 1, 0, 'Stripe customer identifier'),
(1, 'card_token', 'String', 'Sent', 1, 1, 'Tokenized card details'),
(1, 'charge_id', 'String', 'Received', 0, 1, 'Stripe charge identifier'),
(1, 'status', 'String', 'Received', 0, 1, 'Payment status');

-- SendGrid Email Fields
INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
(3, 'to_email', 'String', 'Sent', 1, 1, 'Recipient email address'),
(3, 'from_email', 'String', 'Sent', 0, 1, 'Sender email address'),
(3, 'subject', 'String', 'Sent', 0, 1, 'Email subject line'),
(3, 'template_id', 'String', 'Sent', 0, 0, 'SendGrid template ID'),
(3, 'message_id', 'String', 'Received', 0, 1, 'SendGrid message identifier');

-- Salesforce CRM Fields
INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
(5, 'customer_id', 'String', 'Sent', 1, 1, 'Internal customer identifier'),
(5, 'email', 'String', 'Sent', 1, 1, 'Customer email'),
(5, 'first_name', 'String', 'Sent', 1, 1, 'Customer first name'),
(5, 'last_name', 'String', 'Sent', 1, 1, 'Customer last name'),
(5, 'phone', 'String', 'Sent', 1, 0, 'Customer phone number'),
(5, 'salesforce_id', 'String', 'Received', 0, 1, 'Salesforce record ID');

-- ADP Payroll Fields
INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
(7, 'employee_id', 'String', 'Sent', 1, 1, 'Employee identifier'),
(7, 'pay_period', 'String', 'Sent', 0, 1, 'Pay period identifier'),
(7, 'gross_pay', 'Decimal', 'Sent', 1, 1, 'Gross pay amount'),
(7, 'deductions', 'Decimal', 'Sent', 1, 0, 'Total deductions'),
(7, 'net_pay', 'Decimal', 'Sent', 1, 1, 'Net pay amount');

-- Internal Payment Service Fields
INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
(9, 'order_id', 'String', 'Sent', 0, 1, 'Order identifier'),
(9, 'amount', 'Decimal', 'Sent', 0, 1, 'Payment amount'),
(9, 'payment_method', 'String', 'Sent', 1, 1, 'Payment method details'),
(9, 'transaction_id', 'String', 'Received', 0, 1, 'Internal transaction ID'),
(9, 'status', 'String', 'Received', 0, 1, 'Payment status');

PRINT 'Inserted Integration Data Fields';

-- =============================================
-- INTEGRATION DEPENDENCIES
-- =============================================

-- Stripe webhook depends on outbound payment call
INSERT INTO IntegrationDependencies (IntegrationId, DependsOnIntegrationId, DependencyType, Description) VALUES
(2, 1, 'Follows', 'Webhook is triggered after payment is submitted');

-- Internal payment depends on identity
INSERT INTO IntegrationDependencies (IntegrationId, DependsOnIntegrationId, DependencyType, Description) VALUES
(9, 10, 'Requires', 'Payment requires authenticated user'),
(12, 11, 'Requires', 'Mobile payment requires authenticated user');

-- Datadog alerts depend on monitoring export
INSERT INTO IntegrationDependencies (IntegrationId, DependsOnIntegrationId, DependencyType, Description) VALUES
(17, 16, 'Follows', 'Alerts triggered based on exported metrics');

PRINT 'Inserted Integration Dependencies';

-- =============================================
-- SUMMARY
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'Integration Catalog Seed Data inserted successfully!';
PRINT '=============================================';
PRINT '';

SELECT 'ExternalSystems' AS TableName, COUNT(*) AS RecordCount FROM ExternalSystems
UNION ALL
SELECT 'Integrations', COUNT(*) FROM Integrations
UNION ALL
SELECT 'IntegrationDataFields', COUNT(*) FROM IntegrationDataFields
UNION ALL
SELECT 'IntegrationDependencies', COUNT(*) FROM IntegrationDependencies;
