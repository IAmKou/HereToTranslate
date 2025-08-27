<template>
  <div v-if="show" class="validation-dialog-overlay" @click="handleOverlayClick">
    <div class="validation-dialog" @click.stop>
      <div class="validation-header">
        <h3>{{ warnings.length }} unresolved issues</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="validation-content">
        <div v-if="warnings.length === 0" class="no-warnings">
          <i class="pi pi-check-circle"></i>
          <span>No validation issues found</span>
        </div>

        <div v-else class="warnings-list">
          <div
            v-for="(warning, index) in warnings"
            :key="index"
            class="warning-item"
            :class="warning.severity"
          >
            <i :class="getWarningIcon(warning.severity)"></i>
            <span>{{ warning.message }}</span>
            <button
              v-if="warning.canAutoFix"
              class="auto-fix-btn"
              @click="handleAutoFixSingle(warning, index)"
              :title="`Auto-fix: ${warning.autoFixDescription}`"
            >
              <i class="pi pi-magic"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="validation-actions">
        <button
          v-if="shouldShowAutoFixButton"
          class="btn btn-autofix"
          @click="handleAutoFix"
        >
          <i class="pi pi-magic"></i>
          AUTOFIX
        </button>
        <button
          v-if="shouldShowSkipButton"
          class="btn btn-skip"
          @click="handleSkip"
        >
          SKIP
        </button>
        <button
          class="btn btn-primary"
          @click="handleSaveAnyway"
        >
          SAVE ANYWAY
        </button>
        <button
          class="btn btn-secondary"
          @click="$emit('close')"
        >
          CANCEL
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface ValidationWarning {
  type: 'missing_number' | 'missing_space' | 'missing_punctuation' | 'length_mismatch' | 'placeholder_mismatch' | 'extra_space' | 'missing_html_tag' | 'missing_url' | 'case_mismatch' | 'missing_currency' | 'date_format_mismatch' | 'context_mismatch';
  message: string;
  severity: 'warning' | 'error';
  originalText: string;
  translatedText: string;
  canAutoFix?: boolean;
  autoFixDescription?: string;
  autoFixAction?: () => string;
}

interface Props {
  show: boolean;
  originalText: string;
  translatedText: string;
  language?: string; // For language-specific rules
  warnings?: ValidationWarning[]; // Pass warnings from parent
  mode?: 'auto-fixable' | 'non-auto-fixable'; // Modal mode
}

interface Emits {
  (e: 'close'): void;
  (e: 'save-anyway'): void;
  (e: 'skip'): void;
  (e: 'auto-fix', warning: ValidationWarning, index: number): void;
  (e: 'auto-fix'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Use warnings from props or compute them if not provided
const warnings = computed((): ValidationWarning[] => {
  // If warnings are passed from parent, use them
  if (props.warnings) {
    return props.warnings;
  }

  // Otherwise compute them (fallback)
  const computedWarnings: ValidationWarning[] = [];

  if (!props.originalText || !props.translatedText) {
    return computedWarnings;
  }

  // 1. HTML/XML Tags Validation (Crowdin allows)
  validateHtmlTags(props.originalText, props.translatedText, computedWarnings);

  // 2. Placeholders Validation (Crowdin allows)
  validatePlaceholders(props.originalText, props.translatedText, computedWarnings);

  // 3. Whitespace Validation (Crowdin allows)
  validateWhitespace(props.originalText, props.translatedText, computedWarnings);

  // 4. Character Case Validation (Crowdin doesn't allow)
  validateCharacterCase(props.originalText, props.translatedText, computedWarnings);

  // 5. URL/Email Validation (Crowdin doesn't allow)
  validateUrlsAndEmails(props.originalText, props.translatedText, computedWarnings);

  // 6. Currency Validation (Crowdin doesn't allow)
  validateCurrency(props.originalText, props.translatedText, computedWarnings);

  // 7. Date/Time Format Validation (Crowdin doesn't allow)
  validateDateTimeFormat(props.originalText, props.translatedText, computedWarnings);

  // 8. Context-Aware Validation disabled per product decision
  // validateContext(props.originalText, props.translatedText, computedWarnings);

  // 9. Number Validation (Crowdin doesn't allow)
  validateNumbers(props.originalText, props.translatedText, computedWarnings);

  // 10. Punctuation Validation (Crowdin doesn't allow)
  validatePunctuation(props.originalText, props.translatedText, computedWarnings);

  // 11. Length Validation disabled per product decision
  // validateLength(props.originalText, props.translatedText, computedWarnings);

  return computedWarnings;
});

// 1. HTML/XML Tags Validation - CROWDIN ALLOWS
function validateHtmlTags(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const originalTags = (originalText.match(/<[^>]+>/g) || []) as string[];
  const translatedTags = (translatedText.match(/<[^>]+>/g) || []) as string[];

  originalTags.forEach((tag: string) => {
    if (!translatedTags.includes(tag)) {
      warnings.push({
        type: 'missing_html_tag',
        message: `Missing HTML tag: ${tag}`,
        severity: 'error',
        originalText,
        translatedText,
        canAutoFix: true, // Crowdin allows HTML tag auto-fix
        autoFixDescription: `Add HTML tag ${tag}`,
        autoFixAction: () => translatedText + tag
      });
    }
  });
}

// 2. Placeholders Validation - CROWDIN ALLOWS
function validatePlaceholders(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const originalPlaceholders = (originalText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];
  const translatedPlaceholders = (translatedText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];

  originalPlaceholders.forEach((placeholder: string) => {
    if (!translatedPlaceholders.includes(placeholder)) {
      warnings.push({
        type: 'placeholder_mismatch',
        message: `Missing placeholder "${placeholder}"`,
        severity: 'error',
        originalText,
        translatedText,
        canAutoFix: true, // Crowdin allows placeholder auto-fix
        autoFixDescription: `Add placeholder "${placeholder}"`,
        autoFixAction: () => translatedText + placeholder
      });
    }
  });
}

// 3. Whitespace Validation - CROWDIN ALLOWS
function validateWhitespace(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  // Check for missing non-breaking spaces
  const originalNbsp = (originalText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  const translatedNbsp = (translatedText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;

  if (originalNbsp > translatedNbsp) {
    warnings.push({
      type: 'missing_space',
      message: `Missing ${originalNbsp - translatedNbsp} non-breaking space(s)`,
      severity: 'warning',
      originalText,
      translatedText,
      canAutoFix: true, // Crowdin allows whitespace auto-fix
      autoFixDescription: `Add ${originalNbsp - translatedNbsp} non-breaking space(s)`,
      autoFixAction: () => translatedText + '&nbsp;'.repeat(originalNbsp - translatedNbsp)
    });
  }

  // Check for extra spaces at the end
  if (translatedText.endsWith(' ') && !originalText.endsWith(' ')) {
    warnings.push({
      type: 'extra_space',
      message: `Source text doesn't end with a space, please remove trailing space`,
      severity: 'warning',
      originalText,
      translatedText,
      canAutoFix: true, // Crowdin allows trailing space removal
      autoFixDescription: 'Remove trailing space',
      autoFixAction: () => translatedText.trimEnd()
    });
  }

  // Check for extra spaces at the beginning
  if (translatedText.startsWith(' ') && !originalText.startsWith(' ')) {
    warnings.push({
      type: 'extra_space',
      message: `Source text doesn't start with a space, please remove leading space`,
      severity: 'warning',
      originalText,
      translatedText,
      canAutoFix: true, // Crowdin allows leading space removal
      autoFixDescription: 'Remove leading space',
      autoFixAction: () => translatedText.trimStart()
    });
  }
}

// 4. Character Case Validation - CROWDIN DOESN'T ALLOW
function validateCharacterCase(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  // Check if original starts with uppercase and translation doesn't
  const originalStartsWithUpper = /^[A-Z]/.test(originalText);
  const translatedStartsWithUpper = /^[A-Z]/.test(translatedText);

  if (originalStartsWithUpper && !translatedStartsWithUpper) {
    warnings.push({
      type: 'case_mismatch',
      message: 'Translation should start with uppercase letter',
      severity: 'warning',
      originalText,
      translatedText,
      canAutoFix: false, // Crowdin doesn't allow case auto-fix
      autoFixDescription: 'Capitalize first letter',
      autoFixAction: () => translatedText.charAt(0).toUpperCase() + translatedText.slice(1)
    });
  }

  // Only enforce preservation of true acronyms (e.g. API, HTML), not generic capitalized words like THE/OF
  const allCapsWords = (originalText.match(/\b[A-Z0-9]{2,}\b/g) || []) as string[];
  const knownAcronyms = new Set([
    'API','HTTP','HTTPS','URL','URI','ID','UID','PDF','CSV','JSON','XML','SQL','DB','UI','UX','CPU','GPU','RAM','SSO','OTP','SSH','AES','RSA','JWT','HTML','CSS','PNG','JPG','JPEG','SVG','UTF','UTF8','UTF-8','TTL','TTL','VAT','SKU','ERP','CRM','SLA','ETA'
  ]);
  // Preserve only known acronyms or tokens that contain digits (e.g., ISO9001)
  const acronymsToPreserve = allCapsWords.filter(word => knownAcronyms.has(word) || /[0-9]/.test(word));
  acronymsToPreserve.forEach((word: string) => {
    if (!translatedText.includes(word)) {
      warnings.push({
        type: 'case_mismatch',
        message: `Missing acronym: ${word}`,
        severity: 'warning',
        originalText,
        translatedText,
        canAutoFix: false,
        autoFixDescription: `Add acronym ${word}`,
        autoFixAction: () => translatedText + ' ' + word
      });
    }
  });
}

// 5. URL/Email Validation - CROWDIN DOESN'T ALLOW
function validateUrlsAndEmails(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const urlRegex = /https?:\/\/[^\s]+|[\w.-]+@[\w.-]+\.\w+/g;
  const originalUrls = (originalText.match(urlRegex) || []) as string[];
  const translatedUrls = (translatedText.match(urlRegex) || []) as string[];

  originalUrls.forEach((url: string) => {
    if (!translatedUrls.includes(url)) {
      const isEmail = url.includes('@');
      warnings.push({
        type: 'missing_url',
        message: `Missing ${isEmail ? 'email' : 'URL'}: ${url}`,
        severity: 'error',
        originalText,
        translatedText,
        canAutoFix: false, // Crowdin doesn't allow URL/email auto-fix
        autoFixDescription: `Add ${isEmail ? 'email' : 'URL'}`,
        autoFixAction: () => translatedText + ' ' + url
      });
    }
  });
}

// 6. Currency Validation - CROWDIN DOESN'T ALLOW
function validateCurrency(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const currencyRegex = /[\$€£¥₹₽₩₪₦₨₱₴₸₺₼₾₿]/g;
  const originalCurrencies = (originalText.match(currencyRegex) || []) as string[];
  const translatedCurrencies = (translatedText.match(currencyRegex) || []) as string[];

  originalCurrencies.forEach((currency: string) => {
    if (!translatedCurrencies.includes(currency)) {
      warnings.push({
        type: 'missing_currency',
        message: `Missing currency symbol: ${currency}`,
        severity: 'error',
        originalText,
        translatedText,
        canAutoFix: false, // Crowdin doesn't allow currency auto-fix
        autoFixDescription: `Add currency symbol ${currency}`,
        autoFixAction: () => translatedText + currency
      });
    }
  });
}

// 7. Date/Time Format Validation - CROWDIN DOESN'T ALLOW
function validateDateTimeFormat(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g;
  const originalDates = (originalText.match(dateRegex) || []) as string[];
  const translatedDates = (translatedText.match(dateRegex) || []) as string[];

  originalDates.forEach((date: string) => {
    if (!translatedDates.includes(date)) {
      warnings.push({
        type: 'date_format_mismatch',
        message: `Missing date format: ${date}`,
        severity: 'warning',
        originalText,
        translatedText,
        canAutoFix: false, // Crowdin doesn't allow date auto-fix
        autoFixDescription: `Add date ${date}`,
        autoFixAction: () => translatedText + ' ' + date
      });
    }
  });
}

// 8. Context-Aware Validation - CROWDIN DOESN'T ALLOW
function validateContext(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const contextKeywords = {
    error: ['ERROR', 'FAILED', 'CRITICAL', 'EXCEPTION', 'INVALID'],
    success: ['SUCCESS', 'COMPLETED', 'DONE', 'FINISHED', 'OK'],
    warning: ['WARNING', 'CAUTION', 'ATTENTION', 'NOTICE', 'ALERT'],
    action: ['CLICK', 'PRESS', 'SELECT', 'CHOOSE', 'ENTER']
  };

  Object.entries(contextKeywords).forEach(([context, keywords]) => {
    const hasKeyword = keywords.some(keyword =>
      originalText.toUpperCase().includes(keyword)
    );

    if (hasKeyword) {
      // Check if translation maintains similar context
      const hasSimilarContext = keywords.some(keyword =>
        translatedText.toUpperCase().includes(keyword) ||
        translatedText.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasSimilarContext) {
        warnings.push({
          type: 'context_mismatch',
          message: `Translation should maintain ${context} context`,
          severity: 'warning',
          originalText,
          translatedText,
          canAutoFix: false // Crowdin doesn't allow context auto-fix
        });
      }
    }
  });
}

// 9. Number Validation - CROWDIN DOESN'T ALLOW
function validateNumbers(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const originalNumbers = (originalText.match(/\d+/g) || []) as string[];
  const translatedNumbers = (translatedText.match(/\d+/g) || []) as string[];

  originalNumbers.forEach((num: string) => {
    if (!translatedNumbers.includes(num)) {
      warnings.push({
        type: 'missing_number',
        message: `Missing number "${num}"`,
        severity: 'warning',
        originalText,
        translatedText,
        canAutoFix: false, // Crowdin doesn't allow number auto-fix
        autoFixDescription: `Add number "${num}"`,
        autoFixAction: () => translatedText + num
      });
    }
  });
}

// 10. Punctuation Validation - CROWDIN DOESN'T ALLOW
function validatePunctuation(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  const originalPunct = (originalText.match(/[.,!?;:]/g) || []) as string[];
  const translatedPunct = (translatedText.match(/[.,!?;:]/g) || []) as string[];

  originalPunct.forEach((punct: string) => {
    if (!translatedPunct.includes(punct)) {
      warnings.push({
        type: 'missing_punctuation',
        message: `Missing punctuation "${punct}"`,
        severity: 'warning',
        originalText,
        translatedText,
        canAutoFix: false, // Crowdin doesn't allow punctuation auto-fix
        autoFixDescription: `Add punctuation "${punct}"`,
        autoFixAction: () => translatedText + punct
      });
    }
  });
}

// 11. Length Validation - CROWDIN DOESN'T ALLOW
function validateLength(originalText: string, translatedText: string, warnings: ValidationWarning[]) {
  // Disabled: do nothing
}

// Computed properties for auto-fix functionality
const hasAutoFixableIssues = computed(() => {
  return warnings.value.some(warning => warning.canAutoFix);
});

// Check if we should show auto-fix button based on mode
const shouldShowAutoFixButton = computed(() => {
  return props.mode === 'auto-fixable' && hasAutoFixableIssues.value;
});

// Check if we should show skip button (only for auto-fixable issues)
const shouldShowSkipButton = computed(() => {
  return props.mode === 'auto-fixable' && hasAutoFixableIssues.value;
});

function getWarningIcon(severity: string): string {
  return severity === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-exclamation-circle';
}

function handleOverlayClick() {
  emit('close');
}

function handleSaveAnyway() {
  emit('save-anyway');
}

function handleSkip() {
  emit('skip');
}

function handleAutoFixSingle(warning: ValidationWarning, index: number) {
  emit('auto-fix', warning, index);
}

function handleAutoFix() {
  emit('auto-fix');
}
</script>

<style scoped>
.validation-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding-top: 0.5rem;
  pointer-events: none;
}

.validation-dialog {
  background: #1e293b;
  border: 2px solid #fbbf24;
  border-radius: 8px;
  padding: 0;
  max-width: 380px;
  width: auto;
  min-height: auto;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  margin-top: 0.5rem;
  animation: slideDown 0.2s ease-out;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: #1e293b;
  border-bottom: 1px solid #475569;
  flex-shrink: 0;
}

.validation-header h3 {
  margin: 0;
  color: #fbbf24;
  font-size: 0.85rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

.validation-content {
  padding: 0.75rem;
  max-height: 50vh;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* Responsive design for smaller screens */
@media (max-width: 768px) {
  .validation-dialog {
    max-width: 95%;
    margin-top: 0.5rem;
    min-height: auto;
    max-height: 85vh;
  }

  .validation-content {
    max-height: 40vh;
    padding: 0.5rem;
  }

  .validation-header {
    padding: 0.5rem;
  }

  .validation-actions {
    padding: 0.5rem;
    gap: 0.3rem;
  }

  .btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    min-width: 70px;
  }
}

.no-warnings {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #10b981;
  font-size: 1.1rem;
}

.no-warnings i {
  font-size: 1.5rem;
}

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 2px solid;
  margin-bottom: 0.3rem;
}

.warning-item.warning {
  background: rgba(251, 191, 36, 0.1);
  border-left-color: #fbbf24;
  color: #fbbf24;
}

.warning-item.error {
  background: rgba(239, 68, 68, 0.1);
  border-left-color: #ef4444;
  color: #ef4444;
}

.warning-item i {
  font-size: 0.85rem;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.warning-item span {
  line-height: 1.3;
  font-size: 0.8rem;
  flex: 1;
}

.validation-actions {
  display: flex;
  gap: 0.3rem;
  padding: 0.5rem;
  background: #0f172a;
  border-top: 1px solid #475569;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.btn {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 3px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  flex: 1;
  min-width: 70px;
}

.btn-autofix {
  background: #10b981;
  color: white;
  flex: 1;
}

.btn-autofix:hover:not(:disabled) {
  background: #059669;
}

.btn-autofix:disabled {
  background: #475569;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-skip {
  background: #6b7280;
  color: white;
  flex: 1;
}

.btn-skip:hover {
  background: #4b5563;
}

.btn-primary {
  background: #7c5dfa;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #5f43ea;
}

.btn-primary:disabled {
  background: #475569;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-secondary {
  background: #475569;
  color: #e2e8f0;
  flex: 1;
}

.btn-secondary:hover {
  background: #64748b;
}

.auto-fix-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 2px;
  padding: 0.15rem 0.3rem;
  cursor: pointer;
  font-size: 0.65rem;
  margin-left: 0.3rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.auto-fix-btn:hover {
  background: #059669;
}

/* Scrollbar styling */
.validation-content::-webkit-scrollbar {
  width: 6px;
}

.validation-content::-webkit-scrollbar-track {
  background: #1e293b;
}

.validation-content::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

.validation-content::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Ensure buttons are always visible */
.validation-actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
}
</style>
