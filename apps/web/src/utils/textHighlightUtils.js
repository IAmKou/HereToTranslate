/**
 * Utility functions for text highlighting and processing
 */

/**
 * Escape special regex characters in a string
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Create a regex pattern for text matching
 * @param {string} searchText - Text to search for
 * @param {boolean} caseSensitive - Whether to match case sensitively
 * @param {boolean} wholeWord - Whether to match whole words only
 * @returns {RegExp} - Regex pattern
 */
export const createHighlightRegex = (searchText, caseSensitive = false, wholeWord = false) => {
  if (!searchText) return null
  
  let pattern = escapeRegex(searchText)
  
  if (wholeWord) {
    pattern = `\\b${pattern}\\b`
  }
  
  const flags = caseSensitive ? 'g' : 'gi'
  return new RegExp(`(${pattern})`, flags)
}

/**
 * Count matches of a text pattern in content
 * @param {string} content - Content to search in
 * @param {string} searchText - Text to search for
 * @param {boolean} caseSensitive - Whether to match case sensitively
 * @returns {number} - Number of matches
 */
export const countMatches = (content, searchText, caseSensitive = false) => {
  if (!content || !searchText) return 0
  
  const regex = createHighlightRegex(searchText, caseSensitive)
  const matches = content.match(regex)
  return matches ? matches.length : 0
}

/**
 * Get highlight class based on order index
 * @param {number} orderIndex - Order index for color selection
 * @returns {string} - CSS class name
 */
export const getHighlightClass = (orderIndex) => {
  const colors = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary']
  return `text-highlight ${colors[orderIndex % colors.length]}`
}

/**
 * Highlight text in HTML content with order-based coloring
 * @param {string} content - HTML content
 * @param {string} searchText - Text to highlight
 * @param {number} orderIndex - Order index for color selection
 * @param {boolean} caseSensitive - Whether to match case sensitively
 * @returns {string} - Content with highlighted text
 */
export const highlightTextInHtml = (content, searchText, orderIndex = 0, caseSensitive = false) => {
  if (!content || !searchText) return content
  
  const regex = createHighlightRegex(searchText, caseSensitive)
  if (!regex) return content
  
  const className = getHighlightClass(orderIndex)
  return content.replace(regex, `<mark class="${className}" data-order-index="${orderIndex}">$1</mark>`)
}

/**
 * Remove all highlight marks from HTML content
 * @param {string} content - HTML content with highlights
 * @returns {string} - Content without highlights
 */
export const removeHighlights = (content) => {
  if (!content) return content
  
  return content.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
}

/**
 * Extract text content from HTML (for plain text matching)
 * @param {string} html - HTML content
 * @returns {string} - Plain text content
 */
export const extractTextFromHtml = (html) => {
  if (!html) return ''
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * Find text positions in a string (for overlay positioning)
 * @param {string} content - Content to search in
 * @param {string} searchText - Text to find
 * @param {boolean} caseSensitive - Whether to match case sensitively
 * @returns {Array} - Array of {start, end, text} objects
 */
export const findTextPositions = (content, searchText, caseSensitive = false) => {
  if (!content || !searchText) return []
  
  const positions = []
  const searchContent = caseSensitive ? content : content.toLowerCase()
  const searchPattern = caseSensitive ? searchText : searchText.toLowerCase()
  
  let startIndex = 0
  let foundIndex
  
  while ((foundIndex = searchContent.indexOf(searchPattern, startIndex)) !== -1) {
    positions.push({
      start: foundIndex,
      end: foundIndex + searchText.length,
      text: content.substring(foundIndex, foundIndex + searchText.length)
    })
    startIndex = foundIndex + 1
  }
  
  return positions
}

/**
 * Create highlight overlay element for PDF with order-based coloring
 * @param {Object} textItem - PDF.js text item
 * @param {Object} viewport - PDF.js viewport
 * @param {number} orderIndex - Order index for color selection
 * @returns {HTMLElement} - Highlight overlay element
 */
export const createPdfHighlightOverlay = (textItem, viewport, orderIndex = 0) => {
  const { transform, width, height } = textItem
  const [x, y] = transform
  
  const colors = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary']
  const colorKey = colors[orderIndex % colors.length]
  
  const highlight = document.createElement('div')
  highlight.className = `pdf-highlight ${colorKey}`
  highlight.style.position = 'absolute'
  highlight.style.left = x + 'px'
  highlight.style.top = (viewport.height - y) + 'px'
  highlight.style.width = width + 'px'
  highlight.style.height = height + 'px'
  highlight.style.pointerEvents = 'none'
  highlight.setAttribute('data-order-index', orderIndex)
  
  return highlight
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Validate text selection for highlighting
 * @param {string} text - Selected text
 * @param {Object} options - Validation options
 * @returns {boolean} - Whether text is valid for highlighting
 */
export const isValidTextSelection = (text, options = {}) => {
  const {
    minLength = 1,
    maxLength = 1000,
    allowWhitespaceOnly = false,
    allowSpecialChars = true
  } = options
  
  if (!text || typeof text !== 'string') return false
  
  const trimmedText = text.trim()
  
  if (trimmedText.length < minLength || trimmedText.length > maxLength) {
    return false
  }
  
  if (!allowWhitespaceOnly && !trimmedText) {
    return false
  }
  
  if (!allowSpecialChars && !/^[a-zA-Z0-9\s]+$/.test(trimmedText)) {
    return false
  }
  
  return true
}

/**
 * Get text selection from window
 * @returns {string} - Selected text
 */
export const getWindowSelection = () => {
  const selection = window.getSelection()
  return selection ? selection.toString().trim() : ''
}

/**
 * Clear window selection
 */
export const clearWindowSelection = () => {
  if (window.getSelection) {
    window.getSelection().removeAllRanges()
  }
}
