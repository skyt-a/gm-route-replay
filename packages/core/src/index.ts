// /// <reference types="@types/google.maps" />

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

// Export core types
export type {
  PlayerOptions, // Keep PlayerOptions, but maybe rename/adjust for Overlay?
  RoutePoint,
  RouteInput,
  CameraMode,
  CameraOptions,
  RendererType,
  Plugin,
  PlayerEventMap, // Keep event map for compatibility?
  PlayerEvent,
} from "./types";

// Export the new Overlay class
export { GmRouteReplayOverlay } from "./overlay";

// Comment out or remove the old createPlayer function
/*
export function createPlayer(options: PlayerOptions): PlayerHandle {
  // ... existing createPlayer code ...
}
*/

// Export utility functions or constants if any
// export * from './utils'; // Example
