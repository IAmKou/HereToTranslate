import { ref } from 'vue'

// Simple event bus for text selection synchronization
class EventBus {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  off(event, callback) {
    if (!this.events[event]) return
    
    const index = this.events[event].indexOf(callback)
    if (index > -1) {
      this.events[event].splice(index, 1)
    }
  }

  emit(event, data) {
    if (!this.events[event]) return
    
    this.events[event].forEach(callback => {
      callback(data)
    })
  }
}

export const eventBus = new EventBus()

// Reactive selected text state
export const selectedTextState = ref('')

// Helper functions for text selection synchronization
export const textSelectionSync = {
  setSelectedText(text) {
    selectedTextState.value = text
    eventBus.emit('text-selected', text)
  },
  
  clearSelection() {
    selectedTextState.value = ''
    eventBus.emit('text-cleared')
  },
  
  onTextSelected(callback) {
    eventBus.on('text-selected', callback)
  },
  
  onTextCleared(callback) {
    eventBus.on('text-cleared', callback)
  },
  
  offTextSelected(callback) {
    eventBus.off('text-selected', callback)
  },
  
  offTextCleared(callback) {
    eventBus.off('text-cleared', callback)
  }
}
