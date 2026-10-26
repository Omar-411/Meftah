const MAX_SIDE = 1400;
const JPEG_QUALITY = 0.8;

/**
 * Downsizes a picked photo in the browser and returns a JPEG data URI.
 * TODO(backend): replace with a direct upload to the storage endpoint (see docs/API_CONTRACT.md, "Photos")
 * and keep only the returned URL in the listing.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
