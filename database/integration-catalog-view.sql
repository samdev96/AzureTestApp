-- Integration Catalog View
-- Run this AFTER integration-catalog-schema-v2.sql

-- Drop existing view if exists
IF OBJECT_ID('vw_IntegrationsExpanded', 'V') IS NOT NULL 
    DROP VIEW vw_IntegrationsExpanded;

-- Create the expanded integrations view
EXEC('
CREATE VIEW vw_IntegrationsExpanded AS
SELECT 
    i.IntegrationId,
    i.IntegrationName,
    i.Description,
    i.IntegrationType,
    i.Direction,
    
    i.SourceType,
    i.SourceServiceId,
    i.SourceCiId,
    i.SourceExternalId,
    s_src.ServiceName AS SourceServiceName,
    ci_src.CiName AS SourceCiName,
    ext_src.SystemName AS SourceExternalName,
    COALESCE(s_src.ServiceName, ci_src.CiName, ext_src.SystemName) AS SourceName,
    
    i.TargetType,
    i.TargetServiceId,
    i.TargetCiId,
    i.TargetExternalId,
    s_tgt.ServiceName AS TargetServiceName,
    ci_tgt.CiName AS TargetCiName,
    ext_tgt.SystemName AS TargetExternalName,
    COALESCE(s_tgt.ServiceName, ci_tgt.CiName, ext_tgt.SystemName) AS TargetName,
    
    i.Protocol,
    i.AuthMethod,
    i.Endpoint,
    i.Port,
    i.DataFormat,
    i.DataClassification,
    i.FrequencyType,
    i.FrequencyDetails,
    
    i.Status,
    i.HealthStatus,
    i.LastHealthCheck,
    i.SLA,
    i.Owner,
    
    i.CreatedAt,
    i.UpdatedAt,
    i.CreatedBy
FROM Integrations i
LEFT JOIN Services s_src ON i.SourceServiceId = s_src.ServiceId
LEFT JOIN ConfigurationItems ci_src ON i.SourceCiId = ci_src.CiId
LEFT JOIN ExternalSystems ext_src ON i.SourceExternalId = ext_src.ExternalSystemId
LEFT JOIN Services s_tgt ON i.TargetServiceId = s_tgt.ServiceId
LEFT JOIN ConfigurationItems ci_tgt ON i.TargetCiId = ci_tgt.CiId
LEFT JOIN ExternalSystems ext_tgt ON i.TargetExternalId = ext_tgt.ExternalSystemId
');

PRINT 'vw_IntegrationsExpanded view created successfully';
