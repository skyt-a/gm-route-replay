import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { interpolateRoute } from "./interpolator";
import type { RoutePoint } from "./types";
const rp = (
  t: number,
  lat: number,
  lng: number,
  heading?: number
): RoutePoint => ({ t, lat, lng, heading });

describe("interpolateRoute", () => {
  let originalComputeHeading:
    | typeof google.maps.geometry.spherical.computeHeading
    | undefined;

  const mockComputeHeadingImplementation = vi.fn(
    (
      _from: google.maps.LatLng | google.maps.LatLngLiteral,
      _to: google.maps.LatLng | google.maps.LatLngLiteral
    ): number => {
      return 45;
    }
  );

  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.google = window.google || {};
      window.google.maps = window.google.maps || {};
      window.google.maps.geometry = window.google.maps.geometry || {};
      window.google.maps.geometry.spherical =
        window.google.maps.geometry.spherical || {};

      if (
        typeof window.google.maps.geometry.spherical.computeHeading ===
        "function"
      ) {
        originalComputeHeading =
          window.google.maps.geometry.spherical.computeHeading;
      } else {
        originalComputeHeading = undefined;
      }

      (window.google.maps.geometry.spherical as any).computeHeading =
        mockComputeHeadingImplementation;
    }

    mockComputeHeadingImplementation.mockClear();
  });

  afterEach(() => {
    if (
      typeof window !== "undefined" &&
      window.google?.maps?.geometry?.spherical
    ) {
      (window.google.maps.geometry.spherical as any).computeHeading =
        originalComputeHeading;
    }
  });

  const route: RoutePoint[] = [
    rp(1000, 35.0, 135.0, 0),
    rp(2000, 35.1, 135.1, 90),
    rp(3000, 35.0, 135.2, 180),
    rp(4000, 34.9, 135.1, 270),
  ];
  const startTime = 1000;
  const duration = 3000;

  it("should return the start point if time is before the route start time", () => {
    const expected = { lat: 35.0, lng: 135.0, heading: 0, progress: 0 };
    const result = interpolateRoute(route, 500, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expected.lat);
    expect(result!.lng).toBeCloseTo(expected.lng);
    if (expected.heading !== undefined) {
      expect(result!.heading).toBeCloseTo(expected.heading);
    } else {
    }
    expect(result!.progress).toBe(expected.progress);
  });

  it("should return the start point if time is exactly the start time", () => {
    const expected = { lat: 35.0, lng: 135.0, heading: 0 };
    const result = interpolateRoute(route, 1000, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expected.lat);
    expect(result!.lng).toBeCloseTo(expected.lng);
    expect(result!.heading).toBeCloseTo(expected.heading);
    expect(result!.progress).toBe(0);
  });

  it("should return the end point if time is exactly the end time", () => {
    const expected = { lat: 34.9, lng: 135.1, heading: 270 };
    const result = interpolateRoute(route, 4000, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expected.lat);
    expect(result!.lng).toBeCloseTo(expected.lng);
    expect(result!.heading).toBeCloseTo(expected.heading);
    expect(result!.progress).toBe(1);
  });

  it("should return the end point if time is after the route end time", () => {
    const expected = { lat: 34.9, lng: 135.1, heading: 270 };
    const result = interpolateRoute(route, 5000, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expected.lat);
    expect(result!.lng).toBeCloseTo(expected.lng);
    expect(result!.heading).toBeCloseTo(expected.heading);
    expect(result!.progress).toBe(1);
  });

  it("should interpolate correctly between two points (midpoint)", () => {
    const time = 1500;
    const expectedLat = 35.0 + (35.1 - 35.0) * 0.5;
    const expectedLng = 135.0 + (135.1 - 135.0) * 0.5;
    const expectedHeading = interpolateHeading(
      route[0].heading!,
      route[1].heading!,
      0.5
    );
    const result = interpolateRoute(route, time, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expectedLat);
    expect(result!.lng).toBeCloseTo(expectedLng);
    expect(result!.heading).toBeCloseTo(expectedHeading);
    expect(result!.progress).toBeCloseTo((time - startTime) / duration);

    expect(mockComputeHeadingImplementation).not.toHaveBeenCalled();
  });

  it("should interpolate correctly between two points (closer to second point)", () => {
    const time = 2800;
    const progressFraction = 0.8;
    const expectedLat =
      route[1].lat + (route[2].lat - route[1].lat) * progressFraction;
    const expectedLng =
      route[1].lng + (route[2].lng - route[1].lng) * progressFraction;
    const expectedHeading = interpolateHeading(
      route[1].heading!,
      route[2].heading!,
      progressFraction
    );
    const result = interpolateRoute(route, time, startTime, duration);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(expectedLat);
    expect(result!.lng).toBeCloseTo(expectedLng);
    expect(result!.heading).toBeCloseTo(expectedHeading);
    expect(result!.progress).toBeCloseTo((time - startTime) / duration);

    expect(mockComputeHeadingImplementation).not.toHaveBeenCalled();
  });

  it("should handle routes with only two points", () => {
    const twoPointRoute = [rp(1000, 0, 0), rp(2000, 10, 10)];
    const twoPointStartTime = 1000;
    const twoPointDuration = 1000;
    const time = 1500;
    const result = interpolateRoute(
      twoPointRoute,
      time,
      twoPointStartTime,
      twoPointDuration
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(5);
    expect(result!.lng).toBeCloseTo(5);

    expect(mockComputeHeadingImplementation).toHaveBeenCalledTimes(1);
    expect(result!.heading).toBe(45);
    expect(result!.progress).toBeCloseTo(0.5);
  });

  it("should return null for empty route and the point for single-point route", () => {
    expect(interpolateRoute([], 1000, 0, 0)).toBeNull();

    const singlePointRoute = [rp(1000, 10, 20, 90)];
    const singlePointStartTime = 1000;
    const singlePointDuration = 0;
    const expectedPoint = { lat: 10, lng: 20, heading: 90 };

    const resultBefore = interpolateRoute(
      singlePointRoute,
      500,
      singlePointStartTime,
      singlePointDuration
    );
    expect(resultBefore).not.toBeNull();
    expect(resultBefore!.lat).toBeCloseTo(expectedPoint.lat);
    expect(resultBefore!.lng).toBeCloseTo(expectedPoint.lng);
    expect(resultBefore!.heading).toBeCloseTo(expectedPoint.heading);
    expect(resultBefore!.progress).toBe(0);

    const resultAt = interpolateRoute(
      singlePointRoute,
      1000,
      singlePointStartTime,
      singlePointDuration
    );
    expect(resultAt).not.toBeNull();
    expect(resultAt!.lat).toBeCloseTo(expectedPoint.lat);
    expect(resultAt!.lng).toBeCloseTo(expectedPoint.lng);
    expect(resultAt!.heading).toBeCloseTo(expectedPoint.heading);
    expect(resultAt!.progress).toBe(0);

    const resultAfter = interpolateRoute(
      singlePointRoute,
      1500,
      singlePointStartTime,
      singlePointDuration
    );
    expect(resultAfter).not.toBeNull();
    expect(resultAfter!.lat).toBeCloseTo(expectedPoint.lat);
    expect(resultAfter!.lng).toBeCloseTo(expectedPoint.lng);
    expect(resultAfter!.heading).toBeCloseTo(expectedPoint.heading);
    expect(resultAfter!.progress).toBe(1);

    expect(mockComputeHeadingImplementation).not.toHaveBeenCalled();
  });

  it("should use calculated heading if heading is missing in data", () => {
    const routeWithoutHeading: RoutePoint[] = [
      rp(1000, 35.0, 135.0),
      rp(2000, 35.1, 135.0),
      rp(3000, 35.1, 135.1),
    ];
    const whStartTime = 1000;
    const whDuration = 2000;

    mockComputeHeadingImplementation.mockClear();
    const result1 = interpolateRoute(
      routeWithoutHeading,
      1500,
      whStartTime,
      whDuration
    );
    expect(result1).not.toBeNull();
    expect(mockComputeHeadingImplementation).toHaveBeenCalledTimes(1);
    expect(result1!.heading).toBe(45);

    mockComputeHeadingImplementation.mockClear();
    const result2 = interpolateRoute(
      routeWithoutHeading,
      2500,
      whStartTime,
      whDuration
    );
    expect(result2).not.toBeNull();
    expect(mockComputeHeadingImplementation).toHaveBeenCalledTimes(1);
    expect(result2!.heading).toBe(45);
  });
});

function interpolateHeading(h1: number, h2: number, t: number): number {
  const diff = h2 - h1;
  const delta = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
  return (h1 + delta * t + 360) % 360;
}
