/** An 8-bit RGBA image with straight (non-premultiplied) alpha. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function createImage(width: number, height: number): RgbaImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 0 || height < 0) {
    throw new RangeError(`invalid image size ${width}x${height}`);
  }
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** Copies a w×h block, replacing the destination pixels (alpha included). Never blends. */
export function copyRect(
  src: RgbaImage,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dst: RgbaImage,
  dx: number,
  dy: number,
): void {
  if (sx < 0 || sy < 0 || sx + w > src.width || sy + h > src.height) {
    throw new RangeError(`source rect ${sx},${sy} ${w}x${h} is outside the ${src.width}x${src.height} image`);
  }
  if (dx < 0 || dy < 0 || dx + w > dst.width || dy + h > dst.height) {
    throw new RangeError(`destination rect ${dx},${dy} ${w}x${h} is outside the ${dst.width}x${dst.height} image`);
  }
  const rowBytes = w * 4;
  for (let y = 0; y < h; y++) {
    const si = ((sy + y) * src.width + sx) * 4;
    const di = ((dy + y) * dst.width + dx) * 4;
    dst.data.set(src.data.subarray(si, si + rowBytes), di);
  }
}

/** Like copyRect, but silently clips the parts that fall outside the destination. */
export function copyRectClipped(
  src: RgbaImage,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dst: RgbaImage,
  dx: number,
  dy: number,
): void {
  const x0 = Math.max(0, -dx);
  const y0 = Math.max(0, -dy);
  const x1 = Math.min(w, dst.width - dx);
  const y1 = Math.min(h, dst.height - dy);
  if (x1 <= x0 || y1 <= y0) return;
  copyRect(src, sx + x0, sy + y0, x1 - x0, y1 - y0, dst, dx + x0, dy + y0);
}

/** True when every pixel of the rect is fully transparent. */
export function isRectTransparent(img: RgbaImage, x: number, y: number, w: number, h: number): boolean {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (img.data[(yy * img.width + xx) * 4 + 3] !== 0) return false;
    }
  }
  return true;
}

export interface ImageDiff {
  /** false when the sizes differ (count and image are then meaningless) */
  readonly sameSize: boolean;
  /** number of differing pixels */
  readonly count: number;
  /** a faded copy of `a` with differing pixels in magenta */
  readonly image: RgbaImage;
}

/** Pixel-exact comparison. Fully transparent pixels compare equal whatever their RGB values. */
export function diffImages(a: RgbaImage, b: RgbaImage): ImageDiff {
  if (a.width !== b.width || a.height !== b.height) {
    return { sameSize: false, count: Math.max(a.width * a.height, b.width * b.height), image: createImage(0, 0) };
  }
  const image = createImage(a.width, a.height);
  let count = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const aa = a.data[i + 3];
    const ba = b.data[i + 3];
    const same =
      (aa === 0 && ba === 0) ||
      (aa === ba && a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2]);
    if (same) {
      const v = Math.round((a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3);
      image.data.set([v, v, v, Math.min(aa, 64)], i);
    } else {
      count++;
      image.data.set([255, 0, 255, 255], i);
    }
  }
  return { sameSize: true, count, image };
}
