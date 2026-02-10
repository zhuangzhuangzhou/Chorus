"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getProjectDependenciesAction } from "./actions";

// Status colors matching existing patterns
const statusColors: Record<string, string> = {
  open: "bg-[#FFF3E0] text-[#E65100]",
  assigned: "bg-[#E3F2FD] text-[#1976D2]",
  in_progress: "bg-[#E8F5E9] text-[#5A9E6F]",
  to_verify: "bg-[#F3E5F5] text-[#7B1FA2]",
  done: "bg-[#E0F2F1] text-[#00796B]",
  closed: "bg-[#F5F5F5] text-[#9A9A9A]",
};

const statusBorderColors: Record<string, string> = {
  open: "#E65100",
  assigned: "#1976D2",
  in_progress: "#5A9E6F",
  to_verify: "#7B1FA2",
  done: "#00796B",
  closed: "#9A9A9A",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const priorityDotColors: Record<string, string> = {
  low: "bg-[#9A9A9A]",
  medium: "bg-[#E65100]",
  high: "bg-[#D32F2F]",
  critical: "bg-[#B71C1C]",
};

interface TaskNodeData {
  title: string;
  status: string;
  priority: string;
  [key: string]: unknown;
}

function TaskNode({ data }: NodeProps<Node<TaskNodeData>>) {
  const borderColor = statusBorderColors[data.status] || "#E5E0D8";

  return (
    <div
      className="rounded-lg border-2 bg-white px-4 py-3 shadow-sm min-w-[200px] max-w-[260px]"
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#C67A52] !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1.5">
        <Badge className={`text-[10px] ${statusColors[data.status] || ""}`}>
          {data.status.replace("_", " ")}
        </Badge>
        <div className="flex items-center gap-1">
          <div className={`h-1.5 w-1.5 rounded-full ${priorityDotColors[data.priority] || ""}`} />
          <span className="text-[10px] text-[#9A9A9A]">{priorityLabels[data.priority] || data.priority}</span>
        </div>
      </div>
      <p className="text-xs font-medium text-[#2C2C2C] leading-snug line-clamp-2">
        {data.title}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-[#C67A52] !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node<TaskNodeData>[],
  edges: Edge[]
): { nodes: Node<TaskNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface DagViewProps {
  projectUuid: string;
  onTaskSelect: (taskUuid: string) => void;
}

export function DagView({ projectUuid, onTaskSelect }: DagViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaskNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDag() {
      setIsLoading(true);
      const data = await getProjectDependenciesAction(projectUuid);

      const rawNodes: Node<TaskNodeData>[] = data.nodes.map((n) => ({
        id: n.uuid,
        type: "taskNode",
        position: { x: 0, y: 0 },
        data: { title: n.title, status: n.status, priority: n.priority },
      }));

      // edges: from = taskUuid (depends on), to = dependsOnUuid
      // In visualization: dependsOnUuid -> taskUuid (arrow from dependency to dependent)
      const rawEdges: Edge[] = data.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.to,    // dependsOnUuid (the upstream task)
        target: e.from,   // taskUuid (the task that depends on it)
        animated: true,
        style: { stroke: "#C67A52", strokeWidth: 2 },
        markerEnd: {
          type: "arrowclosed" as const,
          color: "#C67A52",
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIsLoading(false);
    }
    loadDag();
  }, [projectUuid, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<TaskNodeData>) => {
      onTaskSelect(node.id);
    },
    [onTaskSelect]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A9A9A]" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[#9A9A9A]">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E0D8" gap={20} />
        <Controls
          className="[&>button]:border-[#E5E0D8] [&>button]:bg-white [&>button]:text-[#2C2C2C] [&>button:hover]:bg-[#FAF8F4]"
        />
      </ReactFlow>
    </div>
  );
}
