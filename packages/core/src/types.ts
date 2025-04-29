export interface RoutePoint {
  lat: number;

  lng: number;

  t: number;

  heading?: number;

  elev?: number;
}

export type RouteInput =
  | RoutePoint[]
  | { [trackId: string]: RoutePoint[] }
  | string;

export type CameraMode = "center" | "ahead" | "none";

export interface CameraOptions {
  aheadDistance?: number;

  defaultTilt?: number;

  zoomLevel?: number;
}

export type RendererType = "marker" | "webgl";

export interface PlayerOptions {
  map: google.maps.Map;

  route: RouteInput;

  fps?: 60 | 30;

  initialSpeed?: number;

  autoFit?: boolean;

  markerOptions?: google.maps.MarkerOptions;

  polylineOptions?: google.maps.PolylineOptions;

  interpolation?: "linear" | "spline";

  plugins?: Plugin[];

  cameraMode?: CameraMode;
  cameraOptions?: CameraOptions;

  rendererType?: RendererType;
}

export type PlayerEvent =
  | "start"
  | "frame"
  | "pause"
  | "seek"
  | "finish"
  | "error";

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

export interface PlayerHandle {
  play(): void;

  pause(): void;

  stop(): void;

  seek(ms: number): void;

  setSpeed(multiplier: number): void;

  setDirection(dir: "forward" | "reverse"): void;

  setCameraMode(mode: CameraMode, options?: CameraOptions): void;

  on<E extends PlayerEvent>(ev: E, cb: PlayerEventMap[E]): void;

  destroy(): void;
}

export interface Plugin {
  init(player: PlayerHandle): void;

  destroy(): void;
}
