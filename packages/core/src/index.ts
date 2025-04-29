import {
  PlayerOptions,
  PlayerHandle,
  RoutePoint,
  PlayerEventMap,
  PlayerEvent,
  RouteInput,
  CameraMode,
  CameraOptions,
  RendererType,
  Plugin,
} from "./types";
import { Animator } from "./animator";
import { MarkerRenderer } from "./renderers/marker";
import { PolylineRenderer } from "./renderers/polyline";
import { WebGLOverlayRenderer } from "./renderers/webgl";
import { interpolateRoute, InterpolatedPoint } from "./interpolator";
import type { IRenderer } from "./renderers/types";

export type {
  PlayerOptions,
  RoutePoint,
  RouteInput,
  CameraMode,
  CameraOptions,
  RendererType,
  Plugin,
  PlayerEventMap,
  PlayerEvent,
} from "./types";

export { GmRouteReplayOverlay } from "./overlay";

/*
export function createPlayer(options: PlayerOptions): PlayerHandle {

}
*/
