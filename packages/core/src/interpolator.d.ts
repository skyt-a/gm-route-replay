import type { RoutePoint } from "./types";
export interface InterpolatedPoint {
    lat: number;
    lng: number;
    heading?: number;
    /** Progress along the entire route (0.0 to 1.0) */
    progress: number;
}
/**
 * Finds the segment and interpolation factor for a given time in the route.
 * @param route Sorted array of RoutePoints.
 * @param timeMs The target time in milliseconds (relative to the route's start time).
 * @param startTimeMs The timestamp of the first point in the route.
 * @param durationMs The total duration of the route.
 * @returns The interpolated point, or null if time is out of bounds.
 */
export declare function interpolateRoute(route: RoutePoint[], timeMs: number, startTimeMs: number, durationMs: number): InterpolatedPoint | null;
