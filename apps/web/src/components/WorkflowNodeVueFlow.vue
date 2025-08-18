<template>
  <div
    class="workflow-node-vueflow"
    :class="[`node-${nodeType}`, { selected: isSelected }]"
    :style="nodeStyle"
  >
    <!-- Connection handles -->
    <Handle
      type="source"
      :position="Position.Right"
      :style="{ background: '#6b778c' }"
    />
    <Handle
      type="target"
      :position="Position.Left"
      :style="{ background: '#6b778c' }"
    />

    <!-- Additional handles for multiple edges -->
    <Handle
      id="source-1"
      type="source"
      :position="Position.Right"
      :style="{ background: '#6b778c', top: '20%' }"
    />
    <Handle
      id="source-2"
      type="source"
      :position="Position.Right"
      :style="{ background: '#6b778c', top: '80%' }"
    />
    <Handle
      id="target-1"
      type="target"
      :position="Position.Left"
      :style="{ background: '#6b778c', top: '20%' }"
    />
    <Handle
      id="target-2"
      type="target"
      :position="Position.Left"
      :style="{ background: '#6b778c', top: '80%' }"
    />

    <div class="node-content">
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';

interface Props {
  id: string;
  data: {
    label: string;
    type: string;
    style: {
      width: number;
      height: number;
      borderRadius: number;
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
    };
  };
}

const props = defineProps<Props>();

const nodeType = computed(() => props.data?.type || 'status');
const label = computed(() => props.data?.label || 'Unknown');
const style = computed(() => props.data?.style || {
  width: 120,
  height: 60,
  borderRadius: 8,
  fillColor: '#42526E',
  strokeColor: '#dfe1e6',
  strokeWidth: 2
});
const isSelected = computed(() => false); // Will be handled by parent

const nodeStyle = computed(() => {
  const baseStyle = {
    width: `${style.value.width}px`,
    height: `${style.value.height}px`,
    backgroundColor: style.value.fillColor,
    border: `${style.value.strokeWidth}px solid ${style.value.strokeColor}`,
    borderRadius: `${style.value.borderRadius}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: getContrastColor(style.value.fillColor),
    fontSize: nodeType.value === 'start' ? '11px' : '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundImage: 'none',
    backgroundPattern: 'none'
  };

  return baseStyle;
});

// Function to calculate contrast color
const getContrastColor = (hexColor: string) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};
</script>

<style scoped>
.workflow-node-vueflow {
  position: relative;
  background-image: none !important;
  background-pattern: none !important;
  background-repeat: no-repeat !important;
}

.node-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
  pointer-events: none;
  background-image: none !important;
  background-pattern: none !important;
  background-repeat: no-repeat !important;
}

.workflow-node-vueflow:hover {
  filter: brightness(1.1);
  transform: scale(1.02);
}

.workflow-node-vueflow.selected {
  filter: drop-shadow(0 0 8px #0052cc);
  transform: scale(1.05);
}

/* START node specific styles */
.node-start {
  border-radius: 50% !important;
}

/* Override any VueFlow patterns */
:deep(.vue-flow__node) {
  background-image: none !important;
  background-pattern: none !important;
  background-repeat: no-repeat !important;
}

:deep(.vue-flow__node-custom) {
  background-image: none !important;
  background-pattern: none !important;
  background-repeat: no-repeat !important;
}
</style>
