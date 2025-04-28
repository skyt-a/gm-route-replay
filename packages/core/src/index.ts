// /// <reference types="@types/google.maps" />

import {
  PlayerOptions,
  PlayerHandle,
  RoutePoint,
  PlayerEventMap,
  PlayerEvent,
} from "./types";
import { Animator } from "./animator";
import { MarkerRenderer } from "./renderers/marker";
import { PolylineRenderer } from "./renderers/polyline";
import { interpolateRoute, InterpolatedPoint } from "./interpolator";

export function createPlayer(options: PlayerOptions): PlayerHandle {
  // --- Input Validation ---
  if (!options.map) {
    throw new Error("PlayerOptions requires a valid `map` instance.");
  }
  if (
    !options.route ||
    (Array.isArray(options.route) && options.route.length < 2)
  ) {
    // TODO: Handle URL string route loading
    throw new Error(
      "PlayerOptions requires a `route` with at least two points or a valid URL string."
    );
  }

  console.log("Creating player with options:", options);

  // --- State Initialization ---
  let routeData: RoutePoint[] = [];
  let routeStartTimeMs: number = 0;
  let routeDurationMs: number = 0;
  let isInitialized: boolean = false; // Tracks if route data is processed
  let currentTimelineTimeMs: number = 0; // Stores the current time for seeking etc.

  // --- Component Initialization ---
  const animator = new Animator({ fps: options.fps ?? 60 });
  const markerRenderer = new MarkerRenderer({
    map: options.map,
    markerOptions: options.markerOptions,
  });
  let polylineRenderer: PolylineRenderer | null = null;
  if (options.polylineOptions) {
    polylineRenderer = new PolylineRenderer({
      map: options.map,
      polylineOptions: options.polylineOptions,
    });
  }
  // TODO: Initialize plugins

  // --- Event Emitter Placeholder (v0.2) ---
  const eventListeners: { [K in PlayerEvent]?: PlayerEventMap[K][] } = {};
  const emit = <E extends PlayerEvent>(
    event: E,
    payload: Parameters<PlayerEventMap[E]>[0]
  ) => {
    eventListeners[event]?.forEach((cb) => (cb as any)(payload));
  };

  // --- Route Processing ---
  function processRouteData(routeInput: RoutePoint[] | string) {
    if (typeof routeInput === "string") {
      // TODO: Implement route loading from URL (requires loader packages)
      console.error("URL route loading not yet implemented.");
      emit("error", {
        error: new Error("URL route loading not yet implemented."),
      });
      routeData = []; // Ensure it's empty
      isInitialized = false;
      return;
    }

    if (routeInput.length < 2) {
      routeData = [];
      isInitialized = false;
      console.warn("Route data must contain at least two points.");
      emit("error", {
        error: new Error("Route data must contain at least two points."),
      });
      return;
    }

    // Sort by timestamp and store
    routeData = [...routeInput].sort((a, b) => a.t - b.t);
    routeStartTimeMs = routeData[0].t;
    routeDurationMs = routeData[routeData.length - 1].t - routeStartTimeMs;
    isInitialized = true;
    console.log(
      `Route processed: ${routeData.length} points, duration ${routeDurationMs}ms`
    );

    // Reset Polyline path if renderer exists
    polylineRenderer?.resetPath();

    // Set initial marker position
    const initialPoint = interpolateRoute(
      routeData,
      0,
      routeStartTimeMs,
      routeDurationMs
    );
    if (initialPoint) {
      markerRenderer.update(
        { lat: initialPoint.lat, lng: initialPoint.lng },
        initialPoint.heading
      );
      // Add the first point to the polyline path immediately
      polylineRenderer?.addPoint({
        lat: initialPoint.lat,
        lng: initialPoint.lng,
      });
    }
  }

  // Helper to find the index for time (still needed for seek approximation)
  function findIndexForTime(timelineTimeMs: number): number {
    if (timelineTimeMs <= 0) return 0;
    if (timelineTimeMs >= routeDurationMs) return routeData.length - 1;

    const absoluteTime = routeStartTimeMs + timelineTimeMs;
    const index = routeData.findIndex((p) => p.t >= absoluteTime);
    return Math.max(0, index === -1 ? routeData.length - 1 : index);
  }

  // --- Core Animation Callback ---
  const handleFrame = (timelineTimeMs: number): void => {
    if (!isInitialized || routeDurationMs <= 0) return;

    currentTimelineTimeMs = Math.min(timelineTimeMs, routeDurationMs); // Clamp time

    const interpolated = interpolateRoute(
      routeData,
      currentTimelineTimeMs,
      routeStartTimeMs,
      routeDurationMs
    );

    if (interpolated) {
      markerRenderer.update(
        { lat: interpolated.lat, lng: interpolated.lng },
        interpolated.heading
      );

      // Add the current interpolated point to the polyline
      polylineRenderer?.addPoint({
        lat: interpolated.lat,
        lng: interpolated.lng,
      });

      emit("frame", {
        trackId: "main",
        pos: { lat: interpolated.lat, lng: interpolated.lng },
        heading: interpolated.heading,
        progress: interpolated.progress,
      });
    } else {
      console.warn(
        "Interpolation returned null for time:",
        currentTimelineTimeMs
      );
    }

    // Check for finish
    if (currentTimelineTimeMs >= routeDurationMs) {
      console.log("Playback finished.");
      animator.pause();
      emit("finish", undefined);
      // Ensure final marker state
      const finalPoint = routeData[routeData.length - 1];
      markerRenderer.update(
        { lat: finalPoint.lat, lng: finalPoint.lng },
        finalPoint.heading
      );
      // Ensure final point is added to polyline
      polylineRenderer?.addPoint({ lat: finalPoint.lat, lng: finalPoint.lng });
    }
  };

  // --- PlayerHandle Implementation ---
  const handle: PlayerHandle = {
    play: () => {
      if (!isInitialized) {
        console.warn("Cannot play: route not initialized or invalid.");
        processRouteData(options.route);
        if (!isInitialized) return;
      }
      if (routeDurationMs <= 0) {
        console.warn("Cannot play: route duration is zero or negative.");
        return;
      }
      // If restarting after finish, reset the polyline
      if (currentTimelineTimeMs >= routeDurationMs) {
        currentTimelineTimeMs = 0;
        polylineRenderer?.resetPath();
        // Add initial point back
        const initialPoint = routeData[0];
        if (initialPoint) {
          polylineRenderer?.addPoint({
            lat: initialPoint.lat,
            lng: initialPoint.lng,
          });
        }
      }

      console.log("play() called");
      animator.start(handleFrame);
      emit("start", undefined);
    },
    pause: () => {
      console.log("pause() called");
      animator.pause();
      // TODO: Emit pause event (v0.2)
      emit("pause", undefined);
    },
    stop: () => {
      console.log("stop() called");
      animator.stop();
      currentTimelineTimeMs = 0;

      // Reset the drawn polyline
      polylineRenderer?.resetPath();

      // Reset marker to the start position
      const initialPoint = routeData.length > 0 ? routeData[0] : null;
      if (initialPoint) {
        markerRenderer.update(
          { lat: initialPoint.lat, lng: initialPoint.lng },
          initialPoint.heading
        );
        // Add the initial point back to the (now reset) polyline
        polylineRenderer?.addPoint({
          lat: initialPoint.lat,
          lng: initialPoint.lng,
        });
      } else {
        markerRenderer.destroy(); // Or hide marker if no route data
      }
    },
    seek: (ms: number) => {
      if (!isInitialized) return;
      const clampedMs = Math.max(0, Math.min(ms, routeDurationMs));
      console.log(`seek(${clampedMs}ms) called`);
      currentTimelineTimeMs = clampedMs;

      // Update marker to seek position
      const interpolated = interpolateRoute(
        routeData,
        currentTimelineTimeMs,
        routeStartTimeMs,
        routeDurationMs
      );
      if (interpolated) {
        markerRenderer.update(
          { lat: interpolated.lat, lng: interpolated.lng },
          interpolated.heading
        );
      }

      // Rebuild polyline path up to the seek point (using original points for approximation)
      if (polylineRenderer) {
        const seekIndex = findIndexForTime(currentTimelineTimeMs);
        const pathToSeekPoint = routeData
          .slice(0, seekIndex + 1)
          .map((p) => ({ lat: p.lat, lng: p.lng }));
        // Ensure the exact interpolated point is the last one for visual consistency
        if (interpolated && pathToSeekPoint.length > 0) {
          // Replace the last point from slice with the exact interpolated position
          pathToSeekPoint[pathToSeekPoint.length - 1] = {
            lat: interpolated.lat,
            lng: interpolated.lng,
          };
        } else if (interpolated) {
          // Handle edge case where seekIndex is 0 but there's an interpolated point
          pathToSeekPoint.push({
            lat: interpolated.lat,
            lng: interpolated.lng,
          });
        }
        polylineRenderer.setPath(pathToSeekPoint);
      }

      emit("seek", { timeMs: currentTimelineTimeMs });
      console.warn(
        "Seek during playback requires Animator modification for smooth transition."
      );
    },
    setSpeed: (multiplier: number) => {
      console.warn("setSpeed() not implemented yet (v0.2)");
      // TODO: Modify animator speed (v0.2)
    },
    setDirection: (dir: "forward" | "reverse") => {
      console.warn("setDirection() not implemented yet (v0.2)");
      // TODO: Modify animator direction (v0.2)
    },
    on: <E extends PlayerEvent>(
      event: E,
      callback: PlayerEventMap[E]
    ): void => {
      console.log(`on(${event}) called`);
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event]?.push(callback);
      console.log(`Listener added for event: ${event}`);
    },
    destroy: () => {
      console.log("destroy() called");
      animator.destroy();
      markerRenderer.destroy();
      polylineRenderer?.destroy();
      // Clear listeners
      for (const event in eventListeners) {
        delete eventListeners[event as PlayerEvent];
      }
      // TODO: Destroy plugins
      isInitialized = false;
      routeData = [];
      console.log("Player destroyed.");
    },
  };

  // --- Initial Processing ---
  processRouteData(options.route);

  return handle;
}

export * from "./types"; // Re-export types
