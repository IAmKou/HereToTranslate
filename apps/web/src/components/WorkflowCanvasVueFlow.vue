<template>
  <div class="workflow-canvas-vueflow">
    <VueFlow
      ref="vueFlowRef"
      v-model="elements"
      :node-types="nodeTypes"
      :default-viewport="{ zoom: 0.7 }"
      :min-zoom="0.1"
      :max-zoom="3"
      :fit-view-on-init="false"
      class="workflow-flow"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
    >
      <!-- Custom zoom controls -->
      <div class="custom-controls">
        <button class="control-btn" @click="zoomIn">
          <i class="pi pi-plus"></i>
        </button>
        <button class="control-btn" @click="zoomOut">
          <i class="pi pi-minus"></i>
        </button>
      </div>
    </VueFlow>

    <!-- Custom background outside VueFlow -->
    <div class="custom-background"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import WorkflowNodeVueFlow from './WorkflowNodeVueFlow.vue';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

// Define node types with markRaw to prevent reactivity warnings
import { markRaw } from 'vue';

const nodeTypes = {
  custom: markRaw(WorkflowNodeVueFlow)
};

interface Props {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: WorkflowNode | null;
}

interface Emits {
  (e: 'node-select', node: WorkflowNode): void;
  (e: 'viewport-change', viewport: any): void;
  (e: 'nodes-update', nodes: WorkflowNode[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// VueFlow instance
const vueFlowRef = ref();

// Zoom functions
const zoomIn = () => {
  if (vueFlowRef.value) {
    vueFlowRef.value.zoomIn();
  }
};

const zoomOut = () => {
  if (vueFlowRef.value) {
    vueFlowRef.value.zoomOut();
  }
};

// Convert our nodes to VueFlow format
const elements = computed(() => {
  const vueFlowNodes = props.nodes.map((node, index) => ({
    id: node.id,
    type: 'custom',
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data.label,
      type: node.type,
      style: node.style
    }
  }));

  // Group edges by source-target pairs to handle multiple edges
  const edgeGroups = new Map();
  props.edges.forEach((edge, index) => {
    const key = `${edge.source}-${edge.target}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key).push({ ...edge, originalIndex: index });
  });

  const vueFlowEdges: any[] = [];
  edgeGroups.forEach((edges: any[], key: string) => {
    if (edges.length === 1) {
      // Single edge - no offset needed
      const edge = edges[0];
      vueFlowEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'smoothstep',
        style: {
          stroke: '#6b778c',
          strokeWidth: 2
        },
        labelStyle: {
          fill: '#ffffff',
          stroke: '#2c3e50',
          strokeWidth: 1,
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif'
        },
        markerEnd: {
          type: 'arrow',
          width: 20,
          height: 20,
          color: '#6b778c'
        }
      });
    } else {
      // Multiple edges - add offset
      edges.forEach((edge: any, groupIndex: number) => {
        const offset = (groupIndex - (edges.length - 1) / 2) * 10; // Spread edges vertically
        vueFlowEdges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: 'smoothstep',
          style: {
            stroke: '#6b778c',
            strokeWidth: 2
          },
          labelStyle: {
            fill: '#ffffff',
            stroke: '#2c3e50',
            strokeWidth: 1,
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif'
          },
          markerEnd: {
            type: 'arrow',
            width: 20,
            height: 20,
            color: '#6b778c'
          },
          // Add offset for multiple edges
          sourceHandle: groupIndex === 0 ? undefined : `source-${groupIndex}`,
          targetHandle: groupIndex === 0 ? undefined : `target-${groupIndex}`,
          data: { offset }
        });
      });
    }
  });

  return [...vueFlowNodes, ...vueFlowEdges];
});

const onNodeClick = (event: any) => {
  const node = event.node;
  const originalNode = props.nodes.find(n => n.id === node.id);
  if (originalNode) {
    emit('node-select', originalNode);
  }
};

const onNodeDragStop = (event: any) => {
  const draggedNode = event.node;
  const updatedNodes = props.nodes.map(node => {
    if (node.id === draggedNode.id) {
      return {
        ...node,
        position: { x: draggedNode.position.x, y: draggedNode.position.y }
      };
    }
    return node;
  });
  emit('nodes-update', updatedNodes);
};
</script>

<style scoped>
.workflow-canvas-vueflow {
  width: 100%;
  height: 600px;
  background: white;
  border: 4px solid #42526E;
  border-radius: 8px;
  overflow: visible;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 100;
}

.workflow-flow {
  width: 100%;
  height: 100%;
  background: transparent;
  position: relative;
  z-index: 10;
  border: 2px solid #42526E;
  border-radius: 6px;
}

:deep(.vue-flow__node) {
  cursor: pointer;
}

:deep(.vue-flow__pane) {
  position: relative;
}

:deep(.vue-flow__viewport) {
  position: relative;
}

:deep(.vue-flow__edge-path) {
  stroke: #6b778c;
  stroke-width: 2;
  z-index: 5;
  position: relative;
}

:deep(.vue-flow__edge-marker) {
  fill: #6b778c;
  stroke: #6b778c;
  stroke-width: 1;
}

:deep(.vue-flow__edge-text) {
  font-size: 12px;
  font-weight: bold;
  fill: #ffffff;
  stroke: #2c3e50;
  stroke-width: 1;
  font-family: Arial, sans-serif;
  z-index: 6;
  position: relative;
}

.custom-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #dfe1e6;
  background: white;
  border-radius: 6px;
  color: #6b778c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #f4f5f7;
  border-color: #c1c7d0;
}

.control-btn i {
  font-size: 14px;
}

.custom-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(240, 240, 240, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(240, 240, 240, 0.3) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  z-index: 0;
}

.workflow-canvas-vueflow {
  position: relative;
}
</style>
