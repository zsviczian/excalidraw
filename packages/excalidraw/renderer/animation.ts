import { isRenderThrottlingEnabled } from "../reactUtils";

export type Animation<R extends object> = (params: {
  deltaTime: number;
  state?: R;
}) => R | null | undefined;

type AnimationRecord = {
  animation: Animation<any>;
  lastTime: number;
  state: any;
  scheduler: AnimationScheduler; // zsviczian -- retain the window that owns this animation
};

// zsviczian START -- cross-document editors must not depend on the evaluated window's throttled timers
type AnimationScheduler = Pick<
  Window,
  | "requestAnimationFrame"
  | "cancelAnimationFrame"
  | "setTimeout"
  | "clearTimeout"
>;

type ScheduledFrame =
  | { id: number; type: "raf" }
  | { id: number; type: "timeout" };
// zsviczian END

export class AnimationController {
  private static scheduledFrames = new Map<
    AnimationScheduler,
    ScheduledFrame
  >(); // zsviczian -- schedule each mounted window independently
  private static animations = new Map<string, AnimationRecord>();

  static start<R extends object>(
    key: string,
    animation: Animation<R>,
    scheduler: AnimationScheduler = window, // zsviczian -- default preserves the upstream single-window API
  ) {
    if (AnimationController.animations.has(key)) {
      return;
    }

    const record: AnimationRecord = {
      animation,
      lastTime: 0,
      state: undefined,
      scheduler, // zsviczian -- use the mounted editor window for future frames
    };
    AnimationController.animations.set(key, record);

    let initialState: R | null | undefined;
    try {
      initialState = animation({
        deltaTime: 0,
        state: undefined,
      });
    } catch (error) {
      if (AnimationController.animations.get(key) === record) {
        AnimationController.animations.delete(key);
        AnimationController.cancelScheduledFrameIfIdle(record.scheduler); // zsviczian -- release only this window's pending frame
      }
      throw error;
    }

    // The initial callback may synchronously cancel this animation or replace
    // it with another animation under the same key. Never resurrect or
    // overwrite it after control returns.
    if (AnimationController.animations.get(key) !== record) {
      return;
    }

    if (!initialState) {
      AnimationController.animations.delete(key);
      AnimationController.cancelScheduledFrameIfIdle(record.scheduler); // zsviczian -- release only this window's pending frame
      return;
    }

    record.state = initialState;
    AnimationController.scheduleNextFrame(record.scheduler); // zsviczian -- do not depend on an occluded host window
  }

  private static scheduleNextFrame(scheduler: AnimationScheduler) {
    // zsviczian -- one queue per mounted window
    if (AnimationController.scheduledFrames.has(scheduler)) {
      return;
    }

    if (isRenderThrottlingEnabled()) {
      AnimationController.scheduledFrames.set(scheduler, {
        id: scheduler.requestAnimationFrame(() =>
          AnimationController.tick(scheduler),
        ), // zsviczian -- request the frame from the animation's owning window
        type: "raf",
      });
    } else {
      AnimationController.scheduledFrames.set(scheduler, {
        id: scheduler.setTimeout(() => AnimationController.tick(scheduler), 0), // zsviczian -- request the timer from the animation's owning window
        type: "timeout",
      });
    }
  }

  private static cancelScheduledFrame(scheduler: AnimationScheduler) {
    // zsviczian -- cancel the owning window's queue only
    const scheduledFrame = AnimationController.scheduledFrames.get(scheduler); // zsviczian -- avoid retaining an idle popout window
    if (!scheduledFrame) {
      return;
    }

    if (scheduledFrame.type === "raf") {
      scheduler.cancelAnimationFrame(scheduledFrame.id); // zsviczian -- cancel through the window that created the frame
    } else {
      scheduler.clearTimeout(scheduledFrame.id); // zsviczian -- cancel through the window that created the timer
    }

    AnimationController.scheduledFrames.delete(scheduler); // zsviczian -- release the window when its queue is idle
  }

  private static cancelScheduledFrameIfIdle(scheduler: AnimationScheduler) {
    // zsviczian -- other windows must not keep this queue alive
    if (
      [...AnimationController.animations.values()].some(
        (animation) => animation.scheduler === scheduler,
      )
    ) {
      return false;
    }

    AnimationController.cancelScheduledFrame(scheduler); // zsviczian -- release only the idle window
    return true;
  }

  private static tick(scheduler: AnimationScheduler) {
    // zsviczian -- advance only animations owned by this window
    AnimationController.scheduledFrames.delete(scheduler); // zsviczian -- the current callback is no longer pending

    const animations = [...AnimationController.animations].filter(
      ([, animation]) => animation.scheduler === scheduler,
    ); // zsviczian -- isolate main-window and popout animation queues

    if (animations.length > 0) {
      // A callback may synchronously add, cancel, or replace animations. Work
      // from the frame's starting set so newly started animations begin on the
      // next frame and every record runs at most once per tick.
      for (const [key, animation] of animations) {
        if (AnimationController.animations.get(key) !== animation) {
          continue;
        }

        const now = performance.now();
        const deltaTime =
          animation.lastTime === 0 ? 0 : now - animation.lastTime;

        const state = animation.animation({
          deltaTime,
          state: animation.state,
        });

        // The callback may have cancelled or replaced itself. Only the record
        // that was invoked is allowed to update or remove its registration.
        if (AnimationController.animations.get(key) !== animation) {
          continue;
        }

        if (!state) {
          AnimationController.animations.delete(key);

          if (AnimationController.cancelScheduledFrameIfIdle(scheduler)) {
            // zsviczian -- stop only this window's queue
            return;
          }
        } else {
          animation.lastTime = now;
          animation.state = state;
        }
      }

      if (AnimationController.cancelScheduledFrameIfIdle(scheduler)) {
        // zsviczian -- stop only this window's queue
        return;
      }

      AnimationController.scheduleNextFrame(scheduler); // zsviczian -- continue on the owning window
    }
  }

  static running(key: string) {
    return AnimationController.animations.has(key);
  }

  static cancel(key: string) {
    const record = AnimationController.animations.get(key); // zsviczian -- recover the queue that owns this animation
    AnimationController.animations.delete(key);
    if (record) {
      AnimationController.cancelScheduledFrameIfIdle(record.scheduler); // zsviczian -- release an idle popout queue immediately
    }
  }

  static reset() {
    AnimationController.animations.clear();
    for (const scheduler of [...AnimationController.scheduledFrames.keys()]) {
      AnimationController.cancelScheduledFrame(scheduler); // zsviczian -- clear every mounted window's pending frame
    }
  }
}
