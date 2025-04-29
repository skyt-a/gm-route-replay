import { describe, it, expect, vi } from "vitest";
import { interpolateRoute } from "./interpolator";
import type { RoutePoint } from "./types";

// --- Temporary Workaround: Define google object directly in test file ---
if (typeof window !== "undefined") {
  // Mock computeHeading function
  const mockComputeHeading = vi.fn((from, to) => {
    const dy = to.lat - from.lat;
    const dx = to.lng - from.lng;
    const angle = Math.atan2(dy, dx);
    let heading = (angle * 180) / Math.PI;
    heading = (90 - heading + 360) % 360;
    return heading;
  });

  (window as any).google = {
    maps: {
      geometry: {
        spherical: {
          computeHeading: mockComputeHeading,
        },
      },
      // Add other minimal mocks if needed by the interpolator itself
      LatLng: vi.fn((lat, lng) => ({ lat: () => lat, lng: () => lng })),
    },
  };
}
// --- End Temporary Workaround ---

// Helper function to create RoutePoint
const rp = (
  t: number,
  lat: number,
  lng: number,
  heading?: number
): RoutePoint => ({ t, lat, lng, heading });

describe("interpolateRoute", () => {
  const route: RoutePoint[] = [
    rp(1000, 35.0, 135.0, 0),
    rp(2000, 35.1, 135.1, 90),
    rp(3000, 35.0, 135.2, 180),
    rp(4000, 34.9, 135.1, 270),
  ];
  const startTime = 1000;
  const duration = 3000; // endTime = 4000

  it("should return the start point if time is before the route start time", () => {
    const expected = { lat: 35.0, lng: 135.0, heading: 0, progress: 0 }; // Expect start point
    const result = interpolateRoute(route, 500, startTime, duration);
    expect(result?.lat).toBeCloseTo(expected.lat);
    expect(result?.lng).toBeCloseTo(expected.lng);
    // Heading might be calculated if not present in first point, check existence or value
    expect(result?.heading).toBeDefined();
    if (route[0].heading !== undefined) {
      expect(result?.heading).toBeCloseTo(expected.heading);
    }
    expect(result?.progress).toBe(expected.progress);
  });

  it("should return the start point if time is exactly the start time", () => {
    const expected = { lat: 35.0, lng: 135.0, heading: 0 };
    const result = interpolateRoute(route, 1000, startTime, duration);
    expect(result?.lat).toBeCloseTo(expected.lat);
    expect(result?.lng).toBeCloseTo(expected.lng);
    expect(result?.heading).toBeCloseTo(expected.heading);
    expect(result?.progress).toBe(0);
  });

  it("should return the end point if time is exactly the end time", () => {
    const expected = { lat: 34.9, lng: 135.1, heading: 270 };
    const result = interpolateRoute(route, 4000, startTime, duration);
    expect(result?.lat).toBeCloseTo(expected.lat);
    expect(result?.lng).toBeCloseTo(expected.lng);
    expect(result?.heading).toBeCloseTo(expected.heading);
    expect(result?.progress).toBe(1);
  });

  it("should return the end point if time is after the route end time", () => {
    const expected = { lat: 34.9, lng: 135.1, heading: 270 };
    const result = interpolateRoute(route, 5000, startTime, duration);
    expect(result?.lat).toBeCloseTo(expected.lat);
    expect(result?.lng).toBeCloseTo(expected.lng);
    expect(result?.heading).toBeCloseTo(expected.heading);
    expect(result?.progress).toBe(1);
  });

  it("should interpolate correctly between two points (midpoint)", () => {
    const time = 1500; // Halfway between point 0 (1000ms) and point 1 (2000ms)
    const expectedLat = 35.0 + (35.1 - 35.0) * 0.5;
    const expectedLng = 135.0 + (135.1 - 135.0) * 0.5;
    // Heading might be directly interpolated or calculated, let's assume simple interpolation for now
    const expectedHeading = 0 + (90 - 0) * 0.5;
    const result = interpolateRoute(route, time, startTime, duration);

    expect(result?.lat).toBeCloseTo(expectedLat);
    expect(result?.lng).toBeCloseTo(expectedLng);
    expect(result?.heading).toBeCloseTo(expectedHeading);
    expect(result?.progress).toBeCloseTo((time - startTime) / duration);
  });

  it("should interpolate correctly between two points (closer to second point)", () => {
    const time = 2800; // 80% between point 1 (2000ms) and point 2 (3000ms)
    const progress = 0.8;
    const expectedLat = 35.1 + (35.0 - 35.1) * progress;
    const expectedLng = 135.1 + (135.2 - 135.1) * progress;
    const expectedHeading = 90 + (180 - 90) * progress;
    const result = interpolateRoute(route, time, startTime, duration);

    expect(result?.lat).toBeCloseTo(expectedLat);
    expect(result?.lng).toBeCloseTo(expectedLng);
    expect(result?.heading).toBeCloseTo(expectedHeading);
    expect(result?.progress).toBeCloseTo((time - startTime) / duration);
  });

  it("should handle routes with only two points", () => {
    const twoPointRoute = [rp(1000, 0, 0), rp(2000, 10, 10)];
    const time = 1500;
    const result = interpolateRoute(twoPointRoute, time, 1000, 1000);
    expect(result?.lat).toBeCloseTo(5);
    expect(result?.lng).toBeCloseTo(5);
    expect(result?.progress).toBeCloseTo(0.5);
  });

  it("should return null for empty route and the point for single-point route", () => {
    expect(interpolateRoute([], 1000, 0, 0)).toBeNull();

    const singlePointRoute = [rp(1000, 10, 20, 90)];
    const expectedPoint = { lat: 10, lng: 20, heading: 90, progress: 0 };
    // Test time before, at, and after the single point's time
    const resultBefore = interpolateRoute(singlePointRoute, 500, 1000, 0);
    expect(resultBefore?.lat).toBeCloseTo(expectedPoint.lat);
    expect(resultBefore?.lng).toBeCloseTo(expectedPoint.lng);
    expect(resultBefore?.heading).toBeCloseTo(expectedPoint.heading);
    expect(resultBefore?.progress).toBe(expectedPoint.progress); // Progress 0 for time <= startTime

    const resultAt = interpolateRoute(singlePointRoute, 1000, 1000, 0);
    expect(resultAt?.lat).toBeCloseTo(expectedPoint.lat);
    expect(resultAt?.lng).toBeCloseTo(expectedPoint.lng);
    expect(resultAt?.heading).toBeCloseTo(expectedPoint.heading);
    expect(resultAt?.progress).toBe(expectedPoint.progress); // Progress 0 for time <= startTime

    const resultAfter = interpolateRoute(singlePointRoute, 1500, 1000, 0);
    // For single point route (duration 0), time > startTime hits the endTime condition
    const expectedEndPoint = { ...expectedPoint, progress: 1 };
    expect(resultAfter?.lat).toBeCloseTo(expectedEndPoint.lat);
    expect(resultAfter?.lng).toBeCloseTo(expectedEndPoint.lng);
    expect(resultAfter?.heading).toBeCloseTo(expectedEndPoint.heading);
    expect(resultAfter?.progress).toBe(expectedEndPoint.progress); // Progress 1 for time >= endTime
  });

  it("should use calculated heading if heading is missing in data", () => {
    const routeWithoutHeading: RoutePoint[] = [
      rp(1000, 35.0, 135.0),
      rp(2000, 35.1, 135.0), // North
      rp(3000, 35.1, 135.1), // East
    ];
    // Mocking computeHeading is necessary for a precise test here
    // For now, just check if heading is calculated (not undefined)
    const result1 = interpolateRoute(routeWithoutHeading, 1500, 1000, 2000);
    expect(result1?.heading).toBeDefined(); // Should be approx 0 (North)

    const result2 = interpolateRoute(routeWithoutHeading, 2500, 1000, 2000);
    expect(result2?.heading).toBeDefined(); // Should be approx 90 (East)
  });
});
