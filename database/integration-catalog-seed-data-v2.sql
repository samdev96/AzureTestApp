-- Integration Catalog Seed Data for VibeNow ITSM
-- Simplified version - Run after schema and CMDB seed data

-- =============================================
-- CLEAR EXISTING DATA
-- =============================================
DELETE FROM IntegrationDependencies;
DELETE FROM IntegrationDataFields;
DELETE FROM Integrations;
DELETE FROM ExternalSystems;

PRINT 'Cleared existing data';

-- =============================================
-- EXTERNAL SYSTEMS
-- =============================================
INSERT INTO ExternalSystems (SystemName, Vendor, Category, Description, BaseUrl, DocumentationUrl, ContactEmail, ContractExpiry, Status, CreatedBy) VALUES
('Stripe', 'Stripe Inc.', 'Payment', 'Payment processing and subscription management', 'https://api.stripe.com', 'https://stripe.com/docs/api', 'support@stripe.com', '2026-12-31', 'Active', 'system'),
('Twilio', 'Twilio Inc.', 'Communication', 'SMS, voice, and messaging APIs', 'https://api.twilio.com', 'https://www.twilio.com/docs', 'support@twilio.com', '2025-06-30', 'Active', 'system'),
('SendGrid', 'Twilio Inc.', 'Communication', 'Transactional and marketing email delivery', 'https://api.sendgrid.com', 'https://docs.sendgrid.com', 'support@sendgrid.com', '2025-06-30', 'Active', 'system'),
('Salesforce', 'Salesforce Inc.', 'CRM', 'Customer relationship management platform', 'https://vibenow.my.salesforce.com', 'https://developer.salesforce.com/docs', 'admin@salesforce.com', '2025-12-31', 'Active', 'system'),
('ADP Workforce', 'ADP Inc.', 'HR', 'Payroll and HR management system', 'https://api.adp.com', 'https://developers.adp.com', 'support@adp.com', '2026-03-31', 'Active', 'system'),
('Okta', 'Okta Inc.', 'Security', 'Identity and access management', 'https://vibenow.okta.com', 'https://developer.okta.com/docs', 'support@okta.com', '2025-09-30', 'Active', 'system'),
('Datadog', 'Datadog Inc.', 'Monitoring', 'Infrastructure and application monitoring', 'https://api.datadoghq.com', 'https://docs.datadoghq.com/api', 'support@datadoghq.com', '2025-12-31', 'Active', 'system'),
('Snowflake', 'Snowflake Inc.', 'Analytics', 'Cloud data warehouse', 'https://vibenow.snowflakecomputing.com', 'https://docs.snowflake.com', 'support@snowflake.com', '2026-06-30', 'Active', 'system'),
('DocuSign', 'DocuSign Inc.', 'eCommerce', 'Electronic signature and agreement cloud', 'https://api.docusign.com', 'https://developers.docusign.com', 'support@docusign.com', '2025-08-31', 'Active', 'system'),
('Slack', 'Salesforce Inc.', 'Communication', 'Team messaging and collaboration', 'https://slack.com/api', 'https://api.slack.com', 'support@slack.com', '2025-12-31', 'Active', 'system');

PRINT 'Inserted 10 External Systems';

-- Verify external systems were inserted
SELECT 'External Systems Count: ' + CAST(COUNT(*) AS VARCHAR) FROM ExternalSystems;

-- =============================================
-- INTEGRATIONS (External System only - no CMDB refs)
-- =============================================

-- Get the external system IDs
DECLARE @StripeId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Stripe');
DECLARE @TwilioId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Twilio');
DECLARE @SendGridId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'SendGrid');
DECLARE @SalesforceId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Salesforce');
DECLARE @ADPId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'ADP Workforce');
DECLARE @OktaId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Okta');
DECLARE @DatadogId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Datadog');
DECLARE @SnowflakeId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Snowflake');
DECLARE @DocuSignId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'DocuSign');
DECLARE @SlackId INT = (SELECT ExternalSystemId FROM ExternalSystems WHERE SystemName = 'Slack');

-- Get some Service IDs (if they exist)
DECLARE @CustomerPortalId INT = (SELECT TOP 1 ServiceId FROM Services WHERE ServiceName LIKE '%Customer%' OR ServiceName LIKE '%Portal%');
DECLARE @PaymentServiceId INT = (SELECT TOP 1 ServiceId FROM Services WHERE ServiceName LIKE '%Payment%');
DECLARE @IdentityServiceId INT = (SELECT TOP 1 ServiceId FROM Services WHERE ServiceName LIKE '%Identity%' OR ServiceName LIKE '%Auth%');
DECLARE @HRServiceId INT = (SELECT TOP 1 ServiceId FROM Services WHERE ServiceName LIKE '%HR%' OR ServiceName LIKE '%Human%');
DECLARE @MonitoringServiceId INT = (SELECT TOP 1 ServiceId FROM Services WHERE ServiceName LIKE '%Monitor%');

-- If no services found, use NULL and create External-to-External integrations
IF @CustomerPortalId IS NULL SET @CustomerPortalId = (SELECT TOP 1 ServiceId FROM Services);

PRINT 'External System IDs retrieved';
PRINT 'Stripe ID: ' + ISNULL(CAST(@StripeId AS VARCHAR), 'NULL');
PRINT 'Customer Portal Service ID: ' + ISNULL(CAST(@CustomerPortalId AS VARCHAR), 'NULL');

-- Insert integrations that don't require CMDB references (External to External)
INSERT INTO Integrations (IntegrationName, Description, IntegrationType, Direction, SourceType, SourceExternalId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
('Datadog to Slack Alerts', 'Send monitoring alerts to Slack', 'Webhook', 'Outbound', 'External', @DatadogId, 'External', @SlackId, 'REST', 'OAuth2', 'https://hooks.slack.com/services/vibenow', 443, 'JSON', 'Internal', 'Event', 'On alert trigger', 'Active', 'Healthy', 'Best effort', 'ops@vibenow.com', 'system'),
('Salesforce to Slack Notifications', 'CRM updates to team channel', 'Webhook', 'Outbound', 'External', @SalesforceId, 'External', @SlackId, 'REST', 'OAuth2', 'https://hooks.slack.com/services/sales', 443, 'JSON', 'Internal', 'Event', 'On deal update', 'Active', 'Healthy', 'Best effort', 'sales@vibenow.com', 'system');

-- Insert integrations with Service references (if services exist)
IF @CustomerPortalId IS NOT NULL
BEGIN
    INSERT INTO Integrations (IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
    ('Portal to Stripe Payments', 'Process credit card payments', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @StripeId, 'REST', 'APIKey', 'https://api.stripe.com/v1/charges', 443, 'JSON', 'PII', 'RealTime', 'On payment submission', 'Active', 'Healthy', '99.99% uptime', 'payments@vibenow.com', 'system'),
    ('Portal to SendGrid Email', 'Transactional emails', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @SendGridId, 'REST', 'APIKey', 'https://api.sendgrid.com/v3/mail/send', 443, 'JSON', 'PII', 'Event', 'On user action', 'Active', 'Healthy', '99.9% uptime', 'comms@vibenow.com', 'system'),
    ('Portal to Twilio SMS', '2FA and notifications', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @TwilioId, 'REST', 'BasicAuth', 'https://api.twilio.com/2010-04-01/Accounts', 443, 'JSON', 'PII', 'Event', 'On 2FA request', 'Active', 'Healthy', '99.9% uptime', 'comms@vibenow.com', 'system'),
    ('Portal to Salesforce CRM', 'Sync customer data', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @SalesforceId, 'REST', 'OAuth2', 'https://vibenow.my.salesforce.com/services/data/v58.0', 443, 'JSON', 'PII', 'Event', 'On customer update', 'Active', 'Healthy', '99.5% uptime', 'sales@vibenow.com', 'system'),
    ('Portal to Okta Auth', 'SSO authentication', 'API', 'Bidirectional', 'Service', @CustomerPortalId, 'External', @OktaId, 'SAML', 'Certificate', 'https://vibenow.okta.com', 443, 'XML', 'PII', 'RealTime', 'On login', 'Active', 'Healthy', '99.99% uptime', 'security@vibenow.com', 'system'),
    ('Portal to DocuSign', 'Document signatures', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @DocuSignId, 'REST', 'OAuth2', 'https://api.docusign.com/v2.1', 443, 'JSON', 'Confidential', 'OnDemand', 'On signature request', 'Active', 'Healthy', '99.5% uptime', 'legal@vibenow.com', 'system');
    
    PRINT 'Inserted Service-to-External integrations';
END

-- Insert Stripe webhook (External to Service)
IF @CustomerPortalId IS NOT NULL
BEGIN
    INSERT INTO Integrations (IntegrationName, Description, IntegrationType, Direction, SourceType, SourceExternalId, TargetType, TargetServiceId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
    ('Stripe Webhooks', 'Payment status updates', 'Webhook', 'Inbound', 'External', @StripeId, 'Service', @CustomerPortalId, 'REST', 'APIKey', 'https://portal.vibenow.com/webhooks/stripe', 443, 'JSON', 'PII', 'Event', 'On payment event', 'Active', 'Healthy', '99.9% uptime', 'payments@vibenow.com', 'system'),
    ('Salesforce Webhooks', 'CRM updates', 'Webhook', 'Inbound', 'External', @SalesforceId, 'Service', @CustomerPortalId, 'REST', 'OAuth2', 'https://portal.vibenow.com/webhooks/salesforce', 443, 'JSON', 'PII', 'Event', 'On CRM update', 'Active', 'Healthy', '99.5% uptime', 'sales@vibenow.com', 'system'),
    ('DocuSign Webhooks', 'Signature completion', 'Webhook', 'Inbound', 'External', @DocuSignId, 'Service', @CustomerPortalId, 'REST', 'OAuth2', 'https://portal.vibenow.com/webhooks/docusign', 443, 'JSON', 'Confidential', 'Event', 'On signature', 'Active', 'Healthy', '99.5% uptime', 'legal@vibenow.com', 'system');
    
    PRINT 'Inserted External-to-Service webhooks';
END

-- Service to Service integrations (if multiple services exist)
IF @CustomerPortalId IS NOT NULL AND @PaymentServiceId IS NOT NULL AND @CustomerPortalId != @PaymentServiceId
BEGIN
    INSERT INTO Integrations (IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetServiceId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
    ('Portal to Payment Service', 'Internal payment processing', 'API', 'Outbound', 'Service', @CustomerPortalId, 'Service', @PaymentServiceId, 'REST', 'OAuth2', 'https://payments.internal/api/v1', 443, 'JSON', 'PII', 'RealTime', 'On checkout', 'Active', 'Healthy', '99.99% uptime', 'payments@vibenow.com', 'system');
    
    PRINT 'Inserted Service-to-Service integration';
END

-- Data warehouse integration
IF @CustomerPortalId IS NOT NULL
BEGIN
    INSERT INTO Integrations (IntegrationName, Description, IntegrationType, Direction, SourceType, SourceServiceId, TargetType, TargetExternalId, Protocol, AuthMethod, Endpoint, Port, DataFormat, DataClassification, FrequencyType, FrequencyDetails, Status, HealthStatus, SLA, Owner, CreatedBy) VALUES
    ('Data Export to Snowflake', 'Analytics data pipeline', 'ETL', 'Outbound', 'Service', @CustomerPortalId, 'External', @SnowflakeId, 'JDBC', 'Certificate', 'vibenow.snowflakecomputing.com', 443, 'Parquet', 'Confidential', 'Scheduled', 'Hourly', 'Active', 'Healthy', '99% uptime', 'data@vibenow.com', 'system'),
    ('Metrics to Datadog', 'Application monitoring', 'API', 'Outbound', 'Service', @CustomerPortalId, 'External', @DatadogId, 'REST', 'APIKey', 'https://api.datadoghq.com/api/v1', 443, 'JSON', 'Internal', 'RealTime', 'Continuous', 'Active', 'Healthy', '99.9% uptime', 'ops@vibenow.com', 'system');
    
    PRINT 'Inserted analytics integrations';
END

PRINT 'Finished inserting Integrations';

-- =============================================
-- INTEGRATION DATA FIELDS
-- =============================================

-- Get integration IDs dynamically
DECLARE @StripeIntId INT = (SELECT TOP 1 IntegrationId FROM Integrations WHERE IntegrationName LIKE '%Stripe%Payment%');
DECLARE @SendGridIntId INT = (SELECT TOP 1 IntegrationId FROM Integrations WHERE IntegrationName LIKE '%SendGrid%');
DECLARE @SalesforceIntId INT = (SELECT TOP 1 IntegrationId FROM Integrations WHERE IntegrationName LIKE '%Salesforce%CRM%');

IF @StripeIntId IS NOT NULL
BEGIN
    INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
    (@StripeIntId, 'amount', 'Integer', 'Sent', 0, 1, 'Payment amount in cents'),
    (@StripeIntId, 'currency', 'String', 'Sent', 0, 1, 'Three-letter currency code'),
    (@StripeIntId, 'customer_id', 'String', 'Sent', 1, 0, 'Stripe customer identifier'),
    (@StripeIntId, 'card_token', 'String', 'Sent', 1, 1, 'Tokenized card details'),
    (@StripeIntId, 'charge_id', 'String', 'Received', 0, 1, 'Stripe charge identifier'),
    (@StripeIntId, 'payment_status', 'String', 'Received', 0, 1, 'Payment status');
    PRINT 'Added Stripe data fields';
END

IF @SendGridIntId IS NOT NULL
BEGIN
    INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
    (@SendGridIntId, 'to_email', 'String', 'Sent', 1, 1, 'Recipient email address'),
    (@SendGridIntId, 'from_email', 'String', 'Sent', 0, 1, 'Sender email address'),
    (@SendGridIntId, 'subject', 'String', 'Sent', 0, 1, 'Email subject line'),
    (@SendGridIntId, 'template_id', 'String', 'Sent', 0, 0, 'SendGrid template ID'),
    (@SendGridIntId, 'message_id', 'String', 'Received', 0, 1, 'SendGrid message identifier');
    PRINT 'Added SendGrid data fields';
END

IF @SalesforceIntId IS NOT NULL
BEGIN
    INSERT INTO IntegrationDataFields (IntegrationId, FieldName, FieldType, Direction, IsPII, IsRequired, Description) VALUES
    (@SalesforceIntId, 'customer_id', 'String', 'Sent', 1, 1, 'Internal customer identifier'),
    (@SalesforceIntId, 'email', 'String', 'Sent', 1, 1, 'Customer email'),
    (@SalesforceIntId, 'first_name', 'String', 'Sent', 1, 1, 'Customer first name'),
    (@SalesforceIntId, 'last_name', 'String', 'Sent', 1, 1, 'Customer last name'),
    (@SalesforceIntId, 'salesforce_id', 'String', 'Received', 0, 1, 'Salesforce record ID');
    PRINT 'Added Salesforce data fields';
END

PRINT 'Finished inserting Data Fields';

-- =============================================
-- SUMMARY
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'Integration Catalog Seed Data Complete!';
PRINT '=============================================';

SELECT 'ExternalSystems' AS TableName, COUNT(*) AS RecordCount FROM ExternalSystems
UNION ALL
SELECT 'Integrations', COUNT(*) FROM Integrations
UNION ALL
SELECT 'IntegrationDataFields', COUNT(*) FROM IntegrationDataFields;
