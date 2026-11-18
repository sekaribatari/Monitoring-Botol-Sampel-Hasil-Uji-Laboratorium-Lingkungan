export interface CompressedImageResult {
  dataUrl: string;
  fileName: string;
  sizeKb: number;
}

const MAX_DATA_URL_LENGTH = 260000;

export function compressImageFile(file: File): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`File "${file.name}" bukan gambar yang valid.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca file "${file.name}".`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`Gambar "${file.name}" tidak dapat diproses.`));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia di peramban ini.'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          // Scale down once more for ultra-high-res photos
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.65);
          smallCanvas.height = Math.round(height * 0.65);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.fillStyle = '#ffffff';
            smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
            smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.65);
          }
        }

        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          reject(
            new Error(
              `Ukuran gambar "${file.name}" masih terlalu besar setelah kompresi. Gunakan foto di bawah 250 KB.`
            )
          );
          return;
        }

        resolve({
          dataUrl,
          fileName: file.name.slice(0, 120),
          sizeKb: Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024)),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
