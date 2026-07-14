/**
 * Compresses an image file using the Canvas API before upload.
 * Optimized for weak mobile devices — smaller dimensions, explicit cleanup.
 * @param {File} file - The original image file
 * @param {Object} options
 * @param {number} options.maxWidth - Max width in px (default: 1024)
 * @param {number} options.maxHeight - Max height in px (default: 1024)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.7)
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, { maxWidth = 800, maxHeight = 800, quality = 0.6 } = {}) {
  // Fallback timeout — if canvas/toBlob hangs (OOM on mobile), resolve with original
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(file);
      }
    }, 15000);

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            canvas.width = 0;
            canvas.height = 0;
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              if (blob) {
                resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
              } else {
                resolve(file);
              }
            }
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(file);
        }
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(file);
      }
    };

    img.src = url;
  });
}