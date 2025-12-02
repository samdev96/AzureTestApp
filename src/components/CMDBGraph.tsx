import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import './CMDBGraph.css';

// Types
interface Service {
  ServiceId: number;
  ServiceName: string;
  Description: string | null;
  Criticality: string;
  Status: string;
  BusinessOwner: string | null;
}

interface ConfigurationItem {
  CiId: number;
  CiName: string;
  CiType: string;
  Status: string;
  Environment: string;
  Description: string | null;
}

interface ServiceCiMapping {
  MappingId: number;
  ServiceId: number;
  ServiceName: string;
  CiId: number;
  CiName: string;
  RelationshipType: string;
  IsCritical: boolean;
}

interface CiRelationship {
  RelationshipId: number;
  SourceCiId: number;
  SourceCiName: string;
  TargetCiId: number;
  TargetCiName: string;
  RelationshipType: string;
}

// Custom Service Node
const ServiceNode: React.FC<NodeProps> = ({ data }) => {
  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#22c55e';
      case 'Inactive': return '#6b7280';
      case 'Planned': return '#3b82f6';
      case 'Retired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className={`service-node ${data.isImpacted ? 'impacted' : ''} ${data.isSource ? 'impact-source' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-icon">🏢</span>
        <span className="node-title">{data.label}</span>
        <button className="node-edit-btn" onClick={(e) => { e.stopPropagation(); data.onEdit?.(); }}>
          ✏️
        </button>
      </div>
      <div className="node-badges">
        <span className="badge" style={{ backgroundColor: getCriticalityColor(data.criticality) }}>
          {data.criticality}
        </span>
        <span className="badge" style={{ backgroundColor: getStatusColor(data.status) }}>
          {data.status}
        </span>
      </div>
      {data.owner && <div className="node-owner">👤 {data.owner}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom CI Node
const CINode: React.FC<NodeProps> = ({ data }) => {
  const getTypeIcon = (ciType: string) => {
    const icons: Record<string, string> = {
      'Server': '🖥️', 'Virtual Machine': '💻', 'Container': '📦',
      'Database': '🗄️', 'Application': '📱', 'Web Server': '🌐',
      'API': '🔌', 'Load Balancer': '⚖️', 'Firewall': '🛡️',
      'Storage': '💾', 'Cloud Service': '☁️', 'SaaS Application': '🌩️',
      'Kubernetes Cluster': '⚙️', 'Message Queue': '📨', 'Cache': '⚡',
    };
    return icons[ciType] || '📦';
  };

  const getTypeColor = (ciType: string) => {
    const colors: Record<string, string> = {
      'Server': '#3b82f6', 'Virtual Machine': '#3b82f6', 'Container': '#8b5cf6',
      'Database': '#22c55e', 'Application': '#f97316', 'Web Server': '#06b6d4',
      'API': '#ec4899', 'Load Balancer': '#6366f1', 'Firewall': '#ef4444',
      'Storage': '#64748b', 'Cloud Service': '#0ea5e9', 'SaaS Application': '#0ea5e9',
      'Kubernetes Cluster': '#8b5cf6', 'Message Queue': '#a855f7', 'Cache': '#eab308',
    };
    return colors[ciType] || '#6b7280';
  };

  const getEnvColor = (env: string) => {
    switch (env) {
      case 'Production': return '#ef4444';
      case 'Staging': return '#f97316';
      case 'Development': return '#22c55e';
      case 'Testing': return '#3b82f6';
      case 'DR': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div 
      className={`ci-node ${data.isImpacted ? 'impacted' : ''} ${data.isSource ? 'impact-source' : ''}`}
      style={{ borderColor: getTypeColor(data.ciType) }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} id="left" />
      <div className="node-header">
        <span className="node-icon">{getTypeIcon(data.ciType)}</span>
        <span className="node-title">{data.label}</span>
        <button className="node-edit-btn" onClick={(e) => { e.stopPropagation(); data.onEdit?.(); }}>
          ✏️
        </button>
      </div>
      <div className="node-type">{data.ciType}</div>
      <div className="node-badges">
        <span className="badge env-badge" style={{ backgroundColor: getEnvColor(data.environment) }}>
          {data.environment}
        </span>
        <span className={`badge status-badge ${data.status === 'Active' ? 'active' : ''}`}>
          {data.status}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
};

const nodeTypes = {
  serviceNode: ServiceNode,
  ciNode: CINode,
};

interface CMDBGraphProps {
  onEditService?: (serviceId: number) => void;
  onEditCI?: (ciId: number) => void;
}

const CMDBGraph: React.FC<CMDBGraphProps> = ({ onEditService, onEditCI }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [cis, setCis] = useState<ConfigurationItem[]>([]);
  const [serviceCiMappings, setServiceCiMappings] = useState<ServiceCiMapping[]>([]);
  const [ciRelationships, setCiRelationships] = useState<CiRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [showServices, setShowServices] = useState(true);
  const [showCIs, setShowCIs] = useState(true);
  const [filterCiType, setFilterCiType] = useState<string>('');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('');

  // Impact Analysis
  const [impactMode, setImpactMode] = useState(false);
  const [impactSourceId, setImpactSourceId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [impactSourceType, setImpactSourceType] = useState<'service' | 'ci' | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [servicesRes, cisRes, mappingsRes, relationsRes] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/configuration-items'),
          fetch('/api/service-ci-mappings'),
          fetch('/api/ci-relationships'),
        ]);

        const servicesData = await servicesRes.json();
        const cisData = await cisRes.json();
        const mappingsData = await mappingsRes.json();
        const relationsData = await relationsRes.json();

        setServices(servicesData.data || []);
        setCis(cisData.data || []);
        setServiceCiMappings(mappingsData.data || []);
        setCiRelationships(relationsData.data || []);
      } catch (err) {
        setError('Failed to load CMDB data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate impacted nodes
  const impactedNodes = useMemo(() => {
    if (!impactMode || !impactSourceId) return new Set<string>();

    const impacted = new Set<string>();
    const toProcess: string[] = [impactSourceId];

    while (toProcess.length > 0) {
      const currentId = toProcess.pop()!;
      if (impacted.has(currentId)) continue;
      impacted.add(currentId);

      // If it's a CI, find services that depend on it
      if (currentId.startsWith('ci-')) {
        const ciId = parseInt(currentId.replace('ci-', ''));
        serviceCiMappings
          .filter(m => m.CiId === ciId)
          .forEach(m => {
            const serviceNodeId = `service-${m.ServiceId}`;
            if (!impacted.has(serviceNodeId)) {
              toProcess.push(serviceNodeId);
            }
          });

        // Find CIs that depend on this CI
        ciRelationships
          .filter(r => r.TargetCiId === ciId && r.RelationshipType === 'DependsOn')
          .forEach(r => {
            const depNodeId = `ci-${r.SourceCiId}`;
            if (!impacted.has(depNodeId)) {
              toProcess.push(depNodeId);
            }
          });
      }

      // If it's a service, find all its CIs and dependent services
      if (currentId.startsWith('service-')) {
        const serviceId = parseInt(currentId.replace('service-', ''));
        serviceCiMappings
          .filter(m => m.ServiceId === serviceId)
          .forEach(m => {
            const ciNodeId = `ci-${m.CiId}`;
            if (!impacted.has(ciNodeId)) {
              toProcess.push(ciNodeId);
            }
          });
      }
    }

    return impacted;
  }, [impactMode, impactSourceId, serviceCiMappings, ciRelationships]);

  // Dagre layout function
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Configure the layout
    const nodeWidth = 200;
    const nodeHeight = 100;
    dagreGraph.setGraph({ 
      rankdir: direction,  // TB = top to bottom, LR = left to right
      nodesep: 80,         // Horizontal spacing between nodes
      ranksep: 120,        // Vertical spacing between ranks/levels
      marginx: 50,
      marginy: 50,
    });

    // Add nodes to dagre
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run the layout algorithm
    dagre.layout(dagreGraph);

    // Get the positioned nodes
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  // Build nodes and edges
  useEffect(() => {
    if (loading) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Filter CIs
    let filteredCIs = cis;
    if (filterCiType) {
      filteredCIs = filteredCIs.filter(ci => ci.CiType === filterCiType);
    }
    if (filterEnvironment) {
      filteredCIs = filteredCIs.filter(ci => ci.Environment === filterEnvironment);
    }

    const filteredCiIds = new Set(filteredCIs.map(ci => ci.CiId));

    // Create service nodes (no initial position - dagre will set it)
    if (showServices) {
      services.forEach((service) => {
        const nodeId = `service-${service.ServiceId}`;
        newNodes.push({
          id: nodeId,
          type: 'serviceNode',
          position: { x: 0, y: 0 }, // Will be set by dagre
          data: {
            label: service.ServiceName,
            criticality: service.Criticality,
            status: service.Status,
            owner: service.BusinessOwner,
            isImpacted: impactedNodes.has(nodeId),
            isSource: impactSourceId === nodeId,
            onEdit: () => onEditService?.(service.ServiceId),
          },
        });
      });
    }

    // Create CI nodes (no initial position - dagre will set it)
    if (showCIs) {
      filteredCIs.forEach((ci) => {
        const nodeId = `ci-${ci.CiId}`;
        newNodes.push({
          id: nodeId,
          type: 'ciNode',
          position: { x: 0, y: 0 }, // Will be set by dagre
          data: {
            label: ci.CiName,
            ciType: ci.CiType,
            status: ci.Status,
            environment: ci.Environment,
            isImpacted: impactedNodes.has(nodeId),
            isSource: impactSourceId === nodeId,
            onEdit: () => onEditCI?.(ci.CiId),
          },
        });
      });
    }

    // Create Service-CI edges
    if (showServices && showCIs) {
      serviceCiMappings
        .filter(m => filteredCiIds.has(m.CiId))
        .forEach(mapping => {
          const edgeId = `service-ci-${mapping.MappingId}`;
          const isImpactedEdge = impactedNodes.has(`service-${mapping.ServiceId}`) && 
                                  impactedNodes.has(`ci-${mapping.CiId}`);
          newEdges.push({
            id: edgeId,
            source: `service-${mapping.ServiceId}`,
            target: `ci-${mapping.CiId}`,
            label: mapping.RelationshipType,
            type: 'smoothstep',
            animated: mapping.IsCritical || isImpactedEdge,
            style: {
              stroke: mapping.IsCritical ? '#ef4444' : isImpactedEdge ? '#f97316' : '#94a3b8',
              strokeWidth: mapping.IsCritical ? 3 : 2,
            },
            labelStyle: { fill: '#64748b', fontSize: 10 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: mapping.IsCritical ? '#ef4444' : isImpactedEdge ? '#f97316' : '#94a3b8',
            },
          });
        });
    }

    // Create CI-CI edges
    if (showCIs) {
      ciRelationships
        .filter(r => filteredCiIds.has(r.SourceCiId) && filteredCiIds.has(r.TargetCiId))
        .forEach(rel => {
          const edgeId = `ci-ci-${rel.RelationshipId}`;
          const isImpactedEdge = impactedNodes.has(`ci-${rel.SourceCiId}`) && 
                                  impactedNodes.has(`ci-${rel.TargetCiId}`);
          newEdges.push({
            id: edgeId,
            source: `ci-${rel.SourceCiId}`,
            target: `ci-${rel.TargetCiId}`,
            label: rel.RelationshipType,
            type: 'smoothstep',
            animated: isImpactedEdge,
            style: {
              stroke: isImpactedEdge ? '#f97316' : '#cbd5e1',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            labelStyle: { fill: '#64748b', fontSize: 10 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isImpactedEdge ? '#f97316' : '#cbd5e1',
            },
          });
        });
    }

    // Apply dagre layout to position nodes based on relationships
    if (newNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [services, cis, serviceCiMappings, ciRelationships, loading, showServices, showCIs, 
      filterCiType, filterEnvironment, impactedNodes, impactSourceId, onEditService, onEditCI, setNodes, setEdges, getLayoutedElements]);

  // Handle node click for impact analysis
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (impactMode) {
      if (impactSourceId === node.id) {
        // Clicking same node deselects
        setImpactSourceId(null);
        setImpactSourceType(null);
      } else {
        setImpactSourceId(node.id);
        setImpactSourceType(node.id.startsWith('service-') ? 'service' : 'ci');
      }
    }
  }, [impactMode, impactSourceId]);

  // Get unique CI types and environments for filters
  const ciTypes = useMemo(() => Array.from(new Set(cis.map(ci => ci.CiType))).sort(), [cis]);
  const environments = useMemo(() => Array.from(new Set(cis.map(ci => ci.Environment))).sort(), [cis]);

  if (loading) {
    return (
      <div className="cmdb-graph-loading">
        <div className="loading-spinner"></div>
        <p>Loading CMDB Graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cmdb-graph-error">
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="cmdb-graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 0.8 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.id.startsWith('service-')) return '#7c3aed';
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* Top Controls Panel */}
        <Panel position="top-left" className="graph-panel controls-panel">
          <div className="panel-section">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showServices}
                onChange={(e) => setShowServices(e.target.checked)}
              />
              <span>🏢 Services</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showCIs}
                onChange={(e) => setShowCIs(e.target.checked)}
              />
              <span>📦 CIs</span>
            </label>
          </div>

          <div className="panel-divider"></div>

          <div className="panel-section">
            <select
              value={filterCiType}
              onChange={(e) => setFilterCiType(e.target.value)}
              className="filter-select"
            >
              <option value="">All CI Types</option>
              {ciTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filterEnvironment}
              onChange={(e) => setFilterEnvironment(e.target.value)}
              className="filter-select"
            >
              <option value="">All Environments</option>
              {environments.map(env => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </div>
        </Panel>

        {/* Impact Analysis Panel */}
        <Panel position="top-right" className="graph-panel impact-panel">
          <div className="impact-header">
            <span className="impact-icon">⚡</span>
            <span>Impact Analysis</span>
          </div>
          <button
            className={`impact-toggle ${impactMode ? 'active' : ''}`}
            onClick={() => {
              setImpactMode(!impactMode);
              if (impactMode) {
                setImpactSourceId(null);
                setImpactSourceType(null);
              }
            }}
          >
            {impactMode ? '🔴 Exit Impact Mode' : '🟢 Enter Impact Mode'}
          </button>
          {impactMode && (
            <div className="impact-instructions">
              {impactSourceId ? (
                <>
                  <p className="impact-active">
                    Showing impact for: <strong>{impactSourceId.replace('service-', 'Service #').replace('ci-', 'CI #')}</strong>
                  </p>
                  <p className="impact-count">
                    {impactedNodes.size - 1} items would be affected
                  </p>
                </>
              ) : (
                <p>Click on a Service or CI to see what would be impacted if it went down.</p>
              )}
            </div>
          )}
        </Panel>

        {/* Stats Panel */}
        <Panel position="bottom-left" className="graph-panel stats-panel">
          <div className="stat">
            <span className="stat-icon">🏢</span>
            <span className="stat-value">{services.length}</span>
            <span className="stat-label">Services</span>
          </div>
          <div className="stat">
            <span className="stat-icon">📦</span>
            <span className="stat-value">{cis.length}</span>
            <span className="stat-label">CIs</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🔗</span>
            <span className="stat-value">{serviceCiMappings.length + ciRelationships.length}</span>
            <span className="stat-label">Relationships</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default CMDBGraph;
