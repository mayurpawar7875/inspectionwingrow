import { toast } from 'sonner';

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm'
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Validates a file before upload
 * @param file - The file to validate
 * @param options - Validation options
 * @returns true if valid, throws error if invalid
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): boolean {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
    allowedExtensions
  } = options;

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    toast.error(`File too large. Maximum size is ${sizeMB}MB`);
    throw new Error(`File size exceeds ${sizeMB}MB limit`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    toast.error('Invalid file type. Please upload a supported file format');
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Check file extension if specified
  if (allowedExtensions && allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      toast.error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
      throw new Error(`File extension not allowed`);
    }
  }

  return true;
}

/**
 * Sanitizes a filename to prevent path traversal and injection attacks
 * @param filename - The original filename
 * @returns sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255); // Limit filename length
}

/**
 * Generates a safe upload path for a file
 * @param userId - User ID
 * @param originalFilename - Original filename
 * @param prefix - Optional path prefix
 * @returns sanitized upload path
 */
export function generateUploadPath(
  userId: string,
  originalFilename: string,
  prefix: string = ''
): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const basePath = `${userId}/${timestamp}-${sanitized}`;
  return prefix ? `${prefix}/${basePath}` : basePath;
}

/**
 * Validates an image file
 */
export function validateImage(file: File): boolean {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp']
  });
}

/**
 * Validates a video file
 */
export function validateVideo(file: File): boolean {
  return validateFile(file, {
    maxSize: MAX_VIDEO_SIZE,
    allowedTypes: ALLOWED_VIDEO_TYPES,
    allowedExtensions: ['mp4', 'mov', 'avi', 'webm']
  });
}

/**
 * Validates a document file
 */
export function validateDocument(file: File): boolean {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
    allowedExtensions: ['pdf', 'doc', 'docx']
  });
}
