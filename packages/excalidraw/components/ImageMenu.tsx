import clsx from "clsx";

import type { AppClassProperties } from "../types";

import { runAction, t2 } from "../obsidianUtils";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import {
  Card,
  ImageIcon,
  InsertAnyFileIcon,
  LaTeXIcon,
} from "./icons";
import { isToolButtonDisabled } from "./Tools";

type ImageMenuItemsProps = {
  app: AppClassProperties;
};

//zsviczian custom image menu shared across toolbars
export const ImageMenuItems = ({ app }: ImageMenuItemsProps) => {
  return (
    <>
      <DropdownMenu.Item
        onSelect={() => app.setActiveTool({ type: "image" })}
        icon={ImageIcon}
        data-testid="toolbar-image-import"
        disabled={isToolButtonDisabled(app, "image")}
      >
        {t2("COMP_IMG_FROM_SYSTEM")}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onSelect={() => runAction("anyFile")}
        icon={InsertAnyFileIcon}
        data-testid="toolbar-any-file"
      >
        {t2("COMP_IMG_ANY_FILE")}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onSelect={() => runAction("card")}
        icon={Card}
        data-testid="toolbar-card"
      >
        {t2("INSERT_CARD")}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onSelect={() => runAction("LaTeX")}
        icon={LaTeXIcon}
        data-testid="toolbar-latex"
      >
        {t2("COMP_IMG_LaTeX")}
      </DropdownMenu.Item>
    </>
  );
};

type ImageMenuProps = {
  app: AppClassProperties;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerClassName?: string;
};

//zsviczian custom image menu shared across toolbars
export const ImageMenu = ({
  app,
  open,
  onToggle,
  onClose,
  triggerClassName,
}: ImageMenuProps) => {
  return (
    <DropdownMenu open={open}>
      <DropdownMenu.Trigger
        className={clsx("App-toolbar__extra-tools-trigger", triggerClassName)}
        onToggle={onToggle}
        title={t2("COMP_IMG")}
      >
        {ImageIcon}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onClickOutside={onClose}
        onSelect={onClose}
        className="App-toolbar__extra-tools-dropdown"
      >
        <ImageMenuItems app={app} />
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
