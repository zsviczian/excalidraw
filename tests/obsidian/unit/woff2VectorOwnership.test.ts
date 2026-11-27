/**
 * zsviczian -- Check that the shared SVG font subsetter releases WASM results
 * after copying their bytes. https://github.com/zsviczian/excalidraw/pull/500
 */
import { expect, it, vi } from "vitest";

import loadWoff2 from "../../../packages/excalidraw/subset/woff2/woff2-loader";

const { compress, decompress } = vi.hoisted(() => ({
  compress: vi.fn(),
  decompress: vi.fn(),
}));

vi.mock("../../../packages/excalidraw/subset/woff2/woff2-bindings", () => ({
  default: () =>
    Promise.resolve({
      woff2Enc: compress,
      woff2Dec: decompress,
    }),
}));

const methods = [
  ["compress", compress],
  ["decompress", decompress],
] as const;

it.each(methods)(
  "%s copies the result before releasing it",
  async (method, binding) => {
    const bytes = [119, 79, 70, 50];
    const vector = {
      size: () => bytes.length,
      get: (index: number) => bytes[index],
      delete: vi.fn(() => bytes.splice(0)),
    };
    binding.mockReturnValueOnce(vector);

    const woff2 = await loadWoff2();
    expect(woff2[method](new ArrayBuffer(0))).toEqual(
      Uint8Array.of(119, 79, 70, 50),
    );
    expect(vector.delete).toHaveBeenCalledTimes(1);
  },
);

it.each(methods)(
  "%s releases the result when byte copying throws",
  async (method, binding) => {
    const error = new Error("WASM byte read failed");
    const vector = {
      size: () => 1,
      get: () => {
        throw error;
      },
      delete: vi.fn(),
    };
    binding.mockReturnValueOnce(vector);

    const woff2 = await loadWoff2();
    expect(() => woff2[method](new ArrayBuffer(0))).toThrow(error);
    expect(vector.delete).toHaveBeenCalledTimes(1);
  },
);
