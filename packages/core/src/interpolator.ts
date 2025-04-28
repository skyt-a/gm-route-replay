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
 * Calculates heading based on segment direction if not present in data.
 * Requires google.maps.geometry library to be loaded for heading calculation.
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
  // --- Time bounds check (return start/end point) ---
  if (timeMs <= 0 && route.length > 0) {
    // Calculate heading from first segment if needed
    let heading = route[0].heading;
    if (
      heading === undefined &&
      route.length > 1 &&
      typeof google?.maps?.geometry?.spherical !== "undefined"
    ) {
      heading = google.maps.geometry.spherical.computeHeading(
        route[0],
        route[1]
      );
    }
    return {
      lat: route[0].lat,
      lng: route[0].lng,
      heading: heading,
      progress: 0,
    };
  }
  if (timeMs >= durationMs && route.length > 0) {
    const lastPoint = route[route.length - 1];
    // Calculate heading from last segment if needed
    let heading = lastPoint.heading;
    if (
      heading === undefined &&
      route.length > 1 &&
      typeof google?.maps?.geometry?.spherical !== "undefined"
    ) {
      heading = google.maps.geometry.spherical.computeHeading(
        route[route.length - 2],
        lastPoint
      );
    }
    return {
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      heading: heading,
      progress: 1,
    };
  }
  if (!route || route.length < 2 || timeMs < 0 || timeMs > durationMs) {
    return null; // Should not happen after bounds check, but safety return
  }
  // --- End Time bounds check ---

  const targetTimestamp = startTimeMs + timeMs;

  // Find the segment [p1, p2]
  let p1: RoutePoint | null = null;
  let p2: RoutePoint | null = null;
  // Optimize search? For now, linear scan is fine.
  for (let i = 0; i < route.length - 1; i++) {
    // Handle segment with zero duration (identical timestamps)
    if (route[i].t === route[i + 1].t) {
      // If target time matches the identical timestamp, use the second point of the pair
      if (targetTimestamp === route[i].t) {
        p1 = route[i];
        p2 = route[i + 1];
        break;
      }
      // Otherwise, skip this zero-duration segment for finding the interval
      continue;
    }
    // Normal segment check
    if (targetTimestamp >= route[i].t && targetTimestamp <= route[i + 1].t) {
      p1 = route[i];
      p2 = route[i + 1];
      break;
    }
  }

  if (!p1 || !p2) {
    console.warn(
      "Interpolator could not find segment for timeMs:",
      timeMs,
      " Target Ts:",
      targetTimestamp
    );
    return null; // Return null if segment not found
  }

  // Calculate interpolation factor 't'
  const segmentDuration = p2.t - p1.t;
  const t =
    segmentDuration > 0 ? (targetTimestamp - p1.t) / segmentDuration : 1.0;

  const lat = lerp(p1.lat, p2.lat, t);
  const lng = lerp(p1.lng, p2.lng, t);
  let heading: number | undefined = undefined;

  // --- Heading calculation/interpolation ---
  if (p1.heading !== undefined && p2.heading !== undefined) {
    // Interpolate if both points have heading
    heading = interpolateHeading(p1.heading, p2.heading, t);
  } else if (p1.heading !== undefined && segmentDuration === 0) {
    // If segment duration is 0, use p1's heading if available
    heading = p1.heading;
  } else if (typeof google?.maps?.geometry?.spherical !== "undefined") {
    // Calculate heading from segment direction if geometry library is loaded
    // Avoid calculation for zero-length segments to prevent NaN heading
    if (p1.lat !== p2.lat || p1.lng !== p2.lng) {
      heading = google.maps.geometry.spherical.computeHeading(p1, p2);
    } else {
      // Use previous point's heading or p1's heading if available
      heading = p1.heading; // Fallback to p1's heading if segment has zero length
    }
  } else {
    // Fallback: Use start point's heading if available, otherwise undefined
    heading = p1.heading;
  }
  // --- End Heading calculation ---

  const progress =
    durationMs > 0 ? timeMs / durationMs : timeMs >= durationMs ? 1 : 0;

  return { lat, lng, heading, progress: Math.min(1, Math.max(0, progress)) };
}
