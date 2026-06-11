/**
 * Compresses an image file using the Canvas API before upload.
 * @param {File} file - The original image file
 * @param {Object} options
 * @param {number} options.maxWidth - Max width in px (default: 1200)
 * @param {number} options.maxHeight - Max height in px (default: 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.75)
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down proportionally
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback: return original if something goes wrong
    };

    img.src = url;
  });
}