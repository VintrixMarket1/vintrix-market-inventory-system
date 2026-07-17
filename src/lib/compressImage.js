/**
 * Compresses an image file using createImageBitmap (preferred) or Canvas API fallback.
 * Optimized for weak mobile devices — auto-detects mobile and uses smaller dimensions,
 * more aggressive JPEG quality, and explicit memory cleanup (bitmap.close, canvas resize to 0).
 * @param {File} file - The original image file
 * @param {Object} options
 * @param {number} options.maxWidth - Max width in px (default: 800)
 * @param {number} options.maxHeight - Max height in px (default: 800)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.6)
 * @returns {Promise<File>} Compressed file (or original on failure/timeout)
 */
function detectMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768;
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
  return isMobileUA || isSmallScreen || !!lowMem;
}

export async function compressImage(file, { maxWidth = 800, maxHeight = 800, quality = 0.6 } = {}) {
  // Auto-detect weak mobile devices and use more aggressive params
  const isMobile = detectMobile();
  if (isMobile) {
    maxWidth = Math.min(maxWidth, 640);
    maxHeight = Math.min(maxHeight, 640);
    quality = Math.min(quality, 0.5);
  }

  // Fallback timeout — if canvas/toBlob hangs (OOM on mobile), resolve with original
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(file);
      }
    }, 10000);

    const finish = (result) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }
    };

    // Prefer createImageBitmap — more memory-efficient than HTMLImageElement + object URL
    if (typeof createImageBitmap === "function" && !file.type.includes("gif")) {
      createImageBitmap(file, { resizeWidth: maxWidth, resizeHeight: maxHeight, resizeQuality: "medium" })
        .then((bitmap) => {
          try {
            let { width, height } = bitmap;
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();

            canvas.toBlob(
              (blob) => {
                canvas.width = 0;
                canvas.height = 0;
                finish(blob ? new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }) : file);
              },
              "image/jpeg",
              quality
            );
          } catch (err) {
            try { bitmap.close(); } catch (e) {}
            finish(file);
          }
        })
        .catch(() => {
          compressViaImage(file, { maxWidth, maxHeight, quality }, finish);
        });
      return;
    }

    // Fallback: Image + object URL + Canvas
    compressViaImage(file, { maxWidth, maxHeight, quality }, finish);
  });
}

function compressViaImage(file, { maxWidth, maxHeight, quality }, done) {
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
      img.src = "";

      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          done(blob ? new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }) : file);
        },
        "image/jpeg",
        quality
      );
    } catch (err) {
      done(file);
    }
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    done(file);
  };

  img.src = url;
}