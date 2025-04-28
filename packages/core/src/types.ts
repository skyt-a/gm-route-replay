// Defined according to the technical specification v0.1, section 6.

/** Represents a single point along the route with time and optional heading/elevation. */
export interface RoutePoint {
  /** Latitude in degrees. */
  lat: number;
  /** Longitude in degrees. */
  lng: number;
  /** Timestamp in Unix milliseconds. */
  t: number;
  /** Optional heading in degrees (0-360). */
  heading?: number;
  /** Optional elevation in meters. */
  elev?: number;
}

/** Input format for route data. Can be a single route, multiple named routes, or a URL. */
export type RouteInput =
  | RoutePoint[]
  | { [trackId: string]: RoutePoint[] }
  | string;

/** Configuration options for creating a new player instance. */
export interface PlayerOptions {
  /** The Google Maps instance to render on. */
  map: google.maps.Map;
  /** The route data. */
  route: RouteInput;
  /** Target frames per second for animation (default: 60). */
  fps?: 60 | 30;
  /** Initial playback speed (default 1). */
  initialSpeed?: number;
  /** Whether to automatically fit the map bounds to the route on load (default: true). */
  autoFit?: boolean;
  /** Options to pass to the underlying Google Maps Marker(s). Applied to all tracks unless overridden. */
  markerOptions?: google.maps.MarkerOptions;
  /** Options to pass to the underlying Google Maps Polyline(s) (if enabled). Applied to all tracks unless overridden. */
  polylineOptions?: google.maps.PolylineOptions;
  /** Interpolation method between points (default: 'linear'). */
  interpolation?: "linear" | "spline";
  /** Array of plugins to extend player functionality. */
  plugins?: Plugin[];
}

/** Events emitted by the player instance. */
export type PlayerEvent =
  | "start"
  | "frame"
  | "pause"
  | "seek"
  | "finish"
  | "error";

/** Type definition for the payload of each player event. */
export interface PlayerEventMap {
  start: () => void;
  frame: (payload: {
    trackId: string | number;
    pos: google.maps.LatLngLiteral;
    heading?: number;
    progress: number;
  }) => void;
  pause: () => void;
  seek: (payload: { timeMs: number }) => void;
  finish: () => void;
  error: (payload: { error: Error }) => void;
}

/** The interface returned by `createPlayer`, providing control methods and event subscription. */
export interface PlayerHandle {
  /** Starts or resumes playback from the current time. */
  play(): void;
  /** Pauses playback at the current time. */
  pause(): void;
  /** Stops playback and resets the time to the beginning. */
  stop(): void;
  /** Jumps to a specific time in the playback timeline. */
  seek(ms: number): void;
  /** Sets the playback speed multiplier (e.g., 1 for normal, 2 for double speed). */
  setSpeed(multiplier: number): void;
  /** Sets the playback direction (not implemented yet). */
  setDirection(dir: "forward" | "reverse"): void;
  /** Registers an event listener. */
  on<E extends PlayerEvent>(ev: E, cb: PlayerEventMap[E]): void;
  /** Cleans up the player instance, removes map elements, and stops animation. */
  destroy(): void;
}

/** Base interface for plugins. */
export interface Plugin {
  /** Called when the plugin is initialized with the player instance. */
  init(player: PlayerHandle): void;
  /** Called when the player instance is destroyed. */
  destroy(): void;
}
