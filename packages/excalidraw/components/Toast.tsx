import { useCallback, useEffect, useRef } from "react";

import { useStableCallback } from "../hooks/useStableCallback";

import { CloseIcon } from "./icons";
import { IconButton } from "./IconButton";

import "./Toast.scss";

import type { CSSProperties, MouseEvent, ReactNode } from "react";

const DEFAULT_TOAST_TIMEOUT = 5000;

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="Toast__progress-bar">
    <div
      className="Toast__progress-bar-fill"
      style={{
        width: `${Math.min(5, Math.round(progress * 100))}%`,
      }}
    />
  </div>
);

const ToastComponent = ({
  message,
  onClose,
  closable = false,
  // To prevent autoclose, pass duration as Infinity
  duration = DEFAULT_TOAST_TIMEOUT,
  action,
  timerKey,
  style,
}: {
  message: ReactNode;
  onClose: () => void;
  closable?: boolean;
  duration?: number;
  /** a link-like button after the message; it closes the toast, too */
  action?: { label: string; onClick: () => void };
  /**
   * What the toast is shown for (its host's toast object, say): shown for
   * something else, even if with the same message, it's given its full
   * duration again.
   */
  timerKey?: unknown;
  style?: CSSProperties;
}) => {
  const toastRef = useRef<HTMLDivElement>(null); // zsviczian -- schedule and clear in the mounted toast’s window
  const timerRef = useRef<number>(0);
  const shouldAutoClose = duration !== Infinity;
  // the host's onClose is likely a new function each render: the timer's
  // restarted only for another toast (`timerKey`, or its message), not on a
  // render
  const stableOnClose = useStableCallback(onClose);
  // zsviczian START -- keep the timeout in the mounted editor's window, including popouts, PR #497
  const scheduleTimeout = useCallback(
    (ownerWindow: Window) => {
      if (!shouldAutoClose) {
        return;
      }
      timerRef.current = ownerWindow.setTimeout(
        () => stableOnClose(),
        duration,
      );
    },
    [stableOnClose, duration, shouldAutoClose],
  );

  useEffect(() => {
    const ownerWindow = toastRef.current?.ownerDocument.defaultView;
    if (!shouldAutoClose || !ownerWindow) {
      return;
    }
    scheduleTimeout(ownerWindow);
    return () => ownerWindow.clearTimeout(timerRef.current);
  }, [scheduleTimeout, message, timerKey, duration, shouldAutoClose]);

  const onMouseEnter = shouldAutoClose
    ? (event: MouseEvent<HTMLDivElement>) =>
        event.currentTarget.ownerDocument.defaultView?.clearTimeout(
          timerRef.current,
        )
    : undefined;
  const onMouseLeave = shouldAutoClose
    ? (event: MouseEvent<HTMLDivElement>) => {
        const ownerWindow = event.currentTarget.ownerDocument.defaultView;
        if (ownerWindow) {
          scheduleTimeout(ownerWindow);
        }
      }
    : undefined;
  // zsviczian END
  return (
    <div
      ref={toastRef} // zsviczian -- resolve the mounted toast’s window
      className="Toast"
      role="status"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      <div className="Toast__message">
        {message}
        {action && (
          <>
            {" "}
            <button
              type="button"
              className="Toast__action"
              onClick={() => {
                onClose();
                action.onClick();
              }}
            >
              {action.label}
            </button>
          </>
        )}
      </div>
      {closable && (
        <IconButton
          icon={CloseIcon}
          aria-label="close"
          type="icon"
          onClick={onClose}
          className="close"
        />
      )}
    </div>
  );
};

export const Toast = Object.assign(ToastComponent, { ProgressBar });
