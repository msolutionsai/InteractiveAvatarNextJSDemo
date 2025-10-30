/**
 * 🎨 Chroma Key — suppression du vert Heygen + fond noir propre
 * Supprime le vert (#0f3d0f) et applique un fond noir stable (optionnellement semi-transparent).
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
    softness?: number; // flou léger
    backgroundColor?: string;
  } = {}
): void {
  const {
    minHue = 45, // spectre vert équilibré
    maxHue = 185,
    minSaturation = 0.12,
    threshold = 1.0,
    transparencyLevel = 0, // 0 = totalement transparent
    softness = 1, // flou minimal pour éviter les bords durs
    backgroundColor = "rgba(0,0,0,0.9)", // ✅ fond noir quasi opaque
  } = options;

  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  });

  if (!ctx || sourceVideo.readyState < 2) return;
  if (sourceVideo.videoWidth === 0 || sourceVideo.videoHeight === 0) return;

  // Ajuste la taille du canvas à celle de la vidéo
  targetCanvas.width = sourceVideo.videoWidth;
  targetCanvas.height = sourceVideo.videoHeight;

  // Dessine la frame
  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = frame.data;

  // Suppression du vert
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

    // 💫 Pixels verts → transparents (supprimés)
    if (isGreen) data[i + 3] = transparencyLevel;
  }

  ctx.putImageData(frame, 0, 0);

  // 💫 Lissage léger pour transitions plus propres
  if (softness > 0) {
    ctx.filter = `blur(${softness}px)`;
    ctx.drawImage(targetCanvas, 0, 0);
    ctx.filter = "none";
  }

  // 💫 Fond noir fixe (aucun voile ni effet gris)
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = backgroundColor; // noir opaque ou semi-transparent
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
