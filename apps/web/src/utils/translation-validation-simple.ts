export interface ValidationIssue {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  category: 'formatting' | 'length' | 'punctuation' | 'capitalization' | 'consistency' | 'quality';
  severity: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  autoFix?: () => string;
  originalText: string;
  translatedText: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  canAutoFix: boolean;
}

export class TranslationValidator {
  private originalText: string;
  private translatedText: string;
  private language: string;

  constructor(originalText: string, translatedText: string, language: string = 'en') {
    this.originalText = originalText;
    this.translatedText = translatedText;
    this.language = language;
  }

  validate(): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Capitalization validation
    const capitalizationIssues = this.validateCapitalization();
    issues.push(...capitalizationIssues);

    // 2. Length validation
    const lengthIssues = this.validateLength();
    issues.push(...lengthIssues);

    // 3. Punctuation validation
    const punctuationIssues = this.validatePunctuation();
    issues.push(...punctuationIssues);

    // 4. Formatting validation
    const formattingIssues = this.validateFormatting();
    issues.push(...formattingIssues);

    // 5. Consistency validation
    const consistencyIssues = this.validateConsistency();
    issues.push(...consistencyIssues);

    const hasErrors = issues.some(issue => issue.type === 'error');
    const hasWarnings = issues.some(issue => issue.type === 'warning');
    const canAutoFix = issues.some(issue => issue.autoFixable);

    return {
      issues,
      hasErrors,
      hasWarnings,
      canAutoFix
    };
  }

  private validateCapitalization(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.translatedText || !this.originalText) return issues;

    // Check if original starts with uppercase and translation doesn't - DISABLED per user request
    // Removed uppercase validation as requested

    // Check if original is all caps and translation isn't
    const originalIsAllCaps = this.originalText === this.originalText.toUpperCase() &&
      this.originalText.length > 1 &&
      /[A-Z]/.test(this.originalText);
    const translatedIsAllCaps = this.translatedText === this.translatedText.toUpperCase() &&
      this.translatedText.length > 1 &&
      /[A-Z]/.test(this.translatedText);

    if (originalIsAllCaps && !translatedIsAllCaps) {
      issues.push({
        id: 'capitalization_all_caps',
        type: 'warning',
        message: 'Original text is all caps, translation should match',
        category: 'capitalization',
        severity: 'medium',
        autoFixable: true,
        autoFix: () => this.translatedText.toUpperCase(),
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    return issues;
  }

  private validateLength(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.translatedText || !this.originalText) return issues;

    const originalLength = this.originalText.trim().length;
    const translatedLength = this.translatedText.trim().length;

    if (originalLength === 0 || translatedLength === 0) return issues;

    const lengthRatio = translatedLength / originalLength;

    // Check for extremely short translations (likely incomplete)
    if (lengthRatio < 0.1) {
      issues.push({
        id: 'length_too_short',
        type: 'error',
        message: `The translation length differs significantly from the source text (${Math.round(lengthRatio * 100)}% of original length).`,
        category: 'length',
        severity: 'high',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    // Check for extremely long translations (might be over-translation)
    if (lengthRatio > 3) {
      issues.push({
        id: 'length_too_long',
        type: 'warning',
        message: `Translation is much longer than original (${Math.round(lengthRatio * 100)}% of original length).`,
        category: 'length',
        severity: 'medium',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    // Check for very short translations that might be incomplete
    if (translatedLength < 2 && originalLength > 5) {
      issues.push({
        id: 'length_incomplete',
        type: 'error',
        message: 'Translation appears to be incomplete',
        category: 'length',
        severity: 'high',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    return issues;
  }

  private validatePunctuation(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.translatedText || !this.originalText) return issues;

    // Check for missing ending punctuation
    const originalEndsWithPunct = /[.!?;:]$/.test(this.originalText.trim());
    const translatedEndsWithPunct = /[.!?;:]$/.test(this.translatedText.trim());

    if (originalEndsWithPunct && !translatedEndsWithPunct) {
      const lastChar = this.originalText.trim().slice(-1);
      issues.push({
        id: 'punctuation_missing_end',
        type: 'warning',
        message: `Translation should end with punctuation mark (${lastChar})`,
        category: 'punctuation',
        severity: 'low',
        autoFixable: true,
        autoFix: () => this.translatedText.trim() + lastChar,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    // Check for extra punctuation
    if (!originalEndsWithPunct && translatedEndsWithPunct) {
      issues.push({
        id: 'punctuation_extra_end',
        type: 'warning',
        message: 'Original text doesn\'t end with punctuation, translation shouldn\'t either',
        category: 'punctuation',
        severity: 'low',
        autoFixable: true,
        autoFix: () => this.translatedText.trim().replace(/[.!?;:]$/, ''),
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    return issues;
  }

  private validateFormatting(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.translatedText || !this.originalText) return issues;

    // Check for HTML tags consistency
    const originalHtmlTags = this.extractHtmlTags(this.originalText);
    const translatedHtmlTags = this.extractHtmlTags(this.translatedText);

    if (originalHtmlTags.length !== translatedHtmlTags.length) {
      issues.push({
        id: 'formatting_html_tags',
        type: 'error',
        message: 'HTML tags count mismatch between original and translation',
        category: 'formatting',
        severity: 'high',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    // Check for placeholder consistency (e.g., {0}, {1}, etc.)
    const originalPlaceholders = this.extractPlaceholders(this.originalText);
    const translatedPlaceholders = this.extractPlaceholders(this.translatedText);

    if (originalPlaceholders.length !== translatedPlaceholders.length) {
      issues.push({
        id: 'formatting_placeholders',
        type: 'error',
        message: 'Placeholder count mismatch between original and translation',
        category: 'formatting',
        severity: 'high',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    // Check for number formatting consistency
    const originalNumbers = this.extractNumbers(this.originalText);
    const translatedNumbers = this.extractNumbers(this.translatedText);

    if (originalNumbers.length !== translatedNumbers.length) {
      issues.push({
        id: 'formatting_numbers',
        type: 'warning',
        message: 'Number count mismatch - ensure all numbers are preserved',
        category: 'formatting',
        severity: 'medium',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    return issues;
  }

  private validateConsistency(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.translatedText || !this.originalText) return issues;

    // Check for repeated words that might indicate copy-paste errors
    const words = this.translatedText.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();

    words.forEach(word => {
      if (word.length > 3) { // Only check words longer than 3 characters
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    const repeatedWords = Array.from(wordCount.entries())
      .filter(([_, count]) => count > 2)
      .map(([word, count]) => ({ word, count }));

    if (repeatedWords.length > 0) {
      issues.push({
        id: 'consistency_repeated_words',
        type: 'warning',
        message: `Repeated words detected: ${repeatedWords.map(w => `${w.word} (${w.count}x)`).join(', ')}`,
        category: 'consistency',
        severity: 'medium',
        autoFixable: false,
        originalText: this.originalText,
        translatedText: this.translatedText
      });
    }

    return issues;
  }

  private extractHtmlTags(text: string): string[] {
    const htmlTagRegex = /<[^>]+>/g;
    return text.match(htmlTagRegex) || [];
  }

  private extractPlaceholders(text: string): string[] {
    const placeholderRegex = /\{[0-9]+\}/g;
    return text.match(placeholderRegex) || [];
  }

  private extractNumbers(text: string): string[] {
    const numberRegex = /\b\d+(?:\.\d+)?\b/g;
    return text.match(numberRegex) || [];
  }

  // Auto-fix all fixable issues
  autoFixAll(): string {
    const result = this.validate();
    let fixedText = this.translatedText;

    // Apply fixes in order of severity (high to low)
    const sortedIssues = result.issues
      .filter(issue => issue.autoFixable)
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

    for (const issue of sortedIssues) {
      if (issue.autoFix) {
        fixedText = issue.autoFix();
      }
    }

    return fixedText;
  }

  // Get summary of validation issues
  getSummary(): string {
    const result = this.validate();
    const errorCount = result.issues.filter(i => i.type === 'error').length;
    const warningCount = result.issues.filter(i => i.type === 'warning').length;
    const autoFixableCount = result.issues.filter(i => i.autoFixable).length;

    if (errorCount === 0 && warningCount === 0) {
      return 'No issues found';
    }

    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    if (autoFixableCount > 0) parts.push(`${autoFixableCount} auto-fixable`);

    return parts.join(', ');
  }
}

// Utility function to create validator instance
export function createTranslationValidator(
  originalText: string,
  translatedText: string,
  language: string = 'en'
): TranslationValidator {
  return new TranslationValidator(originalText, translatedText, language);
}
