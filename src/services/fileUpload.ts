/**
 * Firebase Storage Upload Service
 * 
 * Handles file uploads to Firebase Storage for user-generated content
 * (avatars, banners, media, etc.)
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

interface UploadOptions {
    onProgress?: (progress: number) => void;
    metadata?: {
        contentType?: string;
        customMetadata?: Record<string, string>;
    };
}

interface UploadResult {
    downloadURL: string;
    path: string;
    filename: string;
}

/**
 * Upload a file to Firebase Storage
 * @param file - File object or Buffer
 * @param path - Storage path (e.g., 'users/123/avatar')
 * @param filename - Filename
 * @param options - Upload options including progress callback
 */
export async function uploadToFirebase(
    file: File | Buffer,
    path: string,
    filename: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    try {
        // Create unique filename with timestamp
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}_${filename}`;
        const fullPath = `${path}/${uniqueFilename}`;

        // Create storage reference
        const storageRef = ref(storage, fullPath);

        // Prepare file data
        let fileData: Blob | Uint8Array;
        if (file instanceof File) {
            fileData = file;
        } else {
            fileData = new Uint8Array(file);
        }

        // Start upload
        const uploadTask = uploadBytesResumable(storageRef, fileData, options.metadata);

        // Return promise that resolves with download URL
        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Calculate progress percentage
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

                    // Call progress callback if provided
                    if (options.onProgress) {
                        options.onProgress(Math.round(progress));
                    }

                    console.log(`Upload progress: ${progress.toFixed(2)}%`);
                },
                (error) => {
                    // Handle upload errors
                    console.error('Firebase upload error:', error);
                    reject(new Error(`Upload failed: ${error.message}`));
                },
                async () => {
                    // Upload completed successfully
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                        console.log('✅ File uploaded successfully:', downloadURL);

                        resolve({
                            downloadURL,
                            path: fullPath,
                            filename: uniqueFilename
                        });
                    } catch (error: any) {
                        reject(new Error(`Failed to get download URL: ${error.message}`));
                    }
                }
            );
        });
    } catch (error: any) {
        console.error('Firebase upload initialization error:', error);
        throw new Error(`Failed to initiate upload: ${error.message}`);
    }
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    const result = await uploadToFirebase(
        file,
        `users/${userId}/avatar`,
        file.name,
        {
            onProgress,
            metadata: {
                contentType: file.type,
                customMetadata: {
                    uploadedBy: userId,
                    uploadType: 'avatar'
                }
            }
        }
    );

    return result.downloadURL;
}

/**
 * Upload user banner
 */
export async function uploadBanner(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    const result = await uploadToFirebase(
        file,
        `users/${userId}/banner`,
        file.name,
        {
            onProgress,
            metadata: {
                contentType: file.type,
                customMetadata: {
                    uploadedBy: userId,
                    uploadType: 'banner'
                }
            }
        }
    );

    return result.downloadURL;
}

/**
 * Upload media (videos, screenshots, etc.)
 */
export async function uploadMedia(
    file: File,
    userId: string,
    mediaType: 'video' | 'image' | 'clip',
    onProgress?: (progress: number) => void
): Promise<UploadResult> {
    const result = await uploadToFirebase(
        file,
        `users/${userId}/media/${mediaType}`,
        file.name,
        {
            onProgress,
            metadata: {
                contentType: file.type,
                customMetadata: {
                    uploadedBy: userId,
                    uploadType: mediaType,
                    uploadDate: new Date().toISOString()
                }
            }
        }
    );

    return result;
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFromFirebase(path: string): Promise<void> {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        console.log('✅ File deleted successfully:', path);
    } catch (error: any) {
        console.error('Failed to delete file:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

/**
 * Get file size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
    avatar: 5 * 1024 * 1024, // 5MB
    banner: 10 * 1024 * 1024, // 10MB
    video: 500 * 1024 * 1024, // 500MB
    image: 20 * 1024 * 1024, // 20MB
    clip: 100 * 1024 * 1024 // 100MB
};

/**
 * Allowed MIME types
 */
export const ALLOWED_TYPES = {
    avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    banner: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    clip: ['video/mp4', 'video/webm']
};

/**
 * Validate file before upload
 */
export function validateFile(
    file: File,
    type: keyof typeof FILE_SIZE_LIMITS
): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS[type]) {
        const limitMB = FILE_SIZE_LIMITS[type] / (1024 * 1024);
        return {
            valid: false,
            error: `File size exceeds ${limitMB}MB limit`
        };
    }

    // Check MIME type
    if (!ALLOWED_TYPES[type].includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${ALLOWED_TYPES[type].join(', ')}`
        };
    }

    return { valid: true };
}
