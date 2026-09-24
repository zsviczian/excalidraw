import { FONT_FAMILY, FONT_TOP_PICKS_SLOTS, KEYS } from "@excalidraw/common";

import { Excalidraw } from "../..";
import { API } from "../../tests/helpers/api";
import { Keyboard } from "../../tests/helpers/ui";
import { act, fireEvent, render, waitFor } from "../../tests/test-utils";

import type { AppState } from "../../types";

const { h } = window;
const getAppState = () => h.state as unknown as AppState; // zsviczian -- use the fork's local state type instead of stale generated test-hook declarations

(global as any).ResizeObserver =
  (global as any).ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

describe("FontPicker", () => {
  it("should be able to open font picker", async () => {
    const { queryByTestId } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );

    Keyboard.keyPress(KEYS.T);

    const fontPickerTrigger = queryByTestId("font-family-show-fonts");

    expect(fontPickerTrigger).not.toBeNull();

    act(() => {
      fontPickerTrigger!.click();
    });
  });

  describe("top picks drag & drop", () => {
    const SLOT_SIZE = 32;
    const SLOT_SPAN = 40;

    // jsdom has no layout — lay the strip slots out horizontally, and
    // everything else (the list rows) well below the strip
    beforeEach(() => {
      vi.spyOn(
        HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockImplementation(function (this: HTMLElement) {
        const index = this.dataset.topPickIndex;
        if (index != null) {
          return new DOMRect(
            Number(index) * SLOT_SPAN,
            0,
            SLOT_SIZE,
            SLOT_SIZE,
          );
        }
        if (this.classList.contains("top-picks-dnd")) {
          return new DOMRect(
            0,
            0,
            SLOT_SPAN * (FONT_TOP_PICKS_SLOTS - 1) + SLOT_SIZE,
            SLOT_SIZE,
          ); // zsviczian -- cover the fork's fourth default font slot
        }
        return new DOMRect(0, 300, SLOT_SIZE, SLOT_SIZE);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const slotCenter = (index: number) => ({
      clientX: index * SLOT_SPAN + SLOT_SIZE / 2,
      clientY: SLOT_SIZE / 2,
    });

    const drag = async (
      source: HTMLElement,
      from: { clientX: number; clientY: number },
      to: { clientX: number; clientY: number },
    ) => {
      fireEvent.pointerDown(source, { pointerId: 1, button: 0, ...from });
      // wait out the sloppy-click grace period
      await new Promise((resolve) => setTimeout(resolve, 120));
      fireEvent.pointerMove(window, { pointerId: 1, ...to });
      fireEvent.pointerUp(window, { pointerId: 1, ...to });
      // let the post-drop click suppression lapse
      await new Promise((resolve) => setTimeout(resolve, 120));
    };

    const getStripFamilies = (container: HTMLElement) =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          ".FontPicker__top-picks [data-top-pick-index]",
        ),
      ).map((button) => button.title);

    const openFontPicker = async () => {
      const utils = await render(
        <Excalidraw handleKeyboardGlobally={true} showDeprecatedFonts={true} />,
      ); // zsviczian -- expose Virgil as a non-default font for four-slot drag tests
      Keyboard.keyPress(KEYS.T);
      act(() => {
        utils.queryByTestId("font-family-show-fonts")!.click();
      });
      await waitFor(() =>
        expect(
          document.querySelector('.dropdown-menu.fonts [title="Virgil"]'),
        ).not.toBeNull(),
      );
      return utils;
    };

    it("pins a font dragged from the list, replacing the hovered slot", async () => {
      const { container } = await openFontPicker();

      const row = document.querySelector<HTMLElement>(
        '.dropdown-menu.fonts [title="Virgil"]',
      )!;
      await drag(row, { clientX: 16, clientY: 316 }, slotCenter(1));

      await waitFor(
        () =>
          expect(getAppState().fontTopPicks).toEqual([
            FONT_FAMILY.Excalifont,
            FONT_FAMILY.Virgil,
            FONT_FAMILY["Comic Shanns"],
            FONT_FAMILY["Lilita One"],
          ]), // zsviczian -- preserve the fourth default font pick
      );
      expect(getStripFamilies(container)).toEqual([
        "Hand-drawn",
        "Virgil",
        "Code",
        "Bold",
      ]); // zsviczian -- preserve the fourth default font pick
      // pinning doesn't pick the font
      expect(getAppState().currentItemFontFamily).not.toBe(FONT_FAMILY.Virgil);
    });

    it("refuses pinning an already pinned font", async () => {
      await openFontPicker();

      const row = document.querySelector<HTMLElement>(
        '.dropdown-menu.fonts [title="Nunito"]',
      )!;
      await drag(row, { clientX: 16, clientY: 316 }, slotCenter(0));

      expect(getAppState().fontTopPicks).toBe(null);
    });

    it("reorders picks dragged within the strip", async () => {
      const { container } = await openFontPicker();

      const firstPick = container.querySelector<HTMLElement>(
        '.FontPicker__top-picks [data-top-pick-index="0"]',
      )!;
      await drag(firstPick, slotCenter(0), slotCenter(3)); // zsviczian -- reorder across all four default slots

      await waitFor(
        () =>
          expect(getAppState().fontTopPicks).toEqual([
            FONT_FAMILY.Nunito,
            FONT_FAMILY["Comic Shanns"],
            FONT_FAMILY["Lilita One"],
            FONT_FAMILY.Excalifont,
          ]), // zsviczian -- preserve the fourth default font pick
      );
      expect(getStripFamilies(container)).toEqual([
        "Normal",
        "Code",
        "Bold",
        "Hand-drawn",
      ]); // zsviczian -- preserve the fourth default font pick
    });

    it("pads a short customized list with unpicked defaults", async () => {
      const { container } = await openFontPicker();

      act(() => {
        API.setAppState({ fontTopPicks: [FONT_FAMILY.Virgil] });
      });
      await waitFor(
        () =>
          expect(getStripFamilies(container)).toEqual([
            "Virgil",
            "Hand-drawn",
            "Normal",
            "Code",
          ]), // zsviczian -- pad to the fork's four slots
      );

      // padded defaults count as pinned
      const row = document.querySelector<HTMLElement>(
        '.dropdown-menu.fonts [title="Nunito"]',
      )!;
      await drag(row, { clientX: 16, clientY: 316 }, slotCenter(0));
      expect(getAppState().fontTopPicks).toEqual([FONT_FAMILY.Virgil]);

      // dropping on a padded slot persists the full strip
      const bold = document.querySelector<HTMLElement>(
        '.dropdown-menu.fonts [title="Lilita One"]',
      )!;
      await drag(bold, { clientX: 16, clientY: 316 }, slotCenter(1));
      await waitFor(
        () =>
          expect(getAppState().fontTopPicks).toEqual([
            FONT_FAMILY.Virgil,
            FONT_FAMILY["Lilita One"],
            FONT_FAMILY.Nunito,
            FONT_FAMILY["Comic Shanns"],
          ]), // zsviczian -- persist all four slots
      );
    });

    it("resets customized picks from the tip's reset link", async () => {
      await openFontPicker();

      const getResetLink = () =>
        document.querySelector<HTMLElement>(
          ".FontPicker__tip .top-picks-dnd__tip-reset",
        );
      // nothing to reset while the picks are the defaults
      expect(getResetLink()).toBe(null);

      act(() => {
        API.setAppState({
          fontTopPicks: [FONT_FAMILY["Lilita One"], FONT_FAMILY.Nunito],
        });
      });
      await waitFor(() => expect(getResetLink()).not.toBe(null));

      act(() => {
        getResetLink()!.click();
      });

      expect(getAppState().fontTopPicks).toBe(null);
      expect(getAppState().openPopup).toBe("fontFamily");
      await waitFor(() => expect(getResetLink()).toBe(null));
    });
  });
});
