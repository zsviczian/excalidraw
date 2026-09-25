import clsx from "clsx";
import React, { useEffect, useRef } from "react"; // zsviczian -- retain the trigger's document for cross-document cleanup, upstream #11974 follow-up

import "./Tooltip.scss";

export const getTooltipDiv = (
  ownerDocument: Document, // zsviczian -- keep tooltip singletons document-local, upstream #11974 follow-up
) => {
  const existingDiv = ownerDocument.querySelector<HTMLDivElement>( // zsviczian -- query the mounted editor document, upstream #11974 follow-up
    ".excalidraw-tooltip",
  );
  if (existingDiv) {
    return existingDiv;
  }
  const div = ownerDocument.createElement("div"); // zsviczian -- create in the mounted editor document, upstream #11974 follow-up
  ownerDocument.body.appendChild(div); // zsviczian -- portal beside the mounted editor, upstream #11974 follow-up
  div.classList.add("excalidraw-tooltip");
  return div;
};

export const updateTooltipPosition = (
  tooltip: HTMLDivElement,
  item: {
    left: number;
    top: number;
    width: number;
    height: number;
  },
  position: "bottom" | "top" = "bottom",
) => {
  const tooltipRect = tooltip.getBoundingClientRect();
  const ownerWindow = tooltip.ownerDocument.defaultView; // zsviczian -- measure the tooltip's viewport, upstream #11974 follow-up
  if (
    !ownerWindow // zsviczian -- detached documents have no usable viewport, upstream #11974 follow-up
  ) {
    return;
  }

  const viewportWidth = ownerWindow.innerWidth; // zsviczian -- use the mounted editor viewport, upstream #11974 follow-up
  const viewportHeight = ownerWindow.innerHeight; // zsviczian -- use the mounted editor viewport, upstream #11974 follow-up

  const margin = 5;

  let left = item.left + item.width / 2 - tooltipRect.width / 2;
  if (left < 0) {
    left = margin;
  } else if (left + tooltipRect.width >= viewportWidth) {
    left = viewportWidth - tooltipRect.width - margin;
  }

  let top: number;

  if (position === "bottom") {
    top = item.top + item.height + margin;
    if (top + tooltipRect.height >= viewportHeight) {
      top = item.top - tooltipRect.height - margin;
    }
  } else {
    top = item.top - tooltipRect.height - margin;
    if (top < 0) {
      top = item.top + item.height + margin;
    }
  }

  Object.assign(tooltip.style, {
    top: `${top}px`,
    left: `${left}px`,
  });
};

/** ms before a `delay`ed tooltip shows */
const TOOLTIP_DELAY = 500;
/**
 * ms after a tooltip hides during which a `delay`ed tooltip shows right away
 * (e.g. when moving across adjacent buttons)
 */
const TOOLTIP_WARM_WINDOW = 300;

// zsviczian START -- isolate delayed tooltip state per owner document, upstream #11997
type TooltipRuntimeState = {
  showTooltipTimer: number;
  tooltipHiddenAt: number;
};

const tooltipRuntimeState = new WeakMap<Document, TooltipRuntimeState>();

const getTooltipRuntimeState = (ownerDocument: Document) => {
  let state = tooltipRuntimeState.get(ownerDocument);
  if (!state) {
    state = { showTooltipTimer: 0, tooltipHiddenAt: 0 };
    tooltipRuntimeState.set(ownerDocument, state);
  }
  return state;
};

const hideTooltip = (ownerDocument: Document) => {
  const state = getTooltipRuntimeState(ownerDocument);
  ownerDocument.defaultView?.clearTimeout(state.showTooltipTimer);
  const tooltip = getTooltipDiv(ownerDocument);
  if (tooltip.classList.contains("excalidraw-tooltip--visible")) {
    tooltip.classList.remove("excalidraw-tooltip--visible");
    state.tooltipHiddenAt = Date.now();
  }
};
// zsviczian END

const updateTooltip = (
  item: HTMLDivElement,
  tooltip: HTMLDivElement,
  label: string,
  long: boolean,
) => {
  tooltip.classList.add("excalidraw-tooltip--visible");
  tooltip.style.minWidth = long ? "50ch" : "10ch";
  tooltip.style.maxWidth = long ? "50ch" : "15ch";

  tooltip.textContent = label;

  const itemRect = item.getBoundingClientRect();
  updateTooltipPosition(tooltip, itemRect);
};

type TooltipProps = {
  children: React.ReactNode;
  label: string;
  long?: boolean;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  /** show after a short delay (unless a tooltip was visible just now) */
  delay?: boolean;
};

export const Tooltip = ({
  children,
  label,
  long = false,
  style,
  className,
  disabled,
  delay = false,
}: TooltipProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null); // zsviczian -- capture this tooltip trigger's document, upstream #11974 follow-up
  useEffect(() => {
    const ownerDocument = wrapperRef.current?.ownerDocument; // zsviczian -- retain the live owner before ref cleanup, upstream #11974 follow-up
    return () => {
      if (ownerDocument) {
        hideTooltip(ownerDocument); // zsviczian -- clean only this document's tooltip and delayed timer, upstream #11997
      }
    };
  }, []);
  if (disabled) {
    return null;
  }
  return (
    <div
      ref={
        wrapperRef /* zsviczian -- expose the trigger document to cleanup, upstream #11974 follow-up */
      }
      className={clsx("excalidraw-tooltip-wrapper", className)}
      onPointerEnter={(event) => {
        const item = event.currentTarget as HTMLDivElement;
        const ownerDocument = item.ownerDocument;
        const ownerWindow = ownerDocument.defaultView;
        if (!ownerWindow) {
          return;
        }
        const state = getTooltipRuntimeState(ownerDocument); // zsviczian -- use this trigger document's delay state, upstream #11997
        const show = () =>
          updateTooltip(
            item,
            getTooltipDiv(ownerDocument), // zsviczian -- show in the trigger document, upstream #11974 follow-up
            label,
            long,
          );
        ownerWindow.clearTimeout(state.showTooltipTimer); // zsviczian -- manage delayed work through the trigger window, upstream #11997
        if (delay && Date.now() - state.tooltipHiddenAt > TOOLTIP_WARM_WINDOW) {
          state.showTooltipTimer = ownerWindow.setTimeout(
            // zsviczian -- schedule in the trigger window, upstream #11997
            show,
            TOOLTIP_DELAY,
          );
        } else {
          show();
        }
      }}
      onPointerLeave={
        (event) => hideTooltip(event.currentTarget.ownerDocument) // zsviczian -- hide only in the trigger document, upstream #11997
      }
      style={style}
    >
      {children}
    </div>
  );
};
