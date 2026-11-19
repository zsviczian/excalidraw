/**
 * zsviczian -- PR #491: upstream focus/sync/teardown must preserve host Markdown.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/491
 * Mount the actual editor without upstream test-helper adapters.
 */
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { Excalidraw } from "@excalidraw/excalidraw";
import { FONT_FAMILY } from "@excalidraw/common";
import {
  CaptureUpdateAction,
  newElementWith,
  newTextElement,
  syncInvalidIndices,
} from "@excalidraw/element";
import {
  configureObsidianExcalidrawHost,
  OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
} from "@excalidraw/excalidraw/obsidianExcalidrawHost";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawTextElement } from "@excalidraw/element/types";

import { getDefaultAppState } from "../../../packages/excalidraw/appState";
import { shouldDiscardRemoteElement } from "../../../packages/excalidraw/data/reconcile";

import type { RemoteExcalidrawElement } from "../../../packages/excalidraw/data/reconcile";

let dispose: () => void;
beforeEach(() => {
  dispose = configureObsidianExcalidrawHost({
    protocolVersion: OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
    getZoomStep: () => 0.1,
    getZoomMin: () => 0.1,
    getZoomMax: () => 30,
    getZoomToFitMaxLevel: () => 10,
    isDoubleTapEraserEnabled: () => false,
    isPenModeCrosshairVisible: () => false,
    isSingleFingerPanningEnabled: () => false,
    isDoubleClickTextEditingDisabled: () => false,
    isContextMenuDisabled: () => false,
    shouldSyncElementLinkWithText: () => false,
    loadFontFromFile: async () => undefined,
    getMermaid: async () => {
      throw Error("Text editing must not load Mermaid");
    },
    runAction() {},
    prepareMermaidSVGInsert: async (_id, diagram) => diagram,
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close() {},
    }),
  });
});
afterEach(() => {
  cleanup();
  dispose();
});

async function editing(hostMarkdown = true) {
  const text = newTextElement({
    x: 50,
    y: 50,
    text: "Label",
    rawText: "[[Note|Label]]",
    fontFamily: FONT_FAMILY.Helvetica,
  });
  let api!: ExcalidrawImperativeAPI;
  const submit = vi.fn<NonNullable<ExcalidrawProps["onBeforeTextSubmit"]>>(
    (_element, _text, source) => ({
      updatedNextOriginalText: source === "[[Note|Label]]" ? "Label" : source,
      nextLink: "",
    }),
  );
  const view = render(
    <Excalidraw
      handleKeyboardGlobally
      initialData={{ elements: [text], appState: { scrollX: 0, scrollY: 0 } }}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      onBeforeTextEdit={hostMarkdown ? (element) => element.rawText : undefined}
      onBeforeTextSubmit={hostMarkdown ? submit : undefined}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  fireEvent.doubleClick(view.container.querySelector("canvas.interactive")!, {
    clientX: 60,
    clientY: 60,
  });
  await waitFor(() =>
    expect(
      view.container.querySelector("textarea.excalidraw-wysiwyg"),
    ).not.toBeNull(),
  );
  const editor = view.container.querySelector<HTMLTextAreaElement>(
    "textarea.excalidraw-wysiwyg",
  )!;
  await waitFor(() => expect(document.activeElement).toBe(editor));
  expect(editor.value).toBe(hostMarkdown ? "[[Note|Label]]" : "Label");
  return { ...view, api, text, editor, submit };
}

it("keeps raw Markdown editing open when its owning window loses focus", async () => {
  const { api, text, editor, submit } = await editing();
  fireEvent.blur(editor);
  fireEvent.blur(window);
  expect(editor.isConnected).toBe(true);
  expect(api.getAppState().editingTextElement?.id).toBe(text.id);
  expect(editor.value).toBe("[[Note|Label]]");
  expect(submit).not.toHaveBeenCalled();
});

it("submits raw Markdown once when focus actually moves within its document", async () => {
  const { api, text, editor, submit } = await editing();
  const button = document.createElement("button");
  document.body.append(button);
  try {
    act(() => button.focus());
    await waitFor(() => expect(editor.isConnected).toBe(false));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(
      api.getSceneElements().find((element) => element.id === text.id),
    ).toMatchObject({
      rawText: "[[Note|Label]]",
      originalText: "Label",
      isDeleted: false,
    });
  } finally {
    button.remove();
  }
});

it("takes external scene Markdown after window blur without replacing it with its display label", async () => {
  const { api, text, editor, submit } = await editing();
  fireEvent.blur(editor);
  const updated = newElementWith(
    api.getSceneElements()[0] as ExcalidrawTextElement,
    {
      originalText: "Fresh label",
      text: "Fresh label",
      rawText: "[[Fresh|Fresh label]]",
    },
  );
  act(() =>
    api.updateScene({
      elements: [updated],
      captureUpdate: CaptureUpdateAction.NEVER,
    }),
  );
  expect(editor.value).toBe("[[Fresh|Fresh label]]");
  expect(api.getAppState().editingTextElement?.id).toBe(text.id);
  expect(submit).not.toHaveBeenCalled();
});

it("ends editing when an external scene deletes its text without resurrecting it", async () => {
  const { api, editor, submit } = await editing();
  const deleted = newElementWith(api.getSceneElementsIncludingDeleted()[0], {
    isDeleted: true,
  });
  await act(async () =>
    api.updateScene({
      elements: [deleted],
      captureUpdate: CaptureUpdateAction.NEVER,
    }),
  );
  await waitFor(() => expect(editor.isConnected).toBe(false));
  expect(api.getSceneElements()).toEqual([]);
  expect(api.getSceneElementsIncludingDeleted()[0].isDeleted).toBe(true);
  expect(submit.mock.calls.length).toBeLessThanOrEqual(1);
});

it("preserves a locally typed Markdown draft until it is submitted", async () => {
  const { api, editor, submit } = await editing();
  const draft = "[[Local|Own draft]]";
  fireEvent.input(editor, { target: { value: draft } });
  const updated = newElementWith(
    api.getSceneElements()[0] as ExcalidrawTextElement,
    {
      originalText: "Remote label",
      text: "Remote label",
      rawText: "[[Remote|Remote label]]",
    },
  );
  act(() =>
    api.updateScene({
      elements: [updated],
      captureUpdate: CaptureUpdateAction.NEVER,
    }),
  );
  expect(editor.value).toBe(draft);
  expect(submit).not.toHaveBeenCalled();
  act(() => editor.blur());
  expect(submit).toHaveBeenCalledTimes(1);
  expect(api.getSceneElements()[0]).toMatchObject({ rawText: draft });
});

it("retains upstream scene-text following without a host Markdown callback", async () => {
  const { api, editor } = await editing(false);
  fireEvent.blur(editor);
  const updated = newElementWith(
    api.getSceneElements()[0] as ExcalidrawTextElement,
    {
      originalText: "Fresh label",
      text: "Fresh label",
      rawText: "[[Fresh|Fresh label]]",
    },
  );
  act(() =>
    api.updateScene({
      elements: [updated],
      captureUpdate: CaptureUpdateAction.NEVER,
    }),
  );
  expect(editor.value).toBe("Fresh label");
});

it("unmounts an open Markdown editor without submitting or retaining window callbacks", async () => {
  const { editor, unmount, submit } = await editing();
  unmount();
  expect(editor.isConnected).toBe(false);
  fireEvent.blur(window);
  fireEvent(window, new Event("beforeunload"));
  expect(submit).not.toHaveBeenCalled();
});

it("accepts newer remote text during editing while retaining other reconciliation guards", () => {
  const local = syncInvalidIndices([
    newTextElement({ x: 0, y: 0, text: "Local" }),
  ])[0];
  const remote = newElementWith(local, {
    originalText: "Remote",
  }) as RemoteExcalidrawElement;
  const state = {
    ...getDefaultAppState(),
    editingTextElement: local,
    width: 1000,
    height: 700,
    offsetLeft: 0,
    offsetTop: 0,
  };
  expect(shouldDiscardRemoteElement(state, local, remote)).toBe(false);
  expect(
    shouldDiscardRemoteElement(
      { ...state, resizingElement: local },
      local,
      remote,
    ),
  ).toBe(true);
  expect(
    shouldDiscardRemoteElement(
      state,
      newElementWith(local, { version: remote.version + 1 }),
      remote,
    ),
  ).toBe(true);
});
