import {
  ElementsDelta,
  Scene,
  newElementWith,
  newTextElement,
} from "@excalidraw/element";

import {
  getObsidianTextSubmission,
  prepareObsidianTextForEditing,
  restoreObsidianTextAfterEditing,
} from "./obsidianText";

import type App from "./components/App";

describe("Obsidian text lifecycle", () => {
  it("does not record a parsed Markdown round trip as a new history edit", () => {
    const text = newTextElement({
      x: 0,
      y: 0,
      text: "link]",
      rawText: "[[link]]]",
    });
    const scene = new Scene([text], { skipValidation: true });
    const app = {
      props: { onBeforeTextEdit: () => text.rawText },
      scene,
    } as unknown as App;
    const before = new Map(scene.getElementsMapIncludingDeleted());
    const editable = prepareObsidianTextForEditing(app, text, true, before);
    scene.replaceAllElements([
      newElementWith(editable, {
        text: text.text,
        originalText: text.originalText,
        width: text.width,
        height: text.height,
      }),
    ]);
    expect(
      ElementsDelta.calculate(
        before,
        scene.getElementsMapIncludingDeleted(),
      ).isEmpty(),
    ).toBe(false);
    restoreObsidianTextAfterEditing(app, text);
    expect(scene.getElement(text.id)).toBe(text);
    expect(
      ElementsDelta.calculate(
        before,
        scene.getElementsMapIncludingDeleted(),
      ).isEmpty(),
    ).toBe(true);
  });

  it.each([{ rawText: "[[other]]]" }, { width: 123 }, { link: "[[other]]" }])(
    "keeps real content, geometry and link changes: %o",
    (updates) => {
      const text = newTextElement({
        x: 0,
        y: 0,
        text: "link]",
        rawText: "[[link]]]",
      });
      const changed = newElementWith(text, updates);
      const scene = new Scene([changed], { skipValidation: true });
      const app = {
        props: { onBeforeTextEdit: () => text.rawText },
        scene,
      } as unknown as App;
      restoreObsidianTextAfterEditing(app, text);
      expect(scene.getElement(text.id)).toBe(changed);
    },
  );

  it("opens parsed text as raw Markdown and retains it in the scene", () => {
    const text = newTextElement({ x: 0, y: 0, text: "Page" });
    const scene = new Scene([text], { skipValidation: true });
    const app = {
      props: { onBeforeTextEdit: () => "[[page]]" },
      scene,
    } as unknown as App;

    const editable = prepareObsidianTextForEditing(
      app,
      text,
      true,
      scene.getElementsMapIncludingDeleted(),
    );

    expect(editable.originalText).toBe("[[page]]");
    expect(editable.rawText).toBe("[[page]]");
    expect(scene.getElement(text.id)).toBe(editable);
  });

  it("keeps submitted Markdown separate from parsed display text and its link", () => {
    const text = newTextElement({ x: 0, y: 0, text: "Page" });
    const scene = new Scene([text], { skipValidation: true });
    const onBeforeTextSubmit = vi.fn(() => ({
      updatedNextOriginalText: "Page alias",
      nextLink: "[[page]]",
    }));
    const app = {
      props: { onBeforeTextSubmit },
      scene,
    } as unknown as App;

    const submission = getObsidianTextSubmission(
      app,
      text,
      "[[page|alias]]",
      false,
      scene.getElementsMapIncludingDeleted(),
    );

    expect(submission).toEqual({
      nextOriginalText: "Page alias",
      rawText: "[[page|alias]]",
      link: "[[page]]",
      hasTextLink: true,
    });
    expect(onBeforeTextSubmit).toHaveBeenCalledWith(
      text,
      expect.any(String),
      "[[page|alias]]",
      false,
    );
  });
});
