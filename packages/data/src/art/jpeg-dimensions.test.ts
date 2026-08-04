import { describe, expect, it } from "vitest";

import { readJpegDimensions } from "./jpeg-dimensions.ts";

/** A minimal but structurally valid JPEG: SOI, an APP0 segment, then SOF0. */
function validJpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, // APP0, length 16 (2 length bytes + 14 payload)
    ...new Array(14).fill(0),
    0xff, 0xc0, 0x00, 0x11, // SOF0, length 17
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, // component count
    ...new Array(9).fill(0), // 3 components x 3 bytes
  ]);
}

describe("readJpegDimensions", () => {
  it("reads width and height from a valid SOF0 JPEG", () => {
    const result = readJpegDimensions(validJpeg(300, 400));
    expect(result).toEqual({ width: 300, height: 400 });
  });

  it("returns null for a buffer that does not start with the JPEG signature", () => {
    expect(readJpegDimensions(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("returns null for a truncated JPEG buffer with no SOF marker", () => {
    expect(readJpegDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
  });
});
