import { readFileSync } from "node:fs";

import { encode } from "fast-png";
import { describe, expect, test } from "vitest";

import { decodePng, encodePng, isPng } from "./png.ts";
import { createImage, diffImages } from "./rgba.ts";

const demo = () => readFileSync(new URL("../../../tests/fixtures/inputs/demo-16.png", import.meta.url));
/** Inserts a chunk right after IHDR (8-byte signature + 25-byte IHDR chunk). */
function withChunk(png: Uint8Array, type: string, data: number[]): Uint8Array {
  const body = Array.from(type, (c) => c.charCodeAt(0)).concat(data);
  let crc = ~0;
  for (const b of body) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  crc = ~crc >>> 0;
  const len = data.length;
  const chunk = [len >>> 24, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...body];
  chunk.push(crc >>> 24, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255);
  return new Uint8Array([...png.subarray(0, 33), ...chunk, ...png.subarray(33)]);
}

const colours = (data: Uint8ClampedArray) => {
  const set = new Set<string>();
  for (let i = 0; i < data.length; i += 4) set.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
  return set;
};

describe("decodePng", () => {
  test("palette + tRNS + gAMA/cHRM PNG decodes to the raw palette (no colour management)", () => {
    const img = decodePng(demo());
    expect([img.width, img.height]).toEqual([80, 48]);
    const c = colours(img.data);
    expect(c.size).toBe(7);
    expect(c).toContain("93,22,16,255"); // v1 (Chromium canvas) turned this into 93,14,7
    expect(c).toContain("0,0,0,0");
  });

  test("greyscale 1/2/4/8/16-bit, with and without tRNS", () => {
    const gray4 = encode({ width: 4, height: 1, data: new Uint8Array([0x0f, 0xf0]), depth: 4, channels: 1 });
    expect([...decodePng(gray4).data]).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255]);
    const gray16 = encode({ width: 1, height: 1, data: new Uint16Array([0x8000]), depth: 16, channels: 1 });
    expect([...decodePng(gray16).data]).toEqual([128, 128, 128, 255]);
    // fast-png only writes tRNS for palette images, so add the chunk by hand: transparent colour = 4,5,6.
    // (fast-png's decoder also rejects an RGB tRNS on images with fewer than 3 pixels, hence 4×1.)
    const rgb8 = withChunk(
      encode({
        width: 4,
        height: 1,
        data: new Uint8Array([1, 2, 3, 4, 5, 6, 4, 5, 6, 7, 8, 9]),
        depth: 8,
        channels: 3,
      }),
      "tRNS",
      [0, 4, 0, 5, 0, 6],
    );
    expect([...decodePng(rgb8).data]).toEqual([1, 2, 3, 255, 4, 5, 6, 0, 4, 5, 6, 0, 7, 8, 9, 255]);
    const ga = encode({ width: 1, height: 1, data: new Uint8Array([200, 100]), depth: 8, channels: 2 });
    expect([...decodePng(ga).data]).toEqual([200, 200, 200, 100]);
  });

  test("rejects non-PNG data", () => {
    expect(isPng(new Uint8Array([1, 2, 3]))).toBe(false);
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow("not a PNG file");
  });
});

test("encode → decode round trip is lossless, including semi-transparent pixels", () => {
  const img = createImage(3, 2);
  img.data.set([255, 0, 0, 255, 10, 20, 30, 1, 0, 0, 0, 0, 7, 8, 9, 128, 255, 255, 255, 255, 1, 2, 3, 254]);
  const back = decodePng(encodePng(img));
  expect(diffImages(img, back).count).toBe(0);
  expect([...back.data]).toEqual([...img.data]);
  expect(decodePng(encodePng(decodePng(demo()))).data).toEqual(decodePng(demo()).data);
});
