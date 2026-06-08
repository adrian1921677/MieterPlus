import * as ImageManipulator from 'expo-image-manipulator';

export type CompressedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

const MAX_WIDTH = 1600;

/**
 * Komprimiert ein Bild vor dem Upload: skaliert auf max. 1600px Breite
 * herunter (kein Hochskalieren) und speichert als JPEG mit 70 % Qualität.
 * Spart Storage, Upload-Zeit und mobile Daten — typ. 3–4 MB → ~200–400 KB.
 */
export async function compressImage(uri: string, originalWidth?: number): Promise<CompressedImage> {
  const needsResize = !originalWidth || originalWidth > MAX_WIDTH;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    needsResize ? [{ resize: { width: MAX_WIDTH } }] : [],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    uri: result.uri,
    mimeType: 'image/jpeg',
    fileName: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`,
  };
}
