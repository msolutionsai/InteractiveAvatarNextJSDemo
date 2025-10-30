/**
 * 🎨 Chroma Key — suppression du vert Heygen + fond flottant naturel
 * Corrige les résidus verts (#0f3d0f) et garde un fond noir semi-transparent.
 * Compatible avec le SDK Heygen Streaming Avatar.
 */

export function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: {
    minHue?: number;
    maxHue?: number;
    minSaturation?: number;
    threshold?: number;
    transparencyLevel?: number;
    softness?: number; // flou des bords
    backgroundColor?: string;
  } = {}
): void {
  const {
    minHue = 40, // étend la détection du vert clair au vert foncé
    maxHue = 190,
    minSaturation = 0.1,
    threshold = 1.0,
    transparencyLevel = 70, // 0–255 : plus haut = plus transparent
    softness = 2,
    backgroundColor = "rgba(0,0,0,0.35)", // voile noir semi-transparent
  } = options;

  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  });
  if (!ctx || sourceVideo.readyState < 2) return;

  // ✅ empêche le traitement sur frame vide
  if (sourceVideo.videoWidth === 0 || sourceVideo.videoHeight === 0) return;

  targetCanvas.width = sourceVideo.videoWidth;
  targetCanvas.height = sourceVideo.videoHeight;

  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = frame.data;

  // suppression du vert
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
      h >= minHue &&
      h <= maxHue &&
      s > minSaturation &&
      v > 0.15 &&
      g > r * threshold &&
      g > b * threshold;

    // 💫 Pixels verts → transparents
    if (isGreen) data[i + 3] = transparencyLevel;
  }

  ctx.putImageData(frame, 0, 0);

  // 💫 flou doux sur les bords
  if (softness > 0) {
    ctx.filter = `blur(${softness}px)`;
    ctx.drawImage(targetCanvas, 0, 0);
    ctx.filter = "none";
  }

  // 💫 ajoute un fond noir semi-transparent (visible sur fond violet)
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctx.globalCompositeOperation = "source-over";
}

/**
 * 🚀 Boucle de rendu continue — chroma key temps réel
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

  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
  };
}
