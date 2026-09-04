import React, { useLayoutEffect, useState } from "react";

type RadixPortalComponent = React.ComponentType<
  React.PropsWithChildren<{
    container?: HTMLElement;
  }>
>;

type ObsidianRadixPortalProps = {
  children: React.ReactNode;
  container: HTMLDivElement | null;
  portal: RadixPortalComponent;
};

type BridgeStyle = React.CSSProperties &
  Record<string, string | number | undefined>;

const readBridgeStyle = (container: HTMLDivElement | null): BridgeStyle => {
  const style: BridgeStyle = { display: "contents" };
  if (container) {
    Array.from(container.style).forEach((propertyName) => {
      if (propertyName === "color" || propertyName.startsWith("--")) {
        style[propertyName] = container.style.getPropertyValue(propertyName);
      }
    });
  }
  return style;
};

const isSameBridgeStyle = (a: BridgeStyle, b: BridgeStyle) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key])
  );
};

const isContainerVisible = (container: HTMLDivElement | null) => {
  if (!container?.ownerDocument.defaultView) {
    return true;
  }
  return container.isConnected && container.getClientRects().length > 0;
};

/**
 * Purpose:
 *   Render Radix floating-position wrappers directly under the owning
 *   document's body. Obsidian popout windows place Excalidraw inside an
 *   offset containing block, which otherwise displaces Radix's fixed wrapper.
 *   The display:contents bridge retains Excalidraw's scoped theme rules and
 *   inline CSS variables without creating another containing block.
 *
 * Author:
 *   zsviczian
 *
 * References:
 *   https://github.com/excalidraw/excalidraw/pull/10221
 *
 * Notes:
 *   This is specific to Excalidraw hosted in Obsidian's Electron popouts.
 *   The bridge style is re-synced in a `useLayoutEffect` rather than read
 *   inline during render: render always observes the *previous* commit's
 *   `container.style` (React hasn't flushed this render's DOM writes yet),
 *   so a style that changes while the portal is already open — e.g. dynamic
 *   canvas-color theming while its color-picker popover is open — was
 *   captured one commit stale and stuck that way until the popover was
 *   closed and reopened (a fresh mount reads current DOM state). The
 *   `useLayoutEffect` runs after the commit, so it observes the live value;
 *   the shallow-equality check keeps it from looping once synced.
 *   The body portal cannot inherit the source workspace leaf's visibility, so
 *   the bridge mirrors whether the Excalidraw container has a layout box. This
 *   keeps the Radix content mounted and its open state intact while Obsidian
 *   hides the tab, then reveals the same content when the tab becomes visible.
 */
export const ObsidianRadixPortal = ({
  children,
  container,
  portal: Portal,
}: ObsidianRadixPortalProps) => {
  const [bridgeStyle, setBridgeStyle] = useState(() =>
    readBridgeStyle(container),
  );
  const [containerVisible, setContainerVisible] = useState(() =>
    isContainerVisible(container),
  );

  // This must run after every commit because the container's inline theme
  // variables may have been written by that same React commit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next = readBridgeStyle(container);
    setBridgeStyle((prev) => (isSameBridgeStyle(prev, next) ? prev : next));
  });

  // zsviczian START -- mirror source-tab visibility without closing portaled UI
  useLayoutEffect(() => {
    const syncContainerVisibility = () => {
      const next = isContainerVisible(container);
      setContainerVisible((prev) => (prev === next ? prev : next));
    };

    syncContainerVisibility();

    const ResizeObserverCtor =
      container?.ownerDocument.defaultView?.ResizeObserver;
    if (!container || !ResizeObserverCtor) {
      return;
    }

    const resizeObserver = new ResizeObserverCtor(syncContainerVisibility);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [container]);
  // zsviczian END

  return (
    <Portal container={container?.ownerDocument.body}>
      <div
        className={container?.className}
        style={
          containerVisible ? bridgeStyle : { ...bridgeStyle, display: "none" }
        }
        data-radix-portal // zsviczian -- keep body-portaled UI inside sidebar outside-click handling
      >
        {children}
      </div>
    </Portal>
  );
};
