<template>
  <div class="workflow-visualization-container">
    <VueFlow
      v-model="elements"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
      class="workflow-flow"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
    >
      <template #node-custom="nodeProps">
        <div class="custom-node" :style="{ backgroundColor: nodeProps.data.color }">
          <div class="node-header">
            <div class="node-name">{{ nodeProps.data.label }}</div>
            <div class="node-type">{{ nodeProps.data.type }}</div>
          </div>
          <div class="node-badge" v-if="nodeProps.data.isDefault">Default</div>
        </div>
      </template>

      <template #edge-custom="edgeProps">
        <div class="custom-edge">
          <div class="edge-line"></div>
          <div class="edge-label">{{ edgeProps.data.label }}</div>
        </div>
      </template>

      <Background pattern-color="#aaa" gap="8" />
      <MiniMap />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VueFlow, Background, MiniMap, Controls, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

interface Props {
  statuses: any[]
  transitions: any[]
  workflow: any
}

const props = defineProps<Props>()

const { addNodes, addEdges, setNodes, setEdges } = useVueFlow()

// Convert data to Vue Flow format
const elements = computed(() => {
  const nodes = props.statuses.map((status, index) => ({
    id: status.id,
    type: 'custom',
    position: { x: index * 200, y: 100 },
    data: {
      label: status.name,
      type: status.type,
      color: status.color || '#e0e0e0',
      isDefault: status.isDefault || false
    }
  }))

  const edges = props.transitions.map((transition, index) => ({
    id: `e${transition.id}`,
    source: transition.fromStatus.id,
    target: transition.toStatus.id,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#666', strokeWidth: 2 },
    data: {
      label: transition.name || `${transition.fromStatus.name} → ${transition.toStatus.name}`
    },
    labelBgStyle: { fill: 'rgba(255,255,255,0.9)' },
    labelBgPadding: [4, 4],
    labelBgBorderRadius: 4
  }))

  return { nodes, edges }
})

// Watch for data changes and update flow
watch(elements, (newElements) => {
  setNodes(newElements.nodes)
  setEdges(newElements.edges)
}, { deep: true })

// Event handlers
const onNodeClick = (event: any, node: any) => {
  console.log('Node clicked:', node)
}

const onEdgeClick = (event: any, edge: any) => {
  console.log('Edge clicked:', edge)
}

onMounted(() => {
  // Auto-layout nodes in a horizontal flow
  const nodes = elements.value.nodes
  const nodeWidth = 180
  const spacing = 50

  nodes.forEach((node, index) => {
    node.position.x = index * (nodeWidth + spacing)
    node.position.y = 100
  })

  setNodes(nodes)
  setEdges(elements.value.edges)
})
</script>

<style scoped>
.workflow-visualization-container {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.workflow-flow {
  width: 100%;
  height: 100%;
}

.custom-node {
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  position: relative;
  background: white;
}

.node-header {
  text-align: center;
}

.node-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.node-type {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #007bff;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.custom-edge {
  position: relative;
}

.edge-line {
  height: 2px;
  background: #666;
  width: 100%;
}

.edge-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Vue Flow custom styles */
:deep(.vue-flow__node) {
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.vue-flow__node:hover) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.vue-flow__edge) {
  cursor: pointer;
}

:deep(.vue-flow__edge:hover) {
  stroke-width: 3;
}

:deep(.vue-flow__edge-path) {
  stroke: #666;
  stroke-width: 2;
}

:deep(.vue-flow__controls) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

:deep(.vue-flow__minimap) {
  border-radius: 8px;
  overflow: hidden;
}
</style>
