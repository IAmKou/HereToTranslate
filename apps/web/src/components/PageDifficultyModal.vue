<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Page Difficulty Settings</h2>
          <p class="text-sm text-gray-600 mt-1">{{ fileName }} - Page {{ currentPage }}</p>
        </div>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex h-[calc(90vh-120px)]">
        <!-- Left Panel - Page Preview -->
        <div class="flex-1 p-6 border-r border-gray-200 overflow-y-auto">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Page Preview</h3>
            <div class="flex items-center gap-2 mb-4">
              <button
                @click="previousPage"
                :disabled="currentPage <= 1"
                class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Previous
              </button>
              <span class="text-sm text-gray-600">Page {{ currentPage }} of {{ totalPages }}</span>
              <button
                @click="nextPage"
                :disabled="currentPage >= totalPages"
                class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Next
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Page Content -->
          <div v-else-if="pagePreview" class="space-y-4">
            <!-- Page Analysis -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-2">Page Analysis</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Text Count:</span>
                  <span class="ml-2 font-medium">{{ pagePreview.analysis.textCount }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Word Count:</span>
                  <span class="ml-2 font-medium">{{ pagePreview.analysis.wordCount }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Avg Word Length:</span>
                  <span class="ml-2 font-medium">{{ pagePreview.analysis.avgWordLength }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Estimated Time:</span>
                  <span class="ml-2 font-medium">{{ pagePreview.analysis.estimatedTime }}h</span>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span v-if="pagePreview.analysis.hasSpecialChars" class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Special Characters
                </span>
                <span v-if="pagePreview.analysis.hasTechnicalTerms" class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Technical Terms
                </span>
                <span v-if="pagePreview.analysis.hasComplexFormatting" class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Complex Formatting
                </span>
              </div>
            </div>

            <!-- Translation Strings Preview -->
            <div class="bg-white border border-gray-200 rounded-lg">
              <h4 class="font-medium text-gray-900 p-4 border-b border-gray-200">Translation Strings</h4>
              <div class="max-h-64 overflow-y-auto">
                <div v-for="(translation, index) in pagePreview.translations" :key="index" class="p-3 border-b border-gray-100 last:border-b-0">
                  <div class="text-sm text-gray-900" v-html="translation.originalText"></div>
                  <div v-if="translation.style" class="mt-1 text-xs text-gray-500">
                    Style: {{ Object.keys(translation.style).filter(k => translation.style && translation.style[k]).join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center py-8">
            <div class="text-red-600 mb-2">{{ error }}</div>
            <button @click="loadPagePreview" class="text-blue-600 hover:text-blue-800 text-sm">
              Try Again
            </button>
          </div>
        </div>

        <!-- Right Panel - Difficulty Settings -->
        <div class="w-96 p-6 overflow-y-auto">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Difficulty Settings</h3>

          <!-- Suggested Difficulty -->
          <div v-if="pagePreview" class="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">Suggested Difficulty</h4>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {{ formatDifficultyLevel(pagePreview.suggestedDifficulty) }}
              </span>
              <span class="text-sm text-blue-700">
                (Score: {{ pagePreview.analysis.complexityScore }}/5)
              </span>
            </div>
          </div>

          <!-- Difficulty Level Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Select Difficulty Level
            </label>
            <div class="space-y-2">
              <div
                v-for="config in difficultyConfigs"
                :key="config.difficultyLevel"
                class="relative"
              >
                <label class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                       :class="{ 'border-blue-500 bg-blue-50': selectedDifficulty === config.difficultyLevel }">
                  <input
                    type="radio"
                    :value="config.difficultyLevel"
                    v-model="selectedDifficulty"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-gray-900">
                        {{ formatDifficultyLevel(config.difficultyLevel) }}
                      </span>
                      <span class="text-sm text-gray-600">
                        {{ config.multiplier }}x multiplier
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">{{ config.description }}</p>
                    <div class="text-xs text-gray-500 mt-2">
                      Base: ${{ config.basePrice }} → 
                      Final: ${{ (config.basePrice * config.multiplier).toFixed(2) }}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Custom Base Score -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Custom Base Score (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              v-model.number="customBaseScore"
              placeholder="Leave empty to use default"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              v-model="notes"
              rows="3"
              placeholder="Add any notes about this page's difficulty..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Calculated Score -->
          <div v-if="selectedDifficulty && selectedConfig" class="mb-6 p-4 bg-green-50 rounded-lg">
            <h4 class="font-medium text-green-900 mb-2">Calculated Score</h4>
            <div class="text-sm text-green-800">
              <div>Base Score: ${{ finalBaseScore }}</div>
              <div>Multiplier: {{ selectedConfig.multiplier }}x</div>
              <div class="font-medium text-lg">Total: ${{ calculatedScore }}</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="assignDifficulty"
              :disabled="!selectedDifficulty || saving"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ saving ? 'Saving...' : 'Assign Difficulty' }}
            </button>
            <button
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

// Simple toast implementation - replace with your actual toast system
const useToast = () => ({
  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`)
    // In a real implementation, this would show a toast notification
    alert(`${type.toUpperCase()}: ${message}`)
  }
})

interface PagePreview {
  pageNumber: number
  filePart: number
  translations: Array<{
    id: string
    originalText: string
    style?: Record<string, any>
  }>
  analysis: {
    textCount: number
    wordCount: number
    textLength: number
    avgWordLength: number
    hasSpecialChars: boolean
    hasTechnicalTerms: boolean
    hasComplexFormatting: boolean
    complexityScore: number
    estimatedTime: number
  }
  suggestedDifficulty: string
}

interface DifficultyConfig {
  id: string
  difficultyLevel: string
  multiplier: number
  basePrice: number
  description: string
  criteria: {
    textDensity: string
    technicalTerms: boolean
    formatting: string
    specialCharacters: boolean
    estimatedTimeRange: string
  }
}

const props = defineProps<{
  isOpen: boolean
  fileId: string
  fileName: string
  totalPages: number
  initialPage?: number
  projectId: string
  branchId: string
}>()

const emit = defineEmits<{
  close: []
  difficultyAssigned: [pageNumber: number, difficulty: string, score: number]
}>()

const { showToast } = useToast()

// State
const currentPage = ref(props.initialPage || 1)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const pagePreview = ref<PagePreview | null>(null)
const difficultyConfigs = ref<DifficultyConfig[]>([])
const selectedDifficulty = ref('')
const customBaseScore = ref<number | null>(null)
const notes = ref('')

// Computed
const selectedConfig = computed(() => 
  difficultyConfigs.value.find(config => config.difficultyLevel === selectedDifficulty.value)
)

const finalBaseScore = computed(() => 
  customBaseScore.value || selectedConfig.value?.basePrice || 0
)

const calculatedScore = computed(() => 
  selectedConfig.value ? (finalBaseScore.value * selectedConfig.value.multiplier).toFixed(2) : '0.00'
)

// Methods
const closeModal = () => {
  emit('close')
}

const loadPagePreview = async () => {
  if (!props.fileId) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`/api/page-difficulty/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: props.fileId,
        pageNumber: currentPage.value,
        language: 'en' // TODO: Make this configurable
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to load page preview: ${response.statusText}`)
    }
    
    pagePreview.value = await response.json()
    
    // Set suggested difficulty as default
    if (pagePreview.value?.suggestedDifficulty && !selectedDifficulty.value) {
      selectedDifficulty.value = pagePreview.value.suggestedDifficulty
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load page preview'
    console.error('Error loading page preview:', err)
  } finally {
    loading.value = false
  }
}

const loadDifficultyConfigs = async () => {
  if (!props.projectId) return
  
  try {
    const response = await fetch(`/api/page-difficulty/configs/${props.projectId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to load difficulty configs: ${response.statusText}`)
    }
    
    difficultyConfigs.value = await response.json()
  } catch (err) {
    console.error('Error loading difficulty configs:', err)
    showToast('Failed to load difficulty configurations', 'error')
  }
}

const assignDifficulty = async () => {
  if (!selectedDifficulty.value || !pagePreview.value) return
  
  saving.value = true
  
  try {
    const response = await fetch(`/api/page-difficulty/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: props.projectId,
        branchId: props.branchId,
        fileId: props.fileId,
        pageNumber: currentPage.value,
        filePart: pagePreview.value.filePart,
        difficultyLevel: selectedDifficulty.value,
        baseScore: customBaseScore.value,
        notes: notes.value,
        previewData: {
          textCount: pagePreview.value.analysis.textCount,
          complexity: selectedDifficulty.value,
          estimatedTime: pagePreview.value.analysis.estimatedTime
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to assign difficulty: ${response.statusText}`)
    }
    
    await response.json()
    
    showToast(`Page ${currentPage.value} difficulty assigned successfully`, 'success')
    emit('difficultyAssigned', currentPage.value, selectedDifficulty.value, parseFloat(calculatedScore.value))
    
    // Reset form for next page
    selectedDifficulty.value = ''
    customBaseScore.value = null
    notes.value = ''
    
    // Move to next page if available
    if (currentPage.value < props.totalPages) {
      nextPage()
    } else {
      closeModal()
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to assign difficulty'
    showToast(errorMessage, 'error')
    console.error('Error assigning difficulty:', err)
  } finally {
    saving.value = false
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < props.totalPages) {
    currentPage.value++
  }
}

const formatDifficultyLevel = (level: string) => {
  return level.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

// Watchers
watch(() => currentPage.value, () => {
  if (props.isOpen) {
    loadPagePreview()
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentPage.value = props.initialPage || 1
    loadPagePreview()
    loadDifficultyConfigs()
  } else {
    // Reset state when modal closes
    pagePreview.value = null
    selectedDifficulty.value = ''
    customBaseScore.value = null
    notes.value = ''
    error.value = ''
  }
})

// Initialize
onMounted(() => {
  if (props.isOpen) {
    loadPagePreview()
    loadDifficultyConfigs()
  }
})
</script>
