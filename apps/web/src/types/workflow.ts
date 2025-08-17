export interface WorkflowVisualization {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'status' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    status: any;
    category: string;
  };
  style: NodeStyle;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'default' | 'any';
  style: EdgeStyle;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeStyle {
  width: number;
  height: number;
  borderRadius: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface EdgeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
}
