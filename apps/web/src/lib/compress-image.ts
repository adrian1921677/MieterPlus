const MAX_WIDTH = 1600;
const QUALITY = 0.7;

/**
 * Komprimiert eine Bilddatei im Browser vor dem Upload:
 * skaliert auf max. 1600px Breite herunter (kein Hochskalieren) und
 * speichert als JPEG (70 %). Spart Storage, Upload-Zeit und Bandbreite.
 *
 * Nicht-Bilder (z. B. PDF) und nicht decodierbare Formate (z. B. HEIC) werden
 * unverändert zurückgegeben. Wird das Ergebnis nicht kleiner, bleibt das Original.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // keine Verbesserung → Original behalten

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
