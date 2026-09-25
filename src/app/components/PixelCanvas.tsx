// Crisp pixel-art display. Every image pixel covers a whole number of *device* pixels, so art stays sharp even at
// fractional display scaling (125 %, 150 % …). Pixels are only drawn here — never read back — so the canvas can't
// alter them.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

import type { RgbaImage } from "../../core/index.ts";
import { cn } from "../lib/cn.ts";

export interface OverlayContext {
  readonly ctx: CanvasRenderingContext2D;
  /** device pixels per image pixel */
  readonly scale: number;
  /** device pixels per CSS pixel */
  readonly dpr: number;
}

export interface CanvasPointer {
  /** image pixel coordinates (fractional) */
  readonly x: number;
  readonly y: number;
  readonly buttons: number;
  readonly altKey: boolean;
}

interface Props {
  image: RgbaImage;
  /** CSS pixels per image pixel (integer); the backing store rounds it to whole device pixels */
  zoom: number;
  overlay?: (o: OverlayContext) => void;
  onPointer?: (p: CanvasPointer | null, type: "down" | "move" | "up" | "leave") => void;
  className?: string;
  label: string;
}

function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  useEffect(() => {
    // fires on browser zoom and when the window moves to a display with another scale
    const onResize = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return dpr;
}

export function PixelCanvas({ image, zoom, overlay, onPointer, className, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = useDevicePixelRatio();
  const scale = Math.max(1, Math.round(zoom * dpr));

  // the image at 1:1, reused by every redraw
  const bitmap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d");
    if (ctx && image.width > 0 && image.height > 0) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
    }
    return c;
  }, [image]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    overlay?.({ ctx, scale, dpr });
  }, [bitmap, image, scale, dpr, overlay]);

  const toPointer = (e: ReactPointerEvent<HTMLCanvasElement>): CanvasPointer => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * image.width,
      y: ((e.clientY - rect.top) / rect.height) * image.height,
      buttons: e.buttons,
      altKey: e.altKey,
    };
  };

  return (
    <canvas
      ref={ref}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a canvas has no <img> equivalent; role + label name it
      role="img"
      aria-label={label}
      className={cn("checker block [image-rendering:pixelated]", className)}
      style={{ width: (image.width * scale) / dpr, height: (image.height * scale) / dpr }}
      onPointerDown={
        onPointer &&
        ((e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onPointer(toPointer(e), "down");
        })
      }
      onPointerMove={onPointer && ((e) => onPointer(toPointer(e), "move"))}
      onPointerUp={onPointer && ((e) => onPointer(toPointer(e), "up"))}
      onPointerLeave={onPointer && (() => onPointer(null, "leave"))}
      onContextMenu={onPointer && ((e) => e.preventDefault())}
    />
  );
}

/**
 * Largest zoom (CSS px per image px) at which an image fits a box, in whole *device* pixels per image pixel — so on a
 * 2× display the fit can be 1.5×, 2.5× … and still be crisp. Never below one device pixel per image pixel.
 */
export function fitZoom(
  image: { width: number; height: number },
  box: { width: number; height: number },
  max = 16,
  dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
): number {
  if (!image.width || !image.height || box.width <= 0 || box.height <= 0) return 1;
  const k = Math.floor(Math.min((box.width * dpr) / image.width, (box.height * dpr) / image.height));
  return Math.max(1, Math.min(Math.round(max * dpr), k)) / dpr;
}

/** Tracks an element's content size. */
export function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
