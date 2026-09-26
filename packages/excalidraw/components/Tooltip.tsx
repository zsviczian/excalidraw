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
  /**
   * while a tooltip is visible, hides it once its item is removed from the DOM
   * (e.g. unmounted while hovered, which doesn't fire pointerleave)
   */
  tooltipItemObserver: MutationObserver | null;
};

const tooltipRuntimeState = new WeakMap<Document, TooltipRuntimeState>();

const getTooltipRuntimeState = (ownerDocument: Document) => {
  let state = tooltipRuntimeState.get(ownerDocument);
  if (!state) {
    state = {
      showTooltipTimer: 0,
      tooltipHiddenAt: 0,
      tooltipItemObserver: null,
    };
    tooltipRuntimeState.set(ownerDocument, state);
  }
  return state;
};

type TooltipOwner = Document | React.PointerEvent<HTMLElement>;

const getTooltipOwnerDocument = (owner?: TooltipOwner) =>
  owner && "currentTarget" in owner
    ? owner.currentTarget.ownerDocument
    : owner ?? document;

export const hideTooltip = (owner?: TooltipOwner) => {
  const ownerDocument = getTooltipOwnerDocument(owner);
  const state = getTooltipRuntimeState(ownerDocument);
  ownerDocument.defaultView?.clearTimeout(state.showTooltipTimer);
  state.tooltipItemObserver?.disconnect();
  state.tooltipItemObserver = null;
  const tooltip = getTooltipDiv(ownerDocument);
  if (tooltip.classList.contains("excalidraw-tooltip--visible")) {
    tooltip.classList.remove("excalidraw-tooltip--visible");
    state.tooltipHiddenAt = Date.now();
  }
};
// zsviczian END

const updateTooltip = (
  item: HTMLElement,
  tooltip: HTMLDivElement,
  label: string,
  long: boolean,
  position: "bottom" | "top",
) => {
  tooltip.classList.add("excalidraw-tooltip--visible");
  tooltip.style.minWidth = long ? "50ch" : "10ch";
  tooltip.style.maxWidth = long ? "50ch" : "15ch";

  tooltip.textContent = label;

  const itemRect = item.getBoundingClientRect();
  updateTooltipPosition(tooltip, itemRect, position);

  const ownerDocument = item.ownerDocument; // zsviczian -- observe the mounted editor document, upstream #11997
  const ownerWindow = ownerDocument.defaultView; // zsviczian -- construct the observer in the item's realm, upstream #11997
  if (!ownerWindow) {
    return;
  }
  const state = getTooltipRuntimeState(ownerDocument);
  state.tooltipItemObserver?.disconnect();
  state.tooltipItemObserver = new ownerWindow.MutationObserver(() => {
    if (!item.isConnected) {
      hideTooltip(ownerDocument); // zsviczian -- hide only this document's tooltip, upstream #11997
    }
  });
  state.tooltipItemObserver.observe(ownerDocument.body, {
    childList: true,
    subtree: true,
  });
};

/**
 * Shows the tooltip for `item`. For elements that can't be wrapped
 * in <Tooltip>. Pair with `hideTooltip()`.
 */
export const showTooltip = (
  item: HTMLElement,
  label: string,
  {
    long = false,
    delay = false,
    position = "bottom",
  }: {
    long?: boolean;
    /** show after a short delay (unless a tooltip was visible just now) */
    delay?: boolean;
    position?: "bottom" | "top";
  } = {},
) => {
  const ownerDocument = item.ownerDocument; // zsviczian -- keep the tooltip in the item's document, upstream #11997
  const ownerWindow = ownerDocument.defaultView; // zsviczian -- schedule delayed work in the item's realm, upstream #11997
  if (!ownerWindow) {
    return;
  }
  const state = getTooltipRuntimeState(ownerDocument);
  const show = () => {
    // item may have been unmounted while the delayed tooltip was pending
    if (item.isConnected) {
      updateTooltip(item, getTooltipDiv(ownerDocument), label, long, position);
    }
  };
  ownerWindow.clearTimeout(state.showTooltipTimer);
  if (delay && Date.now() - state.tooltipHiddenAt > TOOLTIP_WARM_WINDOW) {
    state.showTooltipTimer = ownerWindow.setTimeout(show, TOOLTIP_DELAY);
  } else {
    show();
  }
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
      onPointerEnter={(event) =>
        showTooltip(event.currentTarget, label, { long, delay })
      }
      onPointerLeave={hideTooltip}
      style={style}
    >
      {children}
    </div>
  );
};
