// zsviczian -- synthetic model input complements the real-browser/native trusted input lane.
import React, { act } from "react";
import { it, expect } from "vitest";
import { Excalidraw } from "@excalidraw/excalidraw";
import { render } from "@excalidraw/excalidraw/tests/test-utils";
import { UI, Pointer } from "@excalidraw/excalidraw/tests/helpers/ui";

it("creates a rectangle through the inherited synthetic pointer helper", async () => {
  const rendered = await render(<Excalidraw handleKeyboardGlobally />);
  const button = rendered.getByToolName("rectangle");
  expect(button.hasAttribute("disabled"), button.outerHTML).toBe(false);
  act(() => UI.clickTool("rectangle"));
  expect(window.h.state.activeTool.type, button.outerHTML).toBe("rectangle");
  const mouse = new Pointer("mouse");
  act(() => mouse.down(100, 100));
  const down = {
    activeTool: window.h.state.activeTool.type,
    elements: window.h.elements.length,
    newElement: window.h.state.newElement?.type,
    pointer: window.h.state.lastPointerDownWith,
  };
  act(() => mouse.up(100, 100));
  expect(
    window.h.elements.length,
    JSON.stringify({
      down,
      after: {
        activeTool: window.h.state.activeTool.type,
        elements: window.h.elements.length,
      },
    }),
  ).toBe(1);
  expect(window.h.elements[0].type).toBe("rectangle");
  rendered.unmount();
});
