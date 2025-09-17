import { ref, watch } from 'vue'

export function useTextHighlighting() {
  const selectedText = ref('')
  const highlightedContent = ref('')
  const previewContent = ref('')
  const previewType = ref('text') // 'text', 'pdf', 'docx', 'html'
  const orderIndex = ref(0) // Order index for color-based highlighting

  // Escape special regex characters
  const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Get highlight class based on order index
  const getHighlightClass = (index) => {
    const colors = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary']
    return `text-highlight ${colors[index % colors.length]}`
  }

  // HTML/Text highlighting using regex and v-html with order-based coloring
  const highlightTextContent = (content, searchText, index = 0) => {
    if (!searchText || !content) return content

    const regex = new RegExp(`(${escapeRegex(searchText)})`, 'gi')
    const highlightClass = getHighlightClass(index)
    return content.replace(
      regex,
      `<mark class="${highlightClass}" data-order-index="${index}">$1</mark>`
    )
  }

  // Watch for changes in selected text and update highlighting
  watch([selectedText, previewContent, orderIndex], ([newText, newContent, index]) => {
    if (previewType.value === 'text' || previewType.value === 'html') {
      highlightedContent.value = highlightTextContent(newContent, newText, index)
    }
  })

  // PDF highlighting using overlay divs with order-based coloring
  const highlightPdfText = (textLayer, searchText, container, index = 0) => {
    if (!searchText || !textLayer || !container) return

    // Clear existing highlights
    const existingHighlights = container.querySelectorAll('.pdf-highlight')
    existingHighlights.forEach((highlight) => highlight.remove())

    const highlightClass = getHighlightClass(index)
    const colors = {
      primary: 'rgba(255, 230, 0, 0.5)',
      secondary: 'rgba(0, 255, 127, 0.4)',
      tertiary: 'rgba(255, 105, 180, 0.4)',
      quaternary: 'rgba(135, 206, 250, 0.4)',
      quinary: 'rgba(255, 165, 0, 0.4)',
    }

    const colorKey = highlightClass.split(' ')[1] || 'primary'
    const backgroundColor = colors[colorKey] || colors.primary

    textLayer.items.forEach((item) => {
      if (item.str.toLowerCase().includes(searchText.toLowerCase())) {
        // PDF.js transform is [a, b, c, d, e, f]
        const [a, b, c, d, e, f] = item.transform
        const x = e
        const y = f
        const width = item.width
        const height = item.height

        const highlight = document.createElement('div')
        highlight.className = `pdf-highlight ${colorKey}`
        highlight.style.position = 'absolute'
        highlight.style.left = `${x}px`
        highlight.style.top = `${y - height}px`
        highlight.style.width = `${width}px`
        highlight.style.height = `${height}px`
        highlight.style.backgroundColor = backgroundColor
        highlight.style.pointerEvents = 'none'
        highlight.style.zIndex = '10'
        highlight.setAttribute('data-order-index', index)

        container.appendChild(highlight)
      }
    })
  }

  // DOCX highlighting using HTML manipulation with order-based coloring
  const highlightDocxContent = (container, searchText, index = 0) => {
    if (!searchText || !container) return

    // Store original content if not already stored
    if (!container.dataset.originalContent) {
      container.dataset.originalContent = container.innerHTML
    }

    // Restore original content and apply new highlighting
    const originalContent = container.dataset.originalContent
    const newHighlightedContent = highlightTextContent(originalContent, searchText, index)
    container.innerHTML = newHighlightedContent
  }

  // Clear all highlights
  const clearHighlights = () => {
    selectedText.value = ''
    highlightedContent.value = previewContent.value

    // Clear PDF highlights
    const pdfHighlights = document.querySelectorAll('.pdf-highlight')
    pdfHighlights.forEach((highlight) => highlight.remove())

    // Clear DOCX highlights
    const docxContainers = document.querySelectorAll('[data-original-content]')
    docxContainers.forEach((container) => {
      if (container.dataset.originalContent) {
        container.innerHTML = container.dataset.originalContent
      }
    })
  }

  // Main highlighting function that handles all preview types with order-based coloring
  const applyHighlighting = (text, type, additionalData = {}) => {
    selectedText.value = text
    previewType.value = type
    orderIndex.value = additionalData.orderIndex || 0

    switch (type) {
      case 'text':
      case 'html':
        // Handled by the watcher
        break

      case 'pdf':
        if (additionalData.textLayer && additionalData.container) {
          highlightPdfText(
            additionalData.textLayer,
            text,
            additionalData.container,
            additionalData.orderIndex || 0
          )
        }
        break

      case 'docx':
        if (additionalData.container) {
          highlightDocxContent(
            additionalData.container,
            text,
            additionalData.orderIndex || 0
          )
        }
        break
    }
  }

  return {
    selectedText,
    highlightedContent,
    previewContent,
    previewType,
    orderIndex,
    applyHighlighting,
    clearHighlights,
    highlightTextContent,
    highlightPdfText,
    highlightDocxContent,
    getHighlightClass,
  }
}
