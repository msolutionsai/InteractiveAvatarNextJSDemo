/**
 * 🎨 Chroma Key (fond transparent réel pour vidéo Heygen)
 * Supprime automatiquement le vert pour créer un fond transparent.
 * Compatible avec le SDK Heygen Streaming Avatar.
 */

export function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: {
    minHue: number;
    maxHue: number;
    minSaturation: number;
    threshold: number;
  } = {
    minHue: 60,       // teinte min (vert clair)
    maxHue: 180,      // teinte max (vert foncé)
    minSaturation: 0.1,
    threshold: 1.0,
  }
): void {
  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true, // ✅ autorise la transparence
  });
  if (!ctx || sourceVideo.readyState < 2) return;

  // Dimensions canvas = dimensions vidéo
  targetCanvas.width = sourceVideo.videoWidth;
  targetCanvas.height = sourceVideo.videoHeight;

  // Capture du frame actuel
  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = frame.data;

  // Parcours de tous les pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;

    const isGreen =
      h >= options.minHue &&
      h <= options.maxHue &&
      s > options.minSaturation &&
      v > 0.15 &&
      g > r * options.threshold &&
      g > b * options.threshold;

    // ✅ On rend le pixel transparent s’il est vert
    if (isGreen) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(frame, 0, 0);
}

/**
 * 🚀 Boucle continue pour le rendu chroma key
 */
export function setupChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement
): () => void {
  let frameId: number | null = null;

  const render = () => {
    applyChromaKey(sourceVideo, targetCanvas);
    frameId = requestAnimationFrame(render);
  };

  render();

  // ✅ Retourne une fonction d’arrêt pour le cleanup
  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
  };
}
