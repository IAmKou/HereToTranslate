/**
 * Utility functions for calculating word count from various file types
 */

/**
 * Calculate word count from text content
 * @param text - The text content to count words from
 * @returns number of words
 */
export function countWordsInText(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and split by whitespace
  const words = text.trim().split(/\s+/);
  
  // Filter out empty strings
  return words.filter(word => word.length > 0).length;
}

/**
 * Calculate word count from file buffer based on file type
 * @param fileBuffer - The file buffer
 * @param mimeType - The MIME type of the file
 * @param fileName - The name of the file
 * @returns Promise<number> - number of words
 */
export async function countWordsInFile(
  fileBuffer: Buffer, 
  mimeType: string, 
  fileName: string
): Promise<number> {
  try {
    // Handle text files
    if (mimeType.startsWith('text/') || 
        mimeType === 'application/json' ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.csv')) {
      const text = fileBuffer.toString('utf-8');
      return countWordsInText(text);
    }

    // Handle Microsoft Word documents (.docx)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')) {
      // For now, return estimated word count based on file size
      // In a production environment, you'd want to use a library like 'mammoth' to extract text
      return Math.floor(fileBuffer.length / 6); // Rough estimate: 6 bytes per word
    }

    // Handle PDF files
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For now, return estimated word count based on file size
      // In a production environment, you'd want to use a library like 'pdf-parse'
      return Math.floor(fileBuffer.length / 8); // Rough estimate: 8 bytes per word for PDF
    }

    // Handle other document formats
    if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
      // Rough estimate for .doc files
      return Math.floor(fileBuffer.length / 7);
    }

    // For unsupported file types, return 0
    return 0;
  } catch (error) {
    console.error('Error calculating word count for file:', error);
    return 0;
  }
}

/**
 * Calculate total word count from multiple files
 * @param files - Array of file objects with buffer, mimeType, and fileName
 * @returns Promise<number> - total word count
 */
export async function calculateTotalWordCount(
  files: Array<{ buffer: Buffer; mimeType: string; fileName: string }>
): Promise<number> {
  let totalWords = 0;

  for (const file of files) {
    const wordCount = await countWordsInFile(file.buffer, file.mimeType, file.fileName);
    totalWords += wordCount;
  }

  return totalWords;
}
