/**
 * Reads width/height straight out of a JPEG's SOF marker, without a decoding
 * dependency — the project has none today and this feature does not need one
 * (spec `renderizacao-cartas/F03`, Decision 3).
 *
 * Pure: takes an already-downloaded buffer, does no I/O of its own.
 */

const MARKER_START = 0xff;
/** SOF0..SOF15 except the DHT/JPG/DAC markers, which are not frame headers. */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
/** Markers with no length-prefixed payload following them. */
const STANDALONE_MARKERS = new Set([0xd8, 0xd9, 0x01]);

function hasJpegSignature(buffer: Uint8Array): boolean {
  return buffer[0] === 0xff && buffer[1] === 0xd8;
}

function readUint16(buffer: Uint8Array, offset: number): number | null {
  const high = buffer[offset];
  const low = buffer[offset + 1];
  if (high === undefined || low === undefined) {
    return null;
  }
  return (high << 8) | low;
}

export function readJpegDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  if (!hasJpegSignature(buffer)) {
    return null;
  }

  let offset = 2;
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== MARKER_START) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === undefined) {
      return null;
    }
    if (STANDALONE_MARKERS.has(marker)) {
      offset += 2;
      continue;
    }

    const segmentLength = readUint16(buffer, offset + 2);
    if (segmentLength === null) {
      return null;
    }

    if (SOF_MARKERS.has(marker)) {
      const height = readUint16(buffer, offset + 5);
      const width = readUint16(buffer, offset + 7);
      if (height === null || width === null || height === 0 || width === 0) {
        return null;
      }
      return { width, height };
    }

    offset += 2 + segmentLength;
  }

  return null;
}
