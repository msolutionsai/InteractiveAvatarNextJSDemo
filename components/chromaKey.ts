/**
 * 🎨 Chroma Key avec fond semi-transparent
 * Supprime le vert et remplace par une transparence partielle (effet "flottant").
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
    backgroundColor?: string; // 🆕 couleur de fond (semi-transparente)
    transparencyLevel?: number; // 🆕 niveau de transparence (0-255)
  } = {}
): void {
  const {
    minHue = 60,
    maxHue = 180,
    minSaturation = 0.1,
    threshold = 1.0,
    backgroundColor = "rgba(0,0,0,0.3)", // ✅ fond noir semi-transparent
    transparencyLevel = 60, // ✅ opacité résiduelle pour le vert
  } = options;

  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  });

  if (!ctx || sourceVideo.readyState < 2) return;

  // Synchronise dimensions vidéo/canvas
  targetCanvas.width = sourceVideo.videoWidth;
  targetCanvas.height = sourceVideo.videoHeight;

  // Capture frame
  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = frame.data;

  // Parcours pixels
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

    if (isGreen) {
      // 💫 Semi-transparence du vert
      data[i + 3] = transparencyLevel; // 0 = transparent / 255 = opaque
    }
  }

  ctx.putImageData(frame, 0, 0);

  // 💫 Ajoute un fond semi-transparent doux (visible à travers l’iframe)
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctx.globalCompositeOperation = "source-over";
}

/**
 * 🚀 Boucle continue (rafraîchit le rendu chroma key en temps réel)
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

  // ✅ Fonction de nettoyage
  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
  };
}
