'use client';

// Préparation de la photo de l'ordonnance, entièrement dans le navigateur :
//   1. décodage (orientation de l'appareil photo appliquée) ou conversion
//      d'un PDF en image (pdf.js, chargé seulement si besoin) ;
//   2. découpage : seule la zone gardée par le patient est conservée ;
//   3. allègement : grand côté ramené à 1 600 px au plus, JPEG, moins de
//      400 Ko. Les réseaux mobiles sont lents et chers.
// Seule l'image découpée et allégée part sur Internet.

const MAX_SIDE = 1600;
export const TARGET_BYTES = 400_000;

export class PhotoFormatError extends Error {}

/** Zone gardée, en fractions de l'image (0 à 1). */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bande centrale : les noms sont en général en haut, le cachet en bas. */
export const DEFAULT_BAND: CropRect = { x: 0.04, y: 0.25, w: 0.92, h: 0.5 };

export type Source = ImageBitmap | HTMLCanvasElement;

export function sourceSize(src: Source): { width: number; height: number } {
  return { width: src.width, height: src.height };
}

export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoFormatError('decode');
  }
}

/** Première page d'un PDF, rendue en image. Renvoie aussi le nombre de pages. */
export async function renderPdf(
  file: Blob,
  pageNumber = 1,
): Promise<{ canvas: HTMLCanvasElement; pages: number }> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await task.promise;
    const page = await doc.getPage(Math.min(Math.max(pageNumber, 1), doc.numPages));
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, MAX_SIDE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoFormatError('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const pages = doc.numPages;
    await task.destroy();
    return { canvas, pages };
  } catch (err) {
    if (err instanceof PhotoFormatError) throw err;
    throw new PhotoFormatError('pdf');
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Découpe la zone gardée et l'allège sous 400 Ko. */
export async function cropAndCompress(src: Source, rect: CropRect): Promise<Blob> {
  const { width, height } = sourceSize(src);
  const sx = Math.round(rect.x * width);
  const sy = Math.round(rect.y * height);
  const sw = Math.max(1, Math.round(rect.w * width));
  const sh = Math.max(1, Math.round(rect.h * height));
  let scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoFormatError('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.6]) {
      const blob = await toBlob(canvas, quality);
      if (!blob) throw new PhotoFormatError('encode');
      if (blob.size <= TARGET_BYTES) return blob;
    }
    scale *= 0.75;
  }
  throw new PhotoFormatError('size');
}

/** Image affichable (aperçu) d'une source, sans la modifier. */
export async function previewUrl(src: Source): Promise<string> {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1200 / Math.max(src.width, src.height));
  canvas.width = Math.round(src.width * scale);
  canvas.height = Math.round(src.height * scale);
  canvas.getContext('2d')?.drawImage(src, 0, 0, canvas.width, canvas.height);
  const blob = await toBlob(canvas, 0.8);
  if (!blob) throw new PhotoFormatError('encode');
  return URL.createObjectURL(blob);
}

export function releaseSource(src: Source | null): void {
  if (src && 'close' in src) src.close();
  if (src && src instanceof HTMLCanvasElement) {
    src.width = 0;
    src.height = 0;
  }
}
