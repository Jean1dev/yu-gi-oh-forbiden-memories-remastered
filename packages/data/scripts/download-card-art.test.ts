import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  runDownload,
  type DownloadClient,
  type DownloadOptions,
} from "./download-card-art.ts";

/** A minimal but structurally valid 300x400 JPEG (same shape used by jpeg-dimensions.test.ts). */
function validJpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    ...new Array(14).fill(0),
    0xff, 0xc0, 0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    ...new Array(9).fill(0),
  ]);
}

function okResponse(body: Uint8Array, contentType = "image/jpeg") {
  return { ok: true as const, contentType, body };
}

let workDir = "";

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-download-"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

function optionsFor(
  targetNumbers: readonly string[],
  client: DownloadClient,
  extra: Partial<DownloadOptions> = {},
): DownloadOptions {
  return {
    artUrlsPath: join(workDir, "ygoprodeck-art-urls.json"),
    outputDir: join(workDir, "art"),
    targetNumbers,
    client,
    ...extra,
  };
}

async function writeArtUrls(urls: Record<string, string>): Promise<void> {
  await writeFile(join(workDir, "ygoprodeck-art-urls.json"), JSON.stringify(urls), "utf8");
}

describe("runDownload", () => {
  it("downloads and writes when the response is a valid JPEG above the threshold", async () => {
    await writeArtUrls({ "001": "https://example.test/001.jpg" });
    const client: DownloadClient = vi.fn(async () => okResponse(validJpeg(300, 400)));

    await runDownload(optionsFor(["001"], client));

    const written = await readFile(join(workDir, "art", "001.jpg"));
    expect(written.length).toBeGreaterThan(0);
  });

  it("skips (too_small) without writing when the image is below 400px", async () => {
    await writeArtUrls({ "001": "https://example.test/001.jpg" });
    const client: DownloadClient = vi.fn(async () => okResponse(validJpeg(200, 300)));

    await runDownload(optionsFor(["001"], client));

    await expect(readFile(join(workDir, "art", "001.jpg"))).rejects.toThrow();
  });

  it("skips (not_jpeg) without writing when the response is not a JPEG", async () => {
    await writeArtUrls({ "001": "https://example.test/001.jpg" });
    const client: DownloadClient = vi.fn(async () =>
      okResponse(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png"),
    );

    await runDownload(optionsFor(["001"], client));

    await expect(readFile(join(workDir, "art", "001.jpg"))).rejects.toThrow();
  });

  it("skips (http_error) and continues to the next card when a download fails", async () => {
    await writeArtUrls({
      "001": "https://example.test/001.jpg",
      "002": "https://example.test/002.jpg",
    });
    const client: DownloadClient = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(okResponse(validJpeg(300, 400)));

    await runDownload(optionsFor(["001", "002"], client));

    await expect(readFile(join(workDir, "art", "001.jpg"))).rejects.toThrow();
    await expect(readFile(join(workDir, "art", "002.jpg"))).resolves.toBeDefined();
  });

  it("skips (no_url) without calling the network when the card has no URL", async () => {
    await writeArtUrls({});
    const client: DownloadClient = vi.fn(async () => okResponse(validJpeg(300, 400)));

    await runDownload(optionsFor(["001"], client));

    expect(client).not.toHaveBeenCalled();
  });

  it("preserves an existing file when a retry fails", async () => {
    await writeArtUrls({ "001": "https://example.test/001.jpg" });
    await mkdir(join(workDir, "art"), { recursive: true });
    await writeFile(join(workDir, "art", "001.jpg"), "previous-good-download", "utf8");
    const client: DownloadClient = vi.fn(async () => ({ ok: false as const }));

    await runDownload(optionsFor(["001"], client));

    const content = await readFile(join(workDir, "art", "001.jpg"), "utf8");
    expect(content).toBe("previous-good-download");
  });
});
