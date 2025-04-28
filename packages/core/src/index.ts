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
  // Route validation needs adjustment for the new type
  const routeInput = options.route;
  let isMultiTrackInput = false;
  if (!routeInput) {
    throw new Error("PlayerOptions requires a valid `route` input.");
  } else if (typeof routeInput === "object" && !Array.isArray(routeInput)) {
    // Check if it's a dictionary of routes
    if (Object.keys(routeInput).length === 0) {
      throw new Error("Multi-track route object cannot be empty.");
    }
    isMultiTrackInput = true;
    for (const trackId in routeInput) {
      if (
        !Array.isArray(routeInput[trackId]) ||
        routeInput[trackId].length < 2
      ) {
        throw new Error(
          `Route for trackId '${trackId}' must be an array with at least two points.`
        );
      }
    }
  } else if (Array.isArray(routeInput)) {
    if (routeInput.length < 2) {
      throw new Error("Single route array must contain at least two points.");
    }
  } else if (typeof routeInput !== "string") {
    throw new Error("Invalid route input type.");
  }
  // URL string validation happens later during processing

  console.log("Creating player with options:", options);
  console.log(
    `Input is ${isMultiTrackInput ? "multi-track" : "single-track or URL"}`
  );

  // --- State Initialization ---
  let isMultiTrackMode = false;
  let trackIds: string[] = [];
  let processedRoutes = new Map<string, RoutePoint[]>();
  let trackStartTimes = new Map<string, number>();
  let trackEndTimes = new Map<string, number>();
  let trackDurations = new Map<string, number>();
  let globalStartTimeMs: number = Infinity;
  let globalEndTimeMs: number = -Infinity;
  let globalDurationMs: number = 0;
  let isInitialized: boolean = false;

  // --- Component Initialization ---
  const animator = new Animator({
    fps: options.fps ?? 60,
    initialSpeed: options.initialSpeed,
  });
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

  // --- Event Emitter Placeholder ---
  const eventListeners: { [K in PlayerEvent]?: PlayerEventMap[K][] } = {};
  const emit = <E extends PlayerEvent>(
    event: E,
    payload: Parameters<PlayerEventMap[E]>[0]
  ) => {
    // Ensure correct payload types, especially for undefined/void events
    if (event === "start" || event === "pause" || event === "finish") {
      eventListeners[event]?.forEach((cb) => (cb as () => void)());
    } else if (
      event === "error" &&
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload
    ) {
      eventListeners[event]?.forEach((cb) =>
        (cb as (p: { error: Error }) => void)(payload as { error: Error })
      );
    } else if (
      event === "frame" &&
      typeof payload === "object" &&
      payload !== null
    ) {
      eventListeners[event]?.forEach((cb) =>
        (cb as PlayerEventMap["frame"])(payload as any)
      ); // Assuming payload structure is correct
    } else if (
      event === "seek" &&
      typeof payload === "object" &&
      payload !== null &&
      "timeMs" in payload
    ) {
      eventListeners[event]?.forEach((cb) =>
        (cb as (p: { timeMs: number }) => void)(payload as { timeMs: number })
      );
    } else {
      console.warn(`Unknown event type or payload for emit: ${event}`, payload);
    }
  };

  // --- Route Processing ---
  function processRouteData(input: PlayerOptions["route"]) {
    // Reset previous state
    animator.stop();
    markerRenderer.removeAllMarkers();
    polylineRenderer?.resetAllPaths();
    processedRoutes.clear();
    trackIds = [];
    trackStartTimes.clear();
    trackEndTimes.clear();
    trackDurations.clear();
    globalStartTimeMs = Infinity;
    globalEndTimeMs = -Infinity;
    globalDurationMs = 0;
    isInitialized = false;
    isMultiTrackMode = false;

    if (typeof input === "string") {
      // TODO: Implement URL loading
      console.error("URL route loading not yet implemented.");
      emit("error", {
        error: new Error("URL route loading not yet implemented."),
      });
      return;
    }

    const tempRoutes = new Map<string, RoutePoint[]>();
    let minTime = Infinity;
    let maxTime = -Infinity;

    if (Array.isArray(input)) {
      // Single track mode
      isMultiTrackMode = false;
      const trackId = "main"; // Default ID for single track
      const sortedRoute = [...input].sort((a, b) => a.t - b.t);
      if (sortedRoute.length < 2) return; // Should have been caught earlier, but double check
      tempRoutes.set(trackId, sortedRoute);
      trackIds = [trackId];
      const trackStart = sortedRoute[0].t;
      const trackEnd = sortedRoute[sortedRoute.length - 1].t;
      trackStartTimes.set(trackId, trackStart);
      trackEndTimes.set(trackId, trackEnd);
      trackDurations.set(trackId, Math.max(0, trackEnd - trackStart));
      minTime = trackStart;
      maxTime = trackEnd;
    } else {
      // Multi-track mode
      isMultiTrackMode = true;
      trackIds = Object.keys(input);
      if (trackIds.length === 0) return; // Empty object

      for (const trackId of trackIds) {
        const route = input[trackId];
        if (!route || route.length < 2) continue; // Skip invalid tracks
        const sortedRoute = [...route].sort((a, b) => a.t - b.t);
        tempRoutes.set(trackId, sortedRoute);
        const trackStart = sortedRoute[0].t;
        const trackEnd = sortedRoute[sortedRoute.length - 1].t;
        trackStartTimes.set(trackId, trackStart);
        trackEndTimes.set(trackId, trackEnd);
        trackDurations.set(trackId, Math.max(0, trackEnd - trackStart));
        minTime = Math.min(minTime, trackStart);
        maxTime = Math.max(maxTime, trackEnd);
      }
      // Filter out trackIds that had invalid routes
      trackIds = trackIds.filter((id) => tempRoutes.has(id));
    }

    if (trackIds.length === 0) {
      console.error("No valid tracks found in the provided route data.");
      emit("error", { error: new Error("No valid tracks found.") });
      return; // Cannot initialize
    }

    processedRoutes = tempRoutes;
    globalStartTimeMs = minTime;
    globalEndTimeMs = maxTime;
    globalDurationMs = Math.max(0, globalEndTimeMs - globalStartTimeMs);
    isInitialized = true;

    console.log(
      `Route processed: ${trackIds.length} track(s), global duration ${globalDurationMs}ms`
    );
    console.log(`Track IDs: ${trackIds.join(", ")}`);

    const bounds = new google.maps.LatLngBounds();
    trackIds.forEach((trackId) => {
      const currentRouteData = processedRoutes.get(trackId);
      const trackStartTime = trackStartTimes.get(trackId);
      const trackDuration = trackDurations.get(trackId);
      if (
        !currentRouteData ||
        trackStartTime === undefined ||
        trackDuration === undefined
      )
        return;

      currentRouteData.forEach((p) =>
        bounds.extend({ lat: p.lat, lng: p.lng })
      );

      const initialInterpolated = interpolateRoute(
        currentRouteData,
        0,
        trackStartTime,
        trackDuration
      );

      if (initialInterpolated) {
        markerRenderer.updateMarker(
          trackId,
          { lat: initialInterpolated.lat, lng: initialInterpolated.lng },
          initialInterpolated.heading
        );
        polylineRenderer?.addPoint(trackId, {
          lat: initialInterpolated.lat,
          lng: initialInterpolated.lng,
        });
      }
    });

    if (options.autoFit !== false && !bounds.isEmpty()) {
      options.map.fitBounds(bounds);
      console.log("Map bounds fitted to all tracks.");
    }
  }

  // --- Core Animation Callback ---
  const handleFrame = (timelineTimeMs: number): void => {
    if (!isInitialized || globalDurationMs <= 0) return;

    const clampedTimelineTimeMs = Math.min(timelineTimeMs, globalDurationMs);

    trackIds.forEach((trackId) => {
      const currentRouteData = processedRoutes.get(trackId);
      const trackStartTime = trackStartTimes.get(trackId);
      const trackDuration = trackDurations.get(trackId);

      if (
        !currentRouteData ||
        trackStartTime === undefined ||
        trackDuration === undefined
      ) {
        return; // Skip if track data is missing
      }

      // Calculate time relative to this track's start time
      const timeRelativeToGlobalStart = clampedTimelineTimeMs;
      const trackStartTimeRelativeToGlobalStart =
        trackStartTime - globalStartTimeMs;
      const trackRelativeTimeMs =
        timeRelativeToGlobalStart - trackStartTimeRelativeToGlobalStart;

      let interpolated: InterpolatedPoint | null = null;
      let isClamped = false; // Flag to indicate if we used a clamped start/end point

      if (trackRelativeTimeMs >= 0 && trackRelativeTimeMs <= trackDuration) {
        interpolated = interpolateRoute(
          currentRouteData,
          trackRelativeTimeMs,
          trackStartTime,
          trackDuration
        );
      } else if (trackRelativeTimeMs < 0) {
        const firstPoint = currentRouteData[0];
        interpolated = { ...firstPoint, progress: 0 };
        isClamped = true; // Mark as clamped to start
      } else {
        // trackRelativeTimeMs > trackDuration
        const lastPoint = currentRouteData[currentRouteData.length - 1];
        interpolated = { ...lastPoint, progress: 1 };
        isClamped = true; // Mark as clamped to end
      }

      if (interpolated) {
        // Always update the marker position (to show start/end position even when clamped)
        markerRenderer.updateMarker(
          trackId,
          { lat: interpolated.lat, lng: interpolated.lng },
          interpolated.heading
        );

        // Only add to polyline if it wasn't a clamped start/end point
        // and the track is currently active or just finished (to draw the last segment)
        // Allow adding if clamped to end to ensure the last point is drawn
        const shouldAddToPolyline =
          !isClamped || trackRelativeTimeMs >= trackDuration;

        if (shouldAddToPolyline) {
          polylineRenderer?.addPoint(trackId, {
            lat: interpolated.lat,
            lng: interpolated.lng,
          });
        }

        // Emit frame event based on interpolated data
        emit("frame", {
          trackId: trackId,
          pos: { lat: interpolated.lat, lng: interpolated.lng },
          heading: interpolated.heading,
          progress: interpolated.progress,
        });
      } else {
        markerRenderer.removeMarker(trackId);
        console.warn(`Interpolation failed unexpectedly for track ${trackId}`);
      }
    });

    // Check global finish condition
    if (clampedTimelineTimeMs >= globalDurationMs) {
      console.log("Playback finished.");
      animator.pause();
      emit("finish", undefined);
      // Final state setting logic remains the same (uses last point of each track)
      trackIds.forEach((trackId) => {
        const currentRouteData = processedRoutes.get(trackId);
        if (!currentRouteData || currentRouteData.length === 0) return;
        const finalPoint = currentRouteData[currentRouteData.length - 1];
        markerRenderer.updateMarker(
          trackId,
          { lat: finalPoint.lat, lng: finalPoint.lng },
          finalPoint.heading
        );
        polylineRenderer?.addPoint(trackId, {
          lat: finalPoint.lat,
          lng: finalPoint.lng,
        });
      });
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
      if (globalDurationMs <= 0) {
        console.warn("Cannot play: route duration is zero or negative.");
        return;
      }

      if (animator.getCurrentTimelineTimeMs() >= globalDurationMs) {
        console.log("Restarting playback from beginning.");
        animator.stop();
        polylineRenderer?.resetAllPaths();
        trackIds.forEach((trackId) => {
          const currentRouteData = processedRoutes.get(trackId);
          if (!currentRouteData || currentRouteData.length === 0) return;
          const initialPoint = currentRouteData[0];
          markerRenderer.updateMarker(
            trackId,
            { lat: initialPoint.lat, lng: initialPoint.lng },
            initialPoint.heading
          );
          polylineRenderer?.addPoint(trackId, {
            lat: initialPoint.lat,
            lng: initialPoint.lng,
          });
        });
      }

      console.log("play() called");
      animator.start(handleFrame);
      emit("start", undefined);
    },
    pause: () => {
      console.log("pause() called");
      animator.pause();
      emit("pause", undefined);
    },
    stop: () => {
      console.log("stop() called");
      animator.stop();
      polylineRenderer?.resetAllPaths();
      trackIds.forEach((trackId) => {
        const currentRouteData = processedRoutes.get(trackId);
        if (!currentRouteData || currentRouteData.length === 0) {
          markerRenderer.removeMarker(trackId);
          return;
        }
        const initialPoint = currentRouteData[0];
        markerRenderer.updateMarker(
          trackId,
          { lat: initialPoint.lat, lng: initialPoint.lng },
          initialPoint.heading
        );
        polylineRenderer?.addPoint(trackId, {
          lat: initialPoint.lat,
          lng: initialPoint.lng,
        });
      });
    },
    seek: (ms: number) => {
      if (!isInitialized) return;
      const clampedMs = Math.max(0, Math.min(ms, globalDurationMs));
      console.log(`seek(${clampedMs}ms) called`);

      animator.setCurrentTimelineTimeMs(clampedMs);

      trackIds.forEach((trackId) => {
        const currentRouteData = processedRoutes.get(trackId);
        if (!currentRouteData) return;

        const interpolated = interpolateRoute(
          currentRouteData,
          clampedMs,
          globalStartTimeMs,
          globalDurationMs
        );

        if (interpolated) {
          markerRenderer.updateMarker(
            trackId,
            { lat: interpolated.lat, lng: interpolated.lng },
            interpolated.heading
          );

          // --- Update Polyline path on seek for this track ---
          const pathUntilSeek: google.maps.LatLngLiteral[] = [];
          const absoluteSeekTime = globalStartTimeMs + clampedMs;
          let addedInterpolated = false;

          for (const point of currentRouteData) {
            if (point.t <= absoluteSeekTime) {
              pathUntilSeek.push({ lat: point.lat, lng: point.lng });
            } else {
              if (
                !pathUntilSeek.some(
                  (p) =>
                    p.lat === interpolated.lat && p.lng === interpolated.lng
                )
              ) {
                pathUntilSeek.push({
                  lat: interpolated.lat,
                  lng: interpolated.lng,
                });
              }
              addedInterpolated = true;
              break;
            }
          }
          if (!addedInterpolated) {
            if (
              !pathUntilSeek.some(
                (p) => p.lat === interpolated.lat && p.lng === interpolated.lng
              )
            ) {
              pathUntilSeek.push({
                lat: interpolated.lat,
                lng: interpolated.lng,
              });
            }
          }
          const firstTrackPointTime =
            currentRouteData.length >= 1 ? currentRouteData[0].t : Infinity;
          const secondTrackPointTime =
            currentRouteData.length >= 2 ? currentRouteData[1].t : Infinity;
          const firstSegmentStartTime =
            secondTrackPointTime !== Infinity
              ? secondTrackPointTime - globalStartTimeMs
              : 0;

          // Adjust seek condition slightly: check if seek is before the *track's* second point time
          if (
            absoluteSeekTime < secondTrackPointTime &&
            pathUntilSeek.length === 0 &&
            currentRouteData.length > 0
          ) {
            // Ensure first point of the track is added
            pathUntilSeek.push({
              lat: currentRouteData[0].lat,
              lng: currentRouteData[0].lng,
            });
            // Add interpolated point if different
            if (
              interpolated.lat !== currentRouteData[0].lat ||
              interpolated.lng !== currentRouteData[0].lng
            ) {
              if (
                !pathUntilSeek.some(
                  (p) =>
                    p.lat === interpolated.lat && p.lng === interpolated.lng
                )
              ) {
                pathUntilSeek.push({
                  lat: interpolated.lat,
                  lng: interpolated.lng,
                });
              }
            }
          }

          polylineRenderer?.setPath(trackId, pathUntilSeek);
          // --- End Polyline update ---
        } else {
          console.warn(
            `Interpolation failed during seek for track ${trackId}.`
          );
          if (clampedMs === 0 && currentRouteData.length > 0) {
            markerRenderer.updateMarker(
              trackId,
              { lat: currentRouteData[0].lat, lng: currentRouteData[0].lng },
              currentRouteData[0].heading
            );
            polylineRenderer?.setPath(trackId, [
              { lat: currentRouteData[0].lat, lng: currentRouteData[0].lng },
            ]);
          }
        }
      });

      emit("seek", { timeMs: clampedMs });
    },
    setSpeed: (multiplier: number) => {
      console.log(`setSpeed(${multiplier}) called`);
      animator.setSpeed(multiplier);
    },
    setDirection: (dir: "forward" | "reverse") => {
      console.warn(`setDirection(${dir}) not implemented yet.`);
    },
    on: <E extends PlayerEvent>(event: E, cb: PlayerEventMap[E]): void => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event]?.push(cb);
      console.log(`Listener added for event: ${event}`);
    },
    destroy: () => {
      console.log("destroy() called");
      animator.destroy();
      markerRenderer.destroy();
      polylineRenderer?.destroy();
      Object.keys(eventListeners).forEach((key) => {
        delete eventListeners[key as PlayerEvent];
      });
      isInitialized = false;
      processedRoutes.clear();
      trackIds = [];
      trackStartTimes.clear();
      trackEndTimes.clear();
      trackDurations.clear();
      console.log("Player destroyed.");
    },
  };

  // --- Initial Processing ---
  processRouteData(options.route);

  return handle;
}

export * from "./types"; // Re-export types
