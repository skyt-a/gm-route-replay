/// <reference types="@types/google.maps" />

import {
  PlayerOptions,
  RoutePoint,
  RouteInput,
  CameraMode,
  CameraOptions,
  RendererType,
  Plugin,
  PlayerEventMap,
  PlayerEvent,
} from "./types";
import { Animator } from "./animator";
import { MarkerRenderer } from "./renderers/marker";
import { PolylineRenderer } from "./renderers/polyline";
import { WebGLOverlayRenderer } from "./renderers/webgl";
import type { IRenderer } from "./renderers/types";
import { interpolateRoute, InterpolatedPoint } from "./interpolator";

export class GmRouteReplayOverlay extends google.maps.OverlayView {
  // --- Options ---
  private options: Partial<PlayerOptions> = {}; // Store options internally

  // --- State ---
  private isMultiTrackMode = false;
  private trackIds: string[] = [];
  private processedRoutes = new Map<string, RoutePoint[]>();
  private trackStartTimes = new Map<string, number>();
  private trackEndTimes = new Map<string, number>();
  private trackDurations = new Map<string, number>();
  private globalStartTimeMs: number = Infinity;
  private globalEndTimeMs: number = -Infinity;
  private globalDurationMs: number = 0;
  private currentCameraMode: CameraMode = "center";
  private currentCameraOptions: Required<CameraOptions> = {
    aheadDistance: 100,
    defaultTilt: 45,
    zoomLevel: 15,
  };
  private isInitialized: boolean = false;
  private currentTimelineTimeMs: number = 0; // Current position in playback

  // --- Components ---
  private animator: Animator | null = null;
  private markerRenderer: IRenderer | null = null;
  private polylineRenderer: PolylineRenderer | null = null;
  // private plugins: Plugin[] = []; // TODO: Implement plugin handling

  // --- Flags ---
  private needsRedraw = false; // Flag to trigger redraw

  constructor(options: PlayerOptions) {
    super();
    console.log("GmRouteReplayOverlay: Constructor called", options);
    // Initial options setup - requires map, route
    if (!options.map) {
      throw new Error(
        "GmRouteReplayOverlay requires a `map` instance in options."
      );
    }
    if (!options.route) {
      throw new Error("GmRouteReplayOverlay requires `route` data in options.");
    }
    // Store initial options (excluding map, maybe route handled separately)
    this.options = { ...options };
    this.currentCameraMode = options.cameraMode ?? "center";
    this.currentCameraOptions = {
      aheadDistance: options.cameraOptions?.aheadDistance ?? 100,
      defaultTilt: options.cameraOptions?.defaultTilt ?? 45,
      zoomLevel: options.cameraOptions?.zoomLevel ?? 15,
    };

    // Note: setMap(options.map) should be called externally after instantiation
  }

  /**
   * Called when the overlay is added to the map via `setMap()`.
   * Initialize components here.
   */
  onAdd(): void {
    console.log("GmRouteReplayOverlay: onAdd called");
    const map = this.getMap(); // Should be available here
    if (!map) {
      console.error("GmRouteReplayOverlay: Map not available in onAdd");
      return;
    }

    // Initialize Animator
    this.animator = new Animator({
      fps: this.options.fps ?? 60,
      initialSpeed: this.options.initialSpeed,
    });

    // Initialize Renderers (based on options)
    const rendererType = this.options.rendererType ?? "marker";
    if (rendererType === "webgl") {
      console.log("GmRouteReplayOverlay: Initializing WebGLOverlayRenderer");
      this.markerRenderer = new WebGLOverlayRenderer({
        map: map as google.maps.Map,
      });
    } else {
      console.log("GmRouteReplayOverlay: Initializing MarkerRenderer");
      this.markerRenderer = new MarkerRenderer({
        map: map as google.maps.Map,
        markerOptions: this.options.markerOptions,
      });
    }
    this.markerRenderer.mount(); // Mount might not be needed if draw handles it

    if (this.options.polylineOptions) {
      console.log("GmRouteReplayOverlay: Initializing PolylineRenderer");
      this.polylineRenderer = new PolylineRenderer({
        map: map as google.maps.Map,
        polylineOptions: this.options.polylineOptions,
      });
      // Polyline might draw itself or need points in draw()
    }

    // TODO: Initialize Plugins

    // Process initial route data
    if (this.options.route) {
      this.processRouteData(this.options.route);
    } else {
      console.warn("GmRouteReplayOverlay: No route data provided initially.");
    }

    this.isInitialized = true;
    console.log("GmRouteReplayOverlay: onAdd finished, initialized.");
  }

  /**
   * Called when the overlay is removed from the map via `setMap(null)`.
   * Clean up resources here.
   */
  onRemove(): void {
    console.log("GmRouteReplayOverlay: onRemove called");
    this.isInitialized = false;

    // Destroy components
    this.animator?.destroy();
    this.markerRenderer?.destroy();
    this.polylineRenderer?.destroy();
    // TODO: Destroy plugins

    this.animator = null;
    this.markerRenderer = null;
    this.polylineRenderer = null;

    // Clear internal state related to map objects
    this.processedRoutes.clear();
    this.trackIds = [];
    // ... clear other route-related state

    console.log("GmRouteReplayOverlay: onRemove finished, cleaned up.");
  }

  /**
   * Called frequently when the map characteristics change (zoom, center)
   * and potentially on `requestAnimationFrame`.
   * This is where elements are positioned/drawn on the map pane.
   */
  draw(): void {
    if (!this.isInitialized || !this.getMap() || !this.getProjection()) {
      // console.log("GmRouteReplayOverlay: Skipping draw - not initialized or no projection.");
      return;
    }

    // The `draw` method itself might not be the primary place for animation updates
    // if using Animator with requestAnimationFrame.
    // However, it could be used for static elements or re-drawing on map view changes.

    // Example: If renderers need manual redraw on zoom/pan:
    // this.markerRenderer?.redraw(); // Hypothetical method
    // this.polylineRenderer?.redraw(); // Hypothetical method

    if (this.needsRedraw) {
      console.log("GmRouteReplayOverlay: draw triggered by needsRedraw flag");
      // Perform drawing actions based on current state (e.g., after route change)
      this.needsRedraw = false;
    }
  }

  // --- Internal Methods (Placeholders/Needs Implementation) ---

  private processRouteData(input: RouteInput): void {
    console.log("GmRouteReplayOverlay: Processing route data..." /* input */); // Avoid logging large routes
    if (!this.markerRenderer) {
      console.warn(
        "GmRouteReplayOverlay: Renderers not ready for route processing."
      );
      return;
    }
    // Reset previous state thoroughly
    this.animator?.stop();
    this.markerRenderer?.removeAllMarkers();
    this.polylineRenderer?.resetAllPaths();
    this.processedRoutes.clear();
    this.trackIds = [];
    this.trackStartTimes.clear();
    this.trackEndTimes.clear();
    this.trackDurations.clear();
    this.globalStartTimeMs = Infinity;
    this.globalEndTimeMs = -Infinity;
    this.globalDurationMs = 0;
    this.currentTimelineTimeMs = 0;
    this.isMultiTrackMode = false;

    if (typeof input === "string") {
      console.error("URL route loading not implemented yet in Overlay.");
      this.triggerEvent("error", {
        error: new Error("URL loading not implemented."),
      });
      return;
    }

    const tempRoutes = new Map<string, RoutePoint[]>();
    let minTime = Infinity;
    let maxTime = -Infinity;

    if (Array.isArray(input)) {
      // --- Handle Single Track ---
      this.isMultiTrackMode = false;
      const trackId = "main";
      if (input.length < 2) {
        console.error(
          "GmRouteReplayOverlay: Single track needs at least two points."
        );
        this.triggerEvent("error", {
          error: new Error("Single track needs at least two points."),
        });
        return; // Stop processing
      }
      const sortedRoute = [...input].sort((a, b) => a.t - b.t);
      tempRoutes.set(trackId, sortedRoute);
      this.trackIds = [trackId];
      const trackStart = sortedRoute[0].t;
      const trackEnd = sortedRoute[sortedRoute.length - 1].t;
      this.trackStartTimes.set(trackId, trackStart);
      this.trackEndTimes.set(trackId, trackEnd);
      this.trackDurations.set(trackId, Math.max(0, trackEnd - trackStart));
      minTime = trackStart;
      maxTime = trackEnd;
    } else {
      // --- Handle Multi Track ---
      this.isMultiTrackMode = true;
      const inputTrackIds = Object.keys(input);
      if (inputTrackIds.length === 0) {
        console.error(
          "GmRouteReplayOverlay: Multi-track object cannot be empty."
        );
        this.triggerEvent("error", {
          error: new Error("Multi-track object cannot be empty."),
        });
        return; // Stop processing
      }

      for (const trackId of inputTrackIds) {
        const route = input[trackId];
        if (!Array.isArray(route) || route.length < 2) {
          console.warn(
            `GmRouteReplayOverlay: Invalid route data for track ${trackId}, skipping.`
          );
          continue; // Skip this invalid track
        }
        const sortedRoute = [...route].sort((a, b) => a.t - b.t);
        tempRoutes.set(trackId, sortedRoute);
        const trackStart = sortedRoute[0].t;
        const trackEnd = sortedRoute[sortedRoute.length - 1].t;
        this.trackStartTimes.set(trackId, trackStart);
        this.trackEndTimes.set(trackId, trackEnd);
        this.trackDurations.set(trackId, Math.max(0, trackEnd - trackStart));
        minTime = Math.min(minTime, trackStart);
        maxTime = Math.max(maxTime, trackEnd);
      }
      // Filter out trackIds that were skipped
      this.trackIds = inputTrackIds.filter((id) => tempRoutes.has(id));
    }

    if (this.trackIds.length === 0) {
      console.error(
        "GmRouteReplayOverlay: No valid tracks found after processing."
      );
      this.triggerEvent("error", {
        error: new Error("No valid tracks found."),
      });
      return;
    }

    // --- Finalize State ---
    this.processedRoutes = tempRoutes;
    this.globalStartTimeMs = minTime;
    this.globalEndTimeMs = maxTime;
    this.globalDurationMs = Math.max(
      0,
      this.globalEndTimeMs - this.globalStartTimeMs
    );
    // Log calculated times
    console.log(
      `GmRouteReplayOverlay: Route processed. ${this.trackIds.length} track(s).`,
      `Start: ${this.globalStartTimeMs}, End: ${this.globalEndTimeMs}, Duration: ${this.globalDurationMs}ms`
    );

    // Initial rendering of markers/polylines at time 0
    this.updateRenderersAtTime(0);

    // Auto-fit bounds if enabled
    if (this.options.autoFit !== false) {
      const bounds = new google.maps.LatLngBounds();
      this.processedRoutes.forEach((route) => {
        route.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      });
      if (!bounds.isEmpty()) {
        (this.getMap() as google.maps.Map)?.fitBounds(bounds);
        console.log("GmRouteReplayOverlay: Map bounds fitted.");
      }
    }
    this.needsRedraw = true; // Request redraw if needed
    // Trigger a seek event to ensure initial state (progress 0) is known externally
    this.triggerEvent("seek", { timeMs: 0 });
  }

  private handleFrame(relativeTimelineTimeMs: number): void {
    // Log received relative time
    // console.log(`handleFrame received relativeTime: ${relativeTimelineTimeMs}`);
    if (!this.isInitialized || !this.getMap()) return;

    const clampedRelativeTime = Math.max(
      0,
      Math.min(relativeTimelineTimeMs, this.globalDurationMs)
    );
    this.currentTimelineTimeMs = clampedRelativeTime; // Keep internal state relative

    const absoluteCurrentTime = this.globalStartTimeMs + clampedRelativeTime;
    // Log absolute time passed to updates
    // console.log(`handleFrame calculated absoluteTime: ${absoluteCurrentTime}`);

    this.updateRenderersAtTime(absoluteCurrentTime); // Update markers with absolute time
    this.updateCamera(absoluteCurrentTime); // Update camera with absolute time

    // --- Add Polyline Point Logic ---
    if (this.polylineRenderer && absoluteCurrentTime > this.globalStartTimeMs) {
      // Use absolute time check
      this.trackIds.forEach((trackId) => {
        const route = this.processedRoutes.get(trackId);
        const startTime = this.trackStartTimes.get(trackId);
        const duration = this.trackDurations.get(trackId);
        if (!route || startTime === undefined || duration === undefined) return;

        // Interpolate using absolute time
        const interpolated = interpolateRoute(
          route,
          absoluteCurrentTime,
          startTime,
          duration
        );
        if (interpolated) {
          this.polylineRenderer?.addPoint(trackId, {
            lat: interpolated.lat,
            lng: interpolated.lng,
          });
        }
      });
    }
    // --- End Polyline Point Logic ---

    // --- Emit frame event ---
    // Event payload usually uses relative progress/time, but let's ensure consistency.
    // We might need to calculate relative progress here based on absolute time if needed.
    this.trackIds.forEach((trackId) => {
      const route = this.processedRoutes.get(trackId);
      const trackStartTime = this.trackStartTimes.get(trackId);
      const trackDuration = this.trackDurations.get(trackId);
      if (
        !route ||
        trackStartTime === undefined ||
        trackDuration === undefined ||
        trackDuration <= 0
      )
        return;

      // calculate interpolated point using absoluteCurrentTime
      const interpolated = interpolateRoute(
        route,
        absoluteCurrentTime,
        trackStartTime,
        trackDuration
      );
      if (interpolated) {
        // progress might need recalculation if expected relative 0-1
        const relativeProgress =
          (absoluteCurrentTime - trackStartTime) / trackDuration;
        this.triggerEvent("frame", {
          trackId: trackId,
          pos: { lat: interpolated.lat, lng: interpolated.lng },
          heading: interpolated.heading,
          progress: Math.max(0, Math.min(1, relativeProgress)), // Ensure progress is 0-1
        });
      }
    });
    // --- End Emit frame event ---

    // Check finish condition using relative time
    if (this.currentTimelineTimeMs >= this.globalDurationMs) {
      this.handleFinish();
    }
  }

  private updateRenderersAtTime(absoluteTimeMs: number): void {
    // Log absolute time received
    // console.log(`updateRenderersAtTime received absoluteTime: ${absoluteTimeMs}`);
    this.trackIds.forEach((trackId) => {
      const route = this.processedRoutes.get(trackId);
      const startTime = this.trackStartTimes.get(trackId);
      const duration = this.trackDurations.get(trackId);

      if (!route || startTime === undefined || duration === undefined) return;

      // interpolateRoute expects absolute time
      const interpolated = interpolateRoute(
        route,
        absoluteTimeMs,
        startTime,
        duration
      );

      if (interpolated) {
        const pos = { lat: interpolated.lat, lng: interpolated.lng };
        this.markerRenderer?.updateMarker(trackId, pos, interpolated.heading);
      } else {
        this.markerRenderer?.removeMarker(trackId);
      }
    });
  }

  private updateCamera(absoluteTimeMs: number): void {
    if (this.currentCameraMode === "none" || !this.getMap()) return;

    let focusPoint: InterpolatedPoint | null = null;
    const focusTrackId = this.trackIds[0];

    if (focusTrackId) {
      const route = this.processedRoutes.get(focusTrackId);
      const startTime = this.trackStartTimes.get(focusTrackId);
      const duration = this.trackDurations.get(focusTrackId);
      if (route && startTime !== undefined && duration !== undefined) {
        // interpolateRoute expects absolute time
        focusPoint = interpolateRoute(
          route,
          absoluteTimeMs,
          startTime,
          duration
        );
      }
    }

    if (focusPoint) {
      const map = this.getMap() as google.maps.Map;
      const currentPosition = { lat: focusPoint.lat, lng: focusPoint.lng };

      if (this.currentCameraMode === "center") {
        map.panTo(currentPosition);
      } else if (
        this.currentCameraMode === "ahead" &&
        focusPoint.heading !== undefined
      ) {
        if (typeof google?.maps?.geometry?.spherical !== "undefined") {
          map.moveCamera({
            center: currentPosition,
            heading: focusPoint.heading,
            tilt: this.currentCameraOptions.defaultTilt,
            zoom: this.currentCameraOptions.zoomLevel,
          });
        } else {
          console.warn("Camera 'ahead' mode requires geometry library.");
          map.panTo(currentPosition); // Fallback
        }
      } else if (this.currentCameraMode === "ahead") {
        console.warn("Camera 'ahead' mode requires heading data.");
        map.panTo(currentPosition); // Fallback
      }
    }
  }

  private handleFinish(): void {
    console.log("GmRouteReplayOverlay: Playback finished.");
    this.animator?.pause(); // Ensure animator stops
    // Ensure markers are at their final positions using the absolute end time
    this.updateRenderersAtTime(this.globalEndTimeMs); // Use absolute end time
    this.triggerEvent("finish", undefined);
  }

  // --- Event Handling ---
  private triggerEvent<E extends PlayerEvent>(
    event: E,
    payload?: Parameters<PlayerEventMap[E]>[0]
  ): void {
    console.log(`GmRouteReplayOverlay: Triggering event: ${event}`, payload);
    google.maps.event.trigger(this, event, payload);
  }

  // --- Public API Methods ---

  public play(): void {
    console.log("GmRouteReplayOverlay: play()");
    if (!this.isInitialized || !this.animator) return;
    // If already at the end, restart from beginning? Or do nothing?
    if (this.currentTimelineTimeMs >= this.globalDurationMs) {
      this.seek(0); // Restart if finished
    }
    this.animator.start(this.handleFrame.bind(this));
    this.triggerEvent("start", undefined);
  }

  public pause(): void {
    console.log("GmRouteReplayOverlay: pause()");
    if (!this.isInitialized || !this.animator) return;
    this.animator.pause();
    this.triggerEvent("pause", undefined);
  }

  public stop(): void {
    console.log("GmRouteReplayOverlay: stop()");
    if (!this.isInitialized || !this.animator) return;
    this.animator.stop(); // Stops and resets animator time
    this.currentTimelineTimeMs = 0; // Reset internal timeline
    this.updateRenderersAtTime(0); // Move markers to start
    this.updateCamera(0); // Move camera to start
    this.polylineRenderer?.resetAllPaths(); // Clear polylines on stop
    this.triggerEvent("seek", { timeMs: 0 }); // Notify state change
    // Note: Stop doesn't usually emit a 'stop' event, maybe 'pause' and 'seek' cover it
    this.triggerEvent("pause", undefined); // Reflect paused state
  }

  public seek(timeMs: number): void {
    console.log(
      `GmRouteReplayOverlay: seek(${timeMs}) - Logic Rebuild V4 (Absolute Time)`
    );
    if (!this.isInitialized || !this.animator || !this.polylineRenderer) return;

    const clampedTime = Math.max(0, Math.min(timeMs, this.globalDurationMs));
    this.animator.setCurrentTimelineTimeMs(clampedTime);
    this.currentTimelineTimeMs = clampedTime; // Keep internal state relative for animator/UI sync

    const absoluteTargetTimeForRender = this.globalStartTimeMs + clampedTime;
    // Log absolute time passed to updates
    console.log(`seek calculated absoluteTime: ${absoluteTargetTimeForRender}`);

    this.updateRenderersAtTime(absoluteTargetTimeForRender); // Update markers with absolute time
    this.updateCamera(absoluteTargetTimeForRender); // Update camera with absolute time

    // --- Polyline Update Logic Rebuild V4 --- //
    this.trackIds.forEach((trackId) => {
      const route = this.processedRoutes.get(trackId);
      // trackStartTime is the absolute start time of this specific track
      const trackStartTime = this.trackStartTimes.get(trackId);
      const trackDuration = this.trackDurations.get(trackId);

      if (
        !route ||
        trackStartTime === undefined ||
        trackDuration === undefined ||
        route.length === 0
      ) {
        this.polylineRenderer?.setPath(trackId, []);
        return;
      }

      // Use the same absolute target time calculated above
      const absoluteTargetTime = absoluteTargetTimeForRender;

      // If the target time is before this track even starts, clear its path
      if (absoluteTargetTime < trackStartTime) {
        this.polylineRenderer?.setPath(trackId, []);
        return;
      }

      // 1. Get original points with absolute time <= absoluteTargetTime
      const originalPoints = route.filter((p) => p.t <= absoluteTargetTime);

      // 2. Map to LatLng
      let pathPoints = originalPoints.map((p) => ({ lat: p.lat, lng: p.lng }));

      // 3. Interpolate using the absolute target time
      // Ensure interpolateRoute handles absolute time correctly relative to trackStartTime/trackDuration
      const targetPoint = interpolateRoute(
        route,
        absoluteTargetTime,
        trackStartTime,
        trackDuration
      );

      // 4. Add interpolated point if valid and different from the last original point's coords
      if (targetPoint) {
        const targetLatLng = { lat: targetPoint.lat, lng: targetPoint.lng };
        const lastPointInPath =
          pathPoints.length > 0 ? pathPoints[pathPoints.length - 1] : null;

        if (
          !lastPointInPath ||
          lastPointInPath.lat !== targetLatLng.lat ||
          lastPointInPath.lng !== targetLatLng.lng
        ) {
          // Check time condition: only add if absoluteTargetTime is strictly after the last original point's time
          const lastOriginalPointTime =
            originalPoints.length > 0
              ? originalPoints[originalPoints.length - 1].t
              : -Infinity;
          if (absoluteTargetTime > lastOriginalPointTime) {
            pathPoints.push(targetLatLng);
          }
        }
      }

      // 5. Ensure minimum 2 points if path has exactly 1 point
      if (pathPoints.length === 1) {
        pathPoints.push({ ...pathPoints[0] }); // Duplicate the single point
        console.warn(
          `Path for track ${trackId} at relative time ${clampedTime} had only 1 point. Duplicating.`
        );
      }

      // Log the path being set
      console.log(
        `Setting path for track ${trackId} at relative time ${clampedTime} (abs: ${absoluteTargetTime}):`,
        JSON.stringify(pathPoints)
      );
      this.polylineRenderer?.setPath(trackId, pathPoints);
    });
    // --- End Polyline Update Logic Rebuild V4 --- //

    // Event payload should remain relative time for UI consistency
    this.triggerEvent("seek", { timeMs: clampedTime });
  }

  public setSpeed(multiplier: number): void {
    console.log(`GmRouteReplayOverlay: setSpeed(${multiplier})`);
    if (!this.isInitialized || !this.animator) return;
    this.animator.setSpeed(multiplier);
    // Optionally trigger an event if external state needs update
  }

  public setCameraMode(mode: CameraMode, options?: CameraOptions): void {
    console.log(`GmRouteReplayOverlay: setCameraMode(${mode})`, options);
    if (!this.isInitialized) return;
    this.currentCameraMode = mode;
    if (options) {
      this.currentCameraOptions = {
        aheadDistance:
          options.aheadDistance ?? this.currentCameraOptions.aheadDistance,
        defaultTilt:
          options.defaultTilt ?? this.currentCameraOptions.defaultTilt,
        zoomLevel: options.zoomLevel ?? this.currentCameraOptions.zoomLevel,
      };
      console.log("Updated camera options:", this.currentCameraOptions);
    }
    // Apply camera update immediately based on current time
    this.updateCamera(this.currentTimelineTimeMs);
    // Optionally trigger an event
  }

  public setRoute(route: RouteInput): void {
    console.log("GmRouteReplayOverlay: setRoute called", route);
    if (!this.isInitialized) {
      // If called before initialization, store it for onAdd
      this.options.route = route;
      return;
    }
    // Store new route in options in case options are read elsewhere
    this.options.route = route;
    // Re-process the route data
    this.processRouteData(route);
    // Optionally trigger an event
  }

  public setOptions(options: Partial<PlayerOptions>): void {
    console.log("GmRouteReplayOverlay: setOptions called", options);
    // Update internal options, selectively applying changes
    // Example: only update if the value is provided
    if (options.fps !== undefined) this.options.fps = options.fps;
    if (options.initialSpeed !== undefined)
      this.options.initialSpeed = options.initialSpeed;
    // ... other scalar options

    // Handle options that require component re-initialization or updates
    let needsRendererReinit = false;
    if (
      options.rendererType !== undefined &&
      options.rendererType !== this.options.rendererType
    ) {
      this.options.rendererType = options.rendererType;
      needsRendererReinit = true;
      console.log("Renderer type changed, needs re-initialization.");
    }
    if (options.markerOptions !== undefined) {
      this.options.markerOptions = options.markerOptions;
      // Apply to existing marker renderer if possible
      if (this.markerRenderer instanceof MarkerRenderer) {
        console.warn(
          "Updating MarkerRenderer options dynamically is not yet fully implemented. Re-creating overlay might be needed."
        );
      } else if (needsRendererReinit) {
        // Will be handled by re-initialization
      } else {
        console.warn("Cannot apply markerOptions to current renderer type.");
      }
    }
    // ... handle polylineOptions, cameraMode, cameraOptions similarly ...

    // Handle route changes via setRoute if provided
    if (options.route !== undefined) {
      this.setRoute(options.route);
    }

    // If major changes require re-init (like renderer type), potentially call parts of onAdd/onRemove logic
    if (needsRendererReinit && this.isInitialized && this.getMap()) {
      console.log("Re-initializing renderer...");
      const map = this.getMap() as google.maps.Map;
      this.markerRenderer?.destroy(); // Destroy old one
      const rendererType = this.options.rendererType ?? "marker";
      if (rendererType === "webgl") {
        this.markerRenderer = new WebGLOverlayRenderer({ map });
      } else {
        this.markerRenderer = new MarkerRenderer({
          map: map as google.maps.Map,
          markerOptions: this.options.markerOptions,
        });
      }
      // this.markerRenderer.mount(); // Ensure it's mounted/ready

      // Redraw markers at current position after renderer change
      this.updateRenderersAtTime(this.currentTimelineTimeMs);
    }

    // Update animator if relevant options changed
    if (
      (options.fps !== undefined || options.initialSpeed !== undefined) &&
      this.animator
    ) {
      // Check if was running using alternative condition
      const wasRunning =
        this.animator.getCurrentTimelineTimeMs() > 0 &&
        this.currentTimelineTimeMs < this.globalDurationMs;
      this.animator.destroy(); // Destroy old animator
      this.animator = new Animator({
        // Create new one
        fps: this.options.fps ?? 60,
        initialSpeed: this.options.initialSpeed,
      });
      this.animator.setCurrentTimelineTimeMs(this.currentTimelineTimeMs);
      if (wasRunning) {
        this.animator.start(this.handleFrame.bind(this)); // Restore state with handler
      }
    }

    console.log("GmRouteReplayOverlay: Options updated.");
  }

  // Note: `on` method is handled by google.maps.event.addListener externally

  // destroy method might be needed if called explicitly without setMap(null)
  public destroy(): void {
    console.warn(
      "GmRouteReplayOverlay: destroy() called explicitly. Prefer setMap(null)."
    );
    this.setMap(null); // Should trigger onRemove
  }

  // --- Getter Methods ---
  public getDurationMs(): number {
    return this.globalDurationMs;
  }
}
