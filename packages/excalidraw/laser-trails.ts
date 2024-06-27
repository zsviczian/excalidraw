import type { LaserPointerOptions } from "@zsviczian/laser-pointer";
import type { Trail } from "./animated-trail";
import { AnimatedTrail } from "./animated-trail";
import type { AnimationFrameHandler } from "./animation-frame-handler";
import type App from "./components/App";
import type { SocketId } from "./types";
import { easeOut } from "./utils";
import { getClientColor } from "./clients";
import { DEFAULT_LASER_COLOR } from "./constants";

//zsviczian
// decay time in milliseconds
const DECAY_TIME = 1000;
const getDecayTime = () =>
  (window as any).ExcalidrawAutomate?.LASERPOINTER?.DECAY_TIME ?? DECAY_TIME; //zsviczian
// length of line in points before it starts decaying
const DECAY_LENGTH = 50;
const getDecayLength = () =>
  (window as any).ExcalidrawAutomate?.LASERPOINTER?.DECAY_LENGTH ??
  DECAY_LENGTH; //zsviczian
const getColor = () =>
  (window as any).ExcalidrawAutomate?.LASERPOINTER?.COLOR ?? "red"; //zsviczian

export class LaserTrails implements Trail {
  public localTrail: AnimatedTrail;
  private collabTrails = new Map<SocketId, AnimatedTrail>();

  private container?: SVGSVGElement;

  constructor(
    private animationFrameHandler: AnimationFrameHandler,
    private app: App,
  ) {
    this.animationFrameHandler.register(this, this.onFrame.bind(this));

    this.localTrail = new AnimatedTrail(animationFrameHandler, app, {
      ...this.getTrailOptions(),
      fill: () => getColor(), //zsviczian
    });
  }

  private getTrailOptions() {
    return {
      simplify: 0,
      streamline: 0.4,
      sizeMapping: (c) => {
        const DECAY_TIME = getDecayTime(); //zsviczian
        const DECAY_LENGTH = getDecayLength(); //zsviczian 
        const t = Math.max(
          0,
          1 - (performance.now() - c.pressure) / DECAY_TIME,
        );
        const l =
          (DECAY_LENGTH -
            Math.min(DECAY_LENGTH, c.totalLength - c.currentIndex)) /
          DECAY_LENGTH;

        return Math.min(easeOut(l), easeOut(t));
      },
    } as Partial<LaserPointerOptions>;
  }

  startPath(x: number, y: number): void {
    this.localTrail.startPath(x, y);
  }

  addPointToPath(x: number, y: number): void {
    this.localTrail.addPointToPath(x, y);
  }

  endPath(): void {
    this.localTrail.endPath();
  }

  start(container: SVGSVGElement) {
    this.container = container;

    this.animationFrameHandler.start(this);
    this.localTrail.start(container);
  }

  stop() {
    this.animationFrameHandler?.stop(this); //zsviczian
    this.localTrail?.stop(); //zsviczian
  }

  terminate() { //zsviczian
    this.localTrail.terminate();
    //@ts-ignore
    this.localTrail = null;
    //@ts-ignore
    this.collabTrails = null;
    
    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    //@ts-ignore
    this.container = null;
    //@ts-ignore
    this.animationFrameHandler = null;
    //@ts-ignore
    this.app = null;
  }

  onFrame() {
    this.updateCollabTrails();
  }

  private updateCollabTrails() {
    if (!this.container || this.app.state.collaborators.size === 0) {
      return;
    }

    for (const [key, collaborator] of this.app.state.collaborators.entries()) {
      let trail!: AnimatedTrail;

      if (!this.collabTrails.has(key)) {
        trail = new AnimatedTrail(this.animationFrameHandler, this.app, {
          ...this.getTrailOptions(),
          fill: () =>
            collaborator.pointer?.laserColor ||
            getClientColor(key, collaborator),
        });
        trail.start(this.container);

        this.collabTrails.set(key, trail);
      } else {
        trail = this.collabTrails.get(key)!;
      }

      if (collaborator.pointer && collaborator.pointer.tool === "laser") {
        if (collaborator.button === "down" && !trail.hasCurrentTrail) {
          trail.startPath(collaborator.pointer.x, collaborator.pointer.y);
        }

        if (
          collaborator.button === "down" &&
          trail.hasCurrentTrail &&
          !trail.hasLastPoint(collaborator.pointer.x, collaborator.pointer.y)
        ) {
          trail.addPointToPath(collaborator.pointer.x, collaborator.pointer.y);
        }

        if (collaborator.button === "up" && trail.hasCurrentTrail) {
          trail.addPointToPath(collaborator.pointer.x, collaborator.pointer.y);
          trail.endPath();
        }
      }
    }

    for (const key of this.collabTrails.keys()) {
      if (!this.app.state.collaborators.has(key)) {
        const trail = this.collabTrails.get(key)!;
        trail.stop();
        this.collabTrails.delete(key);
      }
    }
  }
}
