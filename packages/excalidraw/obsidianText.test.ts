import { Scene, newTextElement } from "@excalidraw/element";

import {
  getObsidianTextSubmission,
  prepareObsidianTextForEditing,
} from "./obsidianText";

import type App from "./components/App";

describe("Obsidian text lifecycle", () => {
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
