// zsviczian -- regression oracle for captured hook identity in inherited helpers.
import React from "react";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import {
  render,
  mockBoundingClientRect,
  restoreOriginalGetBoundingClientRect,
} from "@excalidraw/excalidraw/tests/test-utils";

describe("captured inherited bootstrap identity", () => {
  const captured = window.h;
  beforeAll(() => mockBoundingClientRect({ width: 800, height: 400 }));
  afterAll(restoreOriginalGetBoundingClientRect);
  it("publishes the real mounted app to the object captured before render", async () => {
    const rendered = await render(
      <Excalidraw>
        <WelcomeScreen />
      </Excalidraw>,
    );
    expect(window.h).toBe(captured);
    expect(captured.app).toBeDefined();
    expect(captured.app.scene).toBe(captured.scene);
    rendered.unmount();
  });
});
