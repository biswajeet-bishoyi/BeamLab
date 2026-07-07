import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchie } from '@beamlab/archie-client';
import { PlanningNode } from './nodes/PlanningNode';
import { ToolNode } from './nodes/ToolNode';
import { ContextNode } from './nodes/ContextNode';
import { GraphInspector } from './GraphInspector';

const nodeTypes = {
  planning: PlanningNode,
  tool: ToolNode,
  context: ContextNode
};

export const ExecutionGraphTab: React.FC = () => {
  const { execution, plan } = useArchie();
  
  // Transform Archie client execution states into DAG nodes.
  // In a real implementation, we would use dagre for auto-layout.
  // For now, we will create a vertical layout manually or rely on a layout hook.
  
  const initialNodes = useMemo(() => {
    const nodes = [];
    let y = 50;

    // Add a generic root request node
    nodes.push({
      id: 'root',
      type: 'context',
      position: { x: 250, y },
      data: { label: 'User Request', status: 'completed' }
    });
    
    y += 100;

    plan.forEach((step, idx) => {
      nodes.push({
        id: `plan_${idx}`,
        type: 'planning',
        position: { x: 250, y },
        data: { label: step.title, description: step.description, status: step.status }
      });
      y += 100;
    });

    execution.forEach((task, idx) => {
      nodes.push({
        id: `exec_${idx}`,
        type: 'tool',
        position: { x: 250, y },
        data: { label: task.name, status: task.status, progress: task.progress }
      });
      y += 100;
    });

    return nodes;
  }, [execution, plan]);

  const initialEdges = useMemo(() => {
    const edges = [];
    if (initialNodes.length > 1) {
      for (let i = 0; i < initialNodes.length - 1; i++) {
        edges.push({
          id: `e-${initialNodes[i].id}-${initialNodes[i+1].id}`,
          source: initialNodes[i].id,
          target: initialNodes[i+1].id,
          animated: true,
          style: { stroke: 'var(--color-accent)' } // Use CSS variable or actual hex
        });
      }
    }
    return edges;
  }, [initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Auto-sync when plan/execution updates (in reality, we'd use dagre layout here)
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-app relative flex">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-app"
        >
          <Background color="var(--color-subtle)" gap={24} size={2} />
          <Controls className="fill-primary" />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'tool') return 'var(--color-accent)';
              if (node.type === 'planning') return '#8B5CF6';
              return 'var(--color-subtle)';
            }} 
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>
      </div>
      
      {/* Right Sidebar Inspector (mock placeholder for now) */}
      <div className="w-80 border-l border-subtle bg-panel z-10 hidden md:block">
        <GraphInspector />
      </div>
    </div>
  );
};
