import type { RoutePoint } from "./types";

/**
 * Linearly interpolates between two numbers.
 * @param a Start value.
 * @param b End value.
 * @param t Interpolation factor (0.0 to 1.0).
 * @returns Interpolated value.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linearly interpolates heading, handling wrapping around 360 degrees.
 * @param h1 Start heading (degrees).
 * @param h2 End heading (degrees).
 * @param t Interpolation factor (0.0 to 1.0).
 * @returns Interpolated heading (degrees).
 */
function interpolateHeading(h1: number, h2: number, t: number): number {
  const diff = h2 - h1;
  const delta = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
  return (h1 + delta * t + 360) % 360;
}

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
export function interpolateRoute(
  route: RoutePoint[],
  timeMs: number,
  startTimeMs: number,
  durationMs: number
): InterpolatedPoint | null {
  if (!route || route.length < 2 || timeMs < 0 || timeMs > durationMs) {
    // Return start or end point if slightly out of bounds due to timing?
    // For now, return null if strictly out of bounds.
    if (timeMs <= 0 && route.length > 0) {
      return {
        lat: route[0].lat,
        lng: route[0].lng,
        heading: route[0].heading,
        progress: 0,
      };
    }
    if (timeMs >= durationMs && route.length > 0) {
      const lastPoint = route[route.length - 1];
      return {
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        heading: lastPoint.heading,
        progress: 1,
      };
    }
    return null;
  }

  const targetTimestamp = startTimeMs + timeMs;

  // Find the segment [p1, p2] that contains the targetTimestamp
  let p1: RoutePoint | null = null;
  let p2: RoutePoint | null = null;
  for (let i = 0; i < route.length - 1; i++) {
    if (targetTimestamp >= route[i].t && targetTimestamp <= route[i + 1].t) {
      p1 = route[i];
      p2 = route[i + 1];
      break;
    }
  }

  // This should generally not happen if timeMs is within bounds, but handle defensively
  if (!p1 || !p2) {
    // Fallback to the last point if something went wrong
    const lastPoint = route[route.length - 1];
    console.warn("Interpolator fallback triggered for timeMs:", timeMs);
    return {
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      heading: lastPoint.heading,
      progress: 1,
    };
    // return null;
  }

  // Calculate interpolation factor 't' within the segment [p1, p2]
  const segmentDuration = p2.t - p1.t;
  // Avoid division by zero if timestamps are identical
  const t =
    segmentDuration > 0 ? (targetTimestamp - p1.t) / segmentDuration : 1.0;

  const lat = lerp(p1.lat, p2.lat, t);
  const lng = lerp(p1.lng, p2.lng, t);
  let heading: number | undefined = undefined;

  // Interpolate heading if both points have it
  if (p1.heading !== undefined && p2.heading !== undefined) {
    heading = interpolateHeading(p1.heading, p2.heading, t);
  } else {
    // If only one point has heading, or for the last segment, use the start point's heading
    heading = p1.heading;
  }

  const progress =
    durationMs > 0 ? timeMs / durationMs : timeMs >= durationMs ? 1 : 0;

  return { lat, lng, heading, progress: Math.min(1, Math.max(0, progress)) }; // Clamp progress
}
