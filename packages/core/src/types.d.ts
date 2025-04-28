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
/** Configuration options for creating a new player instance. */
export interface PlayerOptions {
    /** The Google Maps instance to render on. */
    map: google.maps.Map;
    /** The route data, either as an array of points or a URL to a GPX/GeoJSON file. */
    route: RoutePoint[] | string;
    /** Target frames per second for animation (default: 60). */
    fps?: 60 | 30;
    /** Whether to automatically fit the map bounds to the route on load (default: true). */
    autoFit?: boolean;
    /** Options to pass to the underlying Google Maps Marker. */
    markerOptions?: google.maps.MarkerOptions;
    /** Interpolation method between points (default: 'linear'). */
    interpolation?: "linear" | "spline";
    /** Array of plugins to extend player functionality. */
    plugins?: Plugin[];
}
/** Events emitted by the player instance. */
export type PlayerEvent = "start" | "frame" | "pause" | "seek" | "finish" | "error";
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
    seek: (payload: {
        timeMs: number;
    }) => void;
    finish: () => void;
    error: (payload: {
        error: Error;
    }) => void;
}
/** The interface returned by `createPlayer`, providing control methods and event subscription. */
export interface PlayerHandle {
    /** Starts playback from the current position. */
    play(): void;
    /** Pauses playback at the current position. */
    pause(): void;
    /** Stops playback and resets the timeline to the beginning. */
    stop(): void;
    /** Seeks to an absolute time in milliseconds along the route timeline. */
    seek(ms: number): void;
    /** Sets the playback speed multiplier (e.g., 1 = normal, 2 = double speed). */
    setSpeed(multiplier: number): void;
    /** Sets the playback direction. */
    setDirection(dir: "forward" | "reverse"): void;
    /** Subscribes to player events. */
    on<E extends PlayerEvent>(event: E, callback: PlayerEventMap[E]): void;
    /** Cleans up resources used by the player instance. */
    destroy(): void;
}
/** Base interface for plugins. */
export interface Plugin {
    /** Called when the plugin is initialized with the player instance. */
    init(player: PlayerHandle): void;
    /** Called when the player instance is destroyed. */
    destroy(): void;
}
