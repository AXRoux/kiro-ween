import { H, W } from "./motion";

/** Opens the camera, preferring the one facing away from the user (phones) and a sharp picture for wrappers. */
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError("unsupported");
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    throw new CameraError(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "missing" : "failed");
  }
}

export class CameraError extends Error {
  constructor(readonly reason: "unsupported" | "denied" | "missing" | "failed") {
    super(reason);
  }
}

/** Tiny frames for the stillness detector. */
export class FrameSampler {
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
  }
  sample(video: HTMLVideoElement): Uint8ClampedArray | null {
    if (video.readyState < 2) return null;
    this.ctx.drawImage(video, 0, 0, W, H);
    return this.ctx.getImageData(0, 0, W, H).data;
  }
}

/** One frame as a JPEG data URL, longest side `max` pixels (Requirement 3.4: one frame, downscaled, never stored). */
export function captureJpeg(video: HTMLVideoElement, max = 768, quality = 0.82): string {
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
