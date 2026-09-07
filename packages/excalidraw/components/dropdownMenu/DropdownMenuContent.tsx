import clsx from "clsx";
import React, { useCallback, useEffect, useMemo } from "react";

import { CLASSES, EVENT, KEYS } from "@excalidraw/common";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useUIAppState } from "../../context/ui-appState";
import { useCallbackRefState } from "../../hooks/useCallbackRefState";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import { useStable } from "../../hooks/useStable";
import { useEditorInterface, useExcalidrawContainer } from "../App";
import { Island } from "../Island";
import { ObsidianRadixPortal } from "../ObsidianRadixPortal";
import Stack from "../Stack";

import { DropdownMenuContentPropsContext } from "./common";

const MenuContent = ({
  children,
  onClickOutside,
  className = "",
  onSelect,
  open = true,
  align = "end",
  style,
}: {
  children?: React.ReactNode;
  onClickOutside?: () => void;
  className?: string;
  /**
   * Called when any menu item is selected (clicked on).
   */
  onSelect?: (event: Event) => void;
  open?: boolean;
  style?: React.CSSProperties;
  align?: "start" | "center" | "end";
}) => {
  const editorInterface = useEditorInterface();
  const { container } = useExcalidrawContainer(); //zsviczian -- resolve the correct Obsidian popout document and collision boundary
  const appState = useUIAppState(); //zsviczian
  const [menuNode, setMenuNode] = useCallbackRefState<HTMLDivElement>();
  // Radix mounts the content lazily. Rebind outside-click listeners when the
  // node becomes available so they attach to its owner document.
  const menuRef = useMemo(() => ({ current: menuNode }), [menuNode]);

  const callbacksRef = useStable({ onClickOutside });

  useOutsideClick(
    menuRef,
    useCallback(
      (event) => {
        // prevents closing if clicking on the trigger button
        if (
          !event.target.closest(`.${CLASSES.DROPDOWN_MENU_EVENT_WRAPPER}`) // zsviczian -- portaled content is not a DOM descendant of the trigger wrapper
        ) {
          callbacksRef.onClickOutside?.();
        }
      },
      [callbacksRef],
    ),
  );

  useEffect(() => {
    if (!open || !menuNode) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYS.ESCAPE) {
        event.preventDefault();
        event.stopImmediatePropagation();
        callbacksRef.onClickOutside?.();
      }
    };

    const option = {
      // so that we can stop propagation of the event before it reaches
      // event handlers that were bound before this one
      capture: true,
    };

    const ownerDocument = menuNode.ownerDocument;
    ownerDocument.addEventListener(EVENT.KEYDOWN, onKeyDown, option);
    return () => {
      ownerDocument.removeEventListener(EVENT.KEYDOWN, onKeyDown, option);
    };
  }, [callbacksRef, open, menuNode]);

  const classNames = clsx(`dropdown-menu ${className}`, {
    "dropdown-menu--mobile": editorInterface.formFactor === "phone",
    "dropdown-menu--tray":
      editorInterface.formFactor !== "phone" &&
      editorInterface.desktopUIMode === "tray" &&
      appState.openMenu === "canvas", //zsviczian
  }).trim();

  return (
    <DropdownMenuContentPropsContext.Provider value={{ onSelect }}>
      {/* zsviczian START -- body-level portal prevents vertical displacement in Obsidian popout windows, #10221 */}
      <ObsidianRadixPortal
        portal={DropdownMenuPrimitive.Portal}
        container={container}
      >
        <DropdownMenuPrimitive.Content
          ref={setMenuNode}
          className={classNames}
          style={style}
          data-testid="dropdown-menu"
          align={align}
          sideOffset={8}
          collisionBoundary={container ?? undefined} //zsviczian -- constrain the portaled menu to the Excalidraw viewport, #10221
          onCloseAutoFocus={(event: Event) => event.preventDefault()}
        >
          {/* the zIndex ensures this menu has higher stacking order,
    see https://github.com/excalidraw/excalidraw/pull/1445 */}
          {editorInterface.formFactor === "phone" ? (
            <Stack.Col className="dropdown-menu-container">
              {children}
            </Stack.Col>
          ) : (
            <Island className="dropdown-menu-container" padding={2}>
              {children}
            </Island>
          )}
        </DropdownMenuPrimitive.Content>
      </ObsidianRadixPortal>
      {/* zsviczian END */}
    </DropdownMenuContentPropsContext.Provider>
  );
};
MenuContent.displayName = "DropdownMenuContent";

export default MenuContent;
