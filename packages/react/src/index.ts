// Export the component and its handle type
export { RouteReplay } from "./component";
export type { RouteReplayHandle } from "./component";

// Re-export relevant core types if needed by consumers
// This makes it easier for users importing the React package
export type {
  RouteInput,
  RoutePoint,
  CameraMode,
  CameraOptions,
  // PlayerOptions as RouteReplayOptions, // Maybe rename options for the component?
  PlayerEventMap, // Keep for event handler types
  PlayerEvent,
} from "gm-route-replay-core";
