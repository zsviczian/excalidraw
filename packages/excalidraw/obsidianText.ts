import {
  getContainerElement,
  isTextElement,
  newElementWith,
  refreshTextDimensions,
} from "@excalidraw/element";

import type {
  ElementsMap,
  ExcalidrawTextElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { syncElementLinkWithText } from "./obsidianUtils";

import type App from "./components/App";

/**
 * Prepare an editor session with Obsidian's unparsed Markdown source.
 * Author: zsviczian. References: excalidraw#12186 / fork PR #455 and
 * obsidian-excalidraw-plugin/src/view/ExcalidrawView.ts:onBeforeTextEdit.
 * The rendered scene text can differ from the Markdown that the user edits,
 * so this must run before the shared WYSIWYG editor receives the element.
 */
export function prepareObsidianTextForEditing(
  app: App,
  element: NonDeleted<ExcalidrawTextElement>,
  isExistingElement: boolean,
  elementsMap: ElementsMap,
): NonDeleted<ExcalidrawTextElement> {
  const text = app.props.onBeforeTextEdit?.(element, isExistingElement);
  if (!text || text === element.originalText) {
    return element;
  }

  let editableElement = element;
  app.scene.replaceAllElements([
    ...app.scene.getElementsIncludingDeleted().map((_element) => {
      if (_element.id === element.id && isTextElement(_element)) {
        editableElement = newElementWith(_element, {
          originalText: text,
          rawText: text,
          isDeleted: false,
          ...refreshTextDimensions(
            _element,
            getContainerElement(_element, elementsMap),
            elementsMap,
            text,
          ),
        }) as NonDeleted<ExcalidrawTextElement>;
        return editableElement;
      }
      return _element;
    }),
  ]);
  return editableElement;
}

/**
 * Convert submitted Markdown into the host's display text and link metadata.
 * Author: zsviczian. References: excalidraw#12186 / fork PR #455 and
 * obsidian-excalidraw-plugin/src/view/ExcalidrawView.ts:onBeforeTextSubmit.
 * Keep the raw source even when Obsidian returns parsed display text. The
 * host setting is read at submission time so an open editor sees live changes.
 */
export function getObsidianTextSubmission(
  app: App,
  element: NonDeleted<ExcalidrawTextElement>,
  nextOriginalText: string,
  isDeleted: boolean,
  elementsMap: ElementsMap,
) {
  const rawText = nextOriginalText;
  let link = undefined;
  let hasTextLink = false;
  if (app.props.onBeforeTextSubmit) {
    const _element = app.scene
      .getElementsIncludingDeleted()
      .find((el) => el.id === element.id && isTextElement(el)) as
      | ExcalidrawTextElement
      | undefined;
    if (_element) {
      const dimensionsData = refreshTextDimensions(
        _element,
        getContainerElement(_element, elementsMap),
        elementsMap,
        nextOriginalText,
      );
      const { updatedNextOriginalText, nextLink } =
        app.props.onBeforeTextSubmit(
          element,
          dimensionsData?.text ?? nextOriginalText,
          nextOriginalText,
          isDeleted,
        );
      nextOriginalText = updatedNextOriginalText ?? nextOriginalText;
      hasTextLink = !!nextLink;
      link = syncElementLinkWithText() ? nextLink : element.link ?? undefined;
    }
  }
  return { nextOriginalText, rawText, link, hasTextLink };
}
