/**
 * Shared File Upload Validation Utility
 * Enforces unified upload restrictions across Create Listing and Edit Listing forms,
 * matching backend BusinessFileService constraints exactly.
 */

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf"];
export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"];

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFile(
    file: File,
    category: "IMAGE" | "DOCUMENT" | "FINANCIAL_REPORT"
): FileValidationResult {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed limit of 20 MB per file.`,
        };
    }

    const lowerName = file.name.toLowerCase();

    if (category === "IMAGE") {
        const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
        if (!hasValidExt) {
            return {
                valid: false,
                error: `File "${file.name}" is not a supported image format. Supported formats: JPG, JPEG, PNG, and WEBP.`,
            };
        }
    } else {
        // DOCUMENT or FINANCIAL_REPORT
        const hasValidExt = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
        if (!hasValidExt) {
            return {
                valid: false,
                error: `File "${file.name}" is not supported. Only PDF documents (.pdf) are accepted for verification and financial records.`,
            };
        }
    }

    return { valid: true };
}
