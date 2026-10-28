// zsviczian -- real editor bootstrap, not a replacement implementation of upstream test hooks.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { isTestEnv } from "@excalidraw/common";
import { Excalidraw } from "@excalidraw/excalidraw";
import { render as renderInherited } from "@excalidraw/excalidraw/tests/test-utils";

describe("owned test bootstrap", () => {
  it("publishes actual App hooks only in the test environment", async () => {
    expect(isTestEnv()).toBe(true);
    const rendered = render(<Excalidraw />);
    await waitFor(() => expect(window.h.app).toBeDefined());
    expect(window.h.app.scene).toBe(window.h.scene);
    expect(rendered.container.querySelector("canvas.static")).not.toBeNull();
    rendered.unmount();
  });
  it("retains the captured upstream hook identity through the inherited render helper", async () => {
    const captured = window.h;
    const rendered = await renderInherited(<Excalidraw />);
    expect(window.h).toBe(captured);
    expect(captured.app).toBeDefined();
    rendered.unmount();
  });
});
