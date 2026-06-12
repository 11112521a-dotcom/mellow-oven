/**
 * Utility for client-side image compression using HTML5 Canvas
 */

export interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0 to 1
    type?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Compresses an image file and returns a smaller File object.
 * Greatly reduces file size for quick uploading.
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.8,
        type = 'image/webp'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let { width, height } = img;

                // Calculate aspect ratio and new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                // Create canvas and draw image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob failed'));
                            return;
                        }

                        // Create a new File from the Blob
                        const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
                        // Keep original name but change extension
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        const newFile = new File([blob], `${baseName}_compressed.${extension}`, {
                            type,
                            lastModified: Date.now()
                        });

                        resolve(newFile);
                    },
                    type,
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
