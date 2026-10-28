/**
 * zsviczian -- #475: real mounted host metrics without legacy window.h helpers.
 * Host-supplied metrics must survive the upstream binding/history extraction,
 * while Obsidian retains raw Markdown and the public refreshAllArrows entry.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/475
 */
import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";

import { pointFrom } from "@excalidraw/math";

import type { RenderEnvironment } from "@excalidraw/element";
import type { ExcalidrawTextElement } from "@excalidraw/element/types";

import { Excalidraw, convertToExcalidrawElements } from "../index";
import { useApp } from "../components/App";
import { actionAlignTop } from "../actions/actionAlign";

import type { AppClassProperties, ExcalidrawImperativeAPI } from "../types";
import type App from "../components/App";

afterEach(cleanup);

const label = "aaaa bbbb cccc dddd eeee ffff";
const environment: RenderEnvironment = {
  createCanvas: () => document.createElement("canvas"),
  createImage: () => document.createElement("img"),
  textMetrics: { getLineWidth: (text) => text.length * 5 },
};

it("retains host label metrics and raw text when aligning bound shapes", async () => {
  let app!: AppClassProperties;
  let api!: ExcalidrawImperativeAPI;
  const Probe = () => {
    app = useApp();
    return null;
  };
  const elements = convertToExcalidrawElements(
    [
      { type: "rectangle", id: "A", x: 0, y: 0, width: 100, height: 100 },
      { type: "rectangle", id: "B", x: 400, y: 10, width: 100, height: 100 },
      {
        type: "arrow",
        id: "arrow",
        x: 100,
        y: 50,
        points: [pointFrom(0, 0), pointFrom(300, 0)],
        start: { id: "A" },
        end: { id: "B" },
        label: { text: label },
      },
    ],
    { regenerateIds: false, renderEnvironment: environment },
  );
  render(
    <Excalidraw
      renderEnvironment={environment}
      renderTopRightUI={() => <Probe />}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      initialData={{ elements }}
    />,
  );
  await waitFor(() => expect(app && api?.getAppState().isLoading).toBe(false));
  expect(app.renderEnvironment).toBe(environment);
  act(() => {
    api.selectElements(
      api.getSceneElements().filter((e) => e.id === "A" || e.id === "B"),
    );
    // zsviczian -- #477 AppContext supplies the real App; only this internal
    // action-manager assertion crosses the public hook's narrower type.
    (app as App).actionManager.executeAction(actionAlignTop, "keyboard");
  });
  await waitFor(() =>
    expect(api.getSceneElements().find((e) => e.id === "B")?.y).toBe(0),
  );
  const text = api
    .getSceneElements()
    .find((e) => e.type === "text") as ExcalidrawTextElement;
  expect(text.text).toBe(label);
  expect(text.rawText).toBe(label);
  expect(text.width).toBe(145);
  act(() => api.refreshAllArrows());
  expect(
    api.getSceneElements().every((e) => !("moveMidPointsWithElement" in e)),
  ).toBe(true);
});
