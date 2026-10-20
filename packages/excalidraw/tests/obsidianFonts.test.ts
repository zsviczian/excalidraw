/**
 * Preserve Obsidian font ownership and replaceable Local Font behavior while
 * adopting upstream worker font sets. Author: zsviczian.
 * Reference: https://github.com/zsviczian/excalidraw/pull/471
 * These checks belong here because the component registers bundled faces,
 * while the plugin owns changing Local Font faces in each document.
 */
import { vi } from "vitest";

import { FONT_FAMILY, FONT_METADATA } from "@excalidraw/common";
import { newTextElement } from "@excalidraw/element";

import { Fonts } from "../fonts/Fonts";

const createFontSet = () => ({
  has: vi.fn(() => false),
  add: vi.fn(),
  check: vi.fn(() => false),
  load: vi.fn(async () => []),
});

describe("Obsidian font loading", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads into an explicitly supplied document without using the main font set", async () => {
    const fonts = createFontSet();
    const ownerDocument = document.implementation.createHTMLDocument();
    Object.defineProperty(ownerDocument, "fonts", { value: fonts });
    const mainLoad = vi.spyOn(document.fonts, "load");

    await Fonts.loadElementsFonts(
      [newTextElement({ x: 0, y: 0, text: "Popout" })],
      ownerDocument,
    );

    expect(fonts.load).toHaveBeenCalledWith(
      expect.stringContaining("Excalifont"),
      "Poput",
    );
    expect(mainLoad).not.toHaveBeenCalled();
  });

  it("keeps the public Document argument and the new FontFaceSet argument equivalent", async () => {
    const fonts = createFontSet();
    const ownerDocument = document.implementation.createHTMLDocument();
    Object.defineProperty(ownerDocument, "fonts", { value: fonts });
    const families = [FONT_FAMILY.Excalifont];
    const characters = { [FONT_FAMILY.Excalifont]: new Set("Export") };

    await Fonts.loadFontFaces(families, characters, ownerDocument);
    await Fonts.loadFontFaces(
      families,
      characters,
      fonts as unknown as FontFaceSet,
    );

    expect(fonts.load.mock.calls).toEqual([
      [expect.stringContaining("Excalifont"), "Export"],
      [expect.stringContaining("Excalifont"), "Export"],
    ]);
  });

  it("leaves Local Font registration and loading to the host", async () => {
    const registered = new Map(Fonts.registered);
    Fonts.register.call(
      { registered },
      "Local Font",
      FONT_METADATA[FONT_FAMILY.Excalifont],
      { uri: "data:font/woff2;base64,AA==" },
    );
    vi.spyOn(Fonts, "registered", "get").mockReturnValue(registered);
    const fonts = createFontSet();

    await Fonts.loadFontFaces(
      [FONT_FAMILY["Local Font"], FONT_FAMILY.Helvetica],
      {
        [FONT_FAMILY["Local Font"]]: new Set("Local"),
        [FONT_FAMILY.Helvetica]: new Set("System"),
      },
      fonts as unknown as FontFaceSet,
    );

    expect(fonts.add).toHaveBeenCalled();
    expect(
      fonts.add.mock.calls.some(([face]) => face.family === "Local Font"),
    ).toBe(false);
    expect(fonts.load).not.toHaveBeenCalled();
  });
});
