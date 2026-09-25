// PNG <-> RgbaImage with a pure-JS codec. Colour chunks (gAMA, cHRM, iCCP, sRGB) are ignored on purpose: game
// engines use the raw pixel values, and colour-managing them is what shifted palettes in v1.
import { convertIndexedToRgb, decode, encode } from "fast-png";

import { createImage, type RgbaImage } from "./rgba.ts";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((b, i) => bytes[i] === b);
}

export function decodePng(bytes: Uint8Array): RgbaImage {
  if (!isPng(bytes)) throw new Error("not a PNG file");
  const png = decode(bytes);
  const { width, height } = png;
  const out = createImage(width, height);
  const px = width * height;

  if (png.palette) {
    const rgb = convertIndexedToRgb(png);
    const ch = rgb.length / px;
    for (let i = 0; i < px; i++) {
      out.data[i * 4] = rgb[i * ch];
      out.data[i * 4 + 1] = rgb[i * ch + 1];
      out.data[i * 4 + 2] = rgb[i * ch + 2];
      out.data[i * 4 + 3] = ch === 4 ? rgb[i * ch + 3] : 255;
    }
    return out;
  }

  const ch = png.channels;
  const depth = png.depth;
  const max = (1 << depth) - 1;
  const rowBytes = Math.ceil((width * ch * depth) / 8);
  // raw sample value (at the image's bit depth) of channel c of pixel i
  const sample = (i: number, c: number): number => {
    if (depth >= 8) return png.data[i * ch + c];
    const x = i % width;
    const y = (i - x) / width;
    const bit = (x * ch + c) * depth;
    const byte = png.data[y * rowBytes + (bit >> 3)];
    return (byte >> (8 - depth - (bit & 7))) & max;
  };
  const to8 = (v: number): number => (depth === 8 ? v : depth === 16 ? v >> 8 : Math.round((v * 255) / max));
  // tRNS for greyscale/truecolour images is a single "transparent colour" in raw sample units
  const key = png.transparency && png.transparency.length > 0 ? png.transparency : null;

  for (let i = 0; i < px; i++) {
    const o = i * 4;
    if (ch >= 3) {
      const r = sample(i, 0);
      const g = sample(i, 1);
      const b = sample(i, 2);
      out.data[o] = to8(r);
      out.data[o + 1] = to8(g);
      out.data[o + 2] = to8(b);
      out.data[o + 3] = ch === 4 ? to8(sample(i, 3)) : key && key[0] === r && key[1] === g && key[2] === b ? 0 : 255;
    } else {
      const v = sample(i, 0);
      const g8 = to8(v);
      out.data[o] = g8;
      out.data[o + 1] = g8;
      out.data[o + 2] = g8;
      out.data[o + 3] = ch === 2 ? to8(sample(i, 1)) : key && key[0] === v ? 0 : 255;
    }
  }
  return out;
}

/** RGBA8 PNG without colour chunks. */
export function encodePng(img: RgbaImage): Uint8Array {
  return encode({ width: img.width, height: img.height, data: img.data, depth: 8, channels: 4 });
}
