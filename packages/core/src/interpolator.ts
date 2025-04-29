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

  progress: number;
}

/**
 * Finds the segment and interpolation factor for a given time in the route.
 * Calculates heading based on segment direction if not present in data.
 * Requires google.maps.geometry library to be loaded for heading calculation.
 * @param route Sorted array of RoutePoints.
 * @param absoluteTimeMs The target absolute time in milliseconds (Unix timestamp or similar).
 * @param startTimeMs The absolute timestamp of the first point in the route.
 * @param durationMs The total duration of the route in milliseconds.
 * @returns The interpolated point, or null if time is out of bounds.
 */
export function interpolateRoute(
  route: RoutePoint[],
  absoluteTimeMs: number,
  startTimeMs: number,
  durationMs: number
): InterpolatedPoint | null {
  const endTimeMs = startTimeMs + durationMs;

  if (absoluteTimeMs <= startTimeMs && route.length > 0) {
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
  if (absoluteTimeMs >= endTimeMs && route.length > 0) {
    const lastPoint = route[route.length - 1];

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
  if (
    !route ||
    route.length < 2 ||
    absoluteTimeMs < startTimeMs ||
    absoluteTimeMs > endTimeMs
  ) {
    return null;
  }

  const targetTimestamp = absoluteTimeMs;

  let p1: RoutePoint | null = null;
  let p2: RoutePoint | null = null;
  for (let i = 0; i < route.length - 1; i++) {
    if (route[i].t === route[i + 1].t) {
      if (targetTimestamp === route[i].t) {
        p1 = route[i];
        p2 = route[i + 1];
        break;
      }
      continue;
    }
    if (targetTimestamp >= route[i].t && targetTimestamp <= route[i + 1].t) {
      p1 = route[i];
      p2 = route[i + 1];
      break;
    }
  }

  if (!p1 || !p2) {
    console.warn(
      "Interpolator could not find segment for absolute time:",
      absoluteTimeMs
    );
    return null;
  }

  const segmentDuration = p2.t - p1.t;
  const t =
    segmentDuration > 0 ? (targetTimestamp - p1.t) / segmentDuration : 1.0;

  const lat = lerp(p1.lat, p2.lat, t);
  const lng = lerp(p1.lng, p2.lng, t);
  let heading: number | undefined = undefined;

  if (p1.heading !== undefined && p2.heading !== undefined) {
    heading = interpolateHeading(p1.heading, p2.heading, t);
  } else if (p1.heading !== undefined && segmentDuration === 0) {
    heading = p1.heading;
  } else if (typeof google?.maps?.geometry?.spherical !== "undefined") {
    if (p1.lat !== p2.lat || p1.lng !== p2.lng) {
      heading = google.maps.geometry.spherical.computeHeading(p1, p2);
    } else {
      heading = p1.heading;
    }
  } else {
    heading = p1.heading;
  }

  const progress =
    durationMs > 0
      ? (absoluteTimeMs - startTimeMs) / durationMs
      : absoluteTimeMs >= endTimeMs
      ? 1
      : 0;

  return { lat, lng, heading, progress: Math.min(1, Math.max(0, progress)) };
}
