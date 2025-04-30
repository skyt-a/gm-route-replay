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
  private options: Partial<PlayerOptions> = {};

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
  private currentTimelineTimeMs: number = 0;

  private animator: Animator | null = null;
  private markerRenderer: IRenderer | null = null;
  private polylineRenderer: PolylineRenderer | null = null;

  private needsRedraw = false;

  private isPausedBeforeSeek = false;

  constructor(options: PlayerOptions) {
    super();

    if (!options.map) {
      throw new Error(
        "GmRouteReplayOverlay requires a `map` instance in options."
      );
    }
    if (!options.route) {
      throw new Error("GmRouteReplayOverlay requires `route` data in options.");
    }

    this.options = { ...options };
    this.currentCameraMode = options.cameraMode ?? "center";
    this.currentCameraOptions = {
      aheadDistance: options.cameraOptions?.aheadDistance ?? 100,
      defaultTilt: options.cameraOptions?.defaultTilt ?? 45,
      zoomLevel: options.cameraOptions?.zoomLevel ?? 15,
    };
  }

  /**
   * Called when the overlay is added to the map via `setMap()`.
   * Initialize components here.
   */
  onAdd(): void {
    const map = this.getMap();
    if (!map) {
      console.error("GmRouteReplayOverlay: Map not available in onAdd");
      return;
    }

    this.animator = new Animator({
      fps: this.options.fps ?? 60,
      initialSpeed: this.options.initialSpeed,
    });

    const rendererType = this.options.rendererType ?? "marker";
    if (rendererType === "webgl") {
      this.markerRenderer = new WebGLOverlayRenderer({
        map: map as google.maps.Map,
      });
    } else {
      this.markerRenderer = new MarkerRenderer({
        map: map as google.maps.Map,
        markerOptions: this.options.markerOptions,
      });
    }
    this.markerRenderer.mount();

    if (this.options.polylineOptions) {
      this.polylineRenderer = new PolylineRenderer({
        map: map as google.maps.Map,
        polylineOptions: this.options.polylineOptions,
      });
    }

    if (this.options.route) {
      this.processRouteData(this.options.route);
    } else {
      console.warn("GmRouteReplayOverlay: No route data provided initially.");
    }

    this.isInitialized = true;
  }

  /**
   * Called when the overlay is removed from the map via `setMap(null)`.
   * Clean up resources here.
   */
  onRemove(): void {
    this.isInitialized = false;

    this.animator?.destroy();
    this.markerRenderer?.destroy();
    this.polylineRenderer?.destroy();

    this.animator = null;
    this.markerRenderer = null;
    this.polylineRenderer = null;

    this.processedRoutes.clear();
    this.trackIds = [];
  }

  /**
   * Called frequently when the map characteristics change (zoom, center)
   * and potentially on `requestAnimationFrame`.
   * This is where elements are positioned/drawn on the map pane.
   */
  draw(): void {
    if (!this.isInitialized || !this.getMap() || !this.getProjection()) {
      return;
    }

    if (this.needsRedraw) {
      this.needsRedraw = false;
    }
  }

  private processRouteData(input: RouteInput): void {
    if (!this.markerRenderer) {
      console.warn(
        "GmRouteReplayOverlay: Renderers not ready for route processing."
      );
      return;
    }

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
      this.isMultiTrackMode = false;
      const trackId = "main";
      if (input.length < 2) {
        console.error(
          "GmRouteReplayOverlay: Single track needs at least two points."
        );
        this.triggerEvent("error", {
          error: new Error("Single track needs at least two points."),
        });
        return;
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
      this.isMultiTrackMode = true;
      const inputTrackIds = Object.keys(input);
      if (inputTrackIds.length === 0) {
        console.error(
          "GmRouteReplayOverlay: Multi-track object cannot be empty."
        );
        this.triggerEvent("error", {
          error: new Error("Multi-track object cannot be empty."),
        });
        return;
      }

      for (const trackId of inputTrackIds) {
        const route = input[trackId];
        if (!Array.isArray(route) || route.length < 2) {
          console.warn(
            `GmRouteReplayOverlay: Invalid route data for track ${trackId}, skipping.`
          );
          continue;
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

    this.processedRoutes = tempRoutes;
    this.globalStartTimeMs = minTime;
    this.globalEndTimeMs = maxTime;
    this.globalDurationMs = Math.max(
      0,
      this.globalEndTimeMs - this.globalStartTimeMs
    );
    this.updateRenderersAtTime(0);
    if (this.options.autoFit !== false) {
      const bounds = new google.maps.LatLngBounds();
      this.processedRoutes.forEach((route) => {
        route.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      });
      if (!bounds.isEmpty()) {
        (this.getMap() as google.maps.Map)?.fitBounds(bounds);
      }
    }
    this.needsRedraw = true;

    this.triggerEvent("seek", { timeMs: 0 });
  }

  private handleFrame(relativeTimelineTimeMs: number): void {
    if (!this.isInitialized || !this.getMap()) return;

    const clampedRelativeTime = Math.max(
      0,
      Math.min(relativeTimelineTimeMs, this.globalDurationMs)
    );
    this.currentTimelineTimeMs = clampedRelativeTime;

    const absoluteCurrentTime = this.globalStartTimeMs + clampedRelativeTime;

    this.updateRenderersAtTime(absoluteCurrentTime);
    this.updateCamera(absoluteCurrentTime);

    if (this.polylineRenderer && absoluteCurrentTime > this.globalStartTimeMs) {
      this.trackIds.forEach((trackId) => {
        const route = this.processedRoutes.get(trackId);
        const startTime = this.trackStartTimes.get(trackId);
        const duration = this.trackDurations.get(trackId);
        if (!route || startTime === undefined || duration === undefined) return;

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

      const interpolated = interpolateRoute(
        route,
        absoluteCurrentTime,
        trackStartTime,
        trackDuration
      );
      if (interpolated) {
        const relativeProgress =
          (absoluteCurrentTime - trackStartTime) / trackDuration;
        this.triggerEvent("frame", {
          trackId: trackId,
          pos: { lat: interpolated.lat, lng: interpolated.lng },
          heading: interpolated.heading,
          progress: Math.max(0, Math.min(1, relativeProgress)),
        });
      }
    });

    if (this.currentTimelineTimeMs >= this.globalDurationMs) {
      this.handleFinish();
    }
  }

  private updateRenderersAtTime(absoluteTimeMs: number): void {
    this.trackIds.forEach((trackId) => {
      const route = this.processedRoutes.get(trackId);
      const startTime = this.trackStartTimes.get(trackId);
      const duration = this.trackDurations.get(trackId);

      if (!route || startTime === undefined || duration === undefined) return;

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
        map.setCenter(currentPosition);
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
          map.setCenter(currentPosition);
        }
      } else if (this.currentCameraMode === "ahead") {
        console.warn("Camera 'ahead' mode requires heading data.");
        map.setCenter(currentPosition);
      }
    }
  }

  private handleFinish(): void {
    this.animator?.pause();

    this.updateRenderersAtTime(this.globalEndTimeMs);
    this.triggerEvent("finish", undefined);
  }

  private triggerEvent<E extends PlayerEvent>(
    event: E,
    payload?: Parameters<PlayerEventMap[E]>[0]
  ): void {
    google.maps.event.trigger(this, event, payload);
  }

  public play(): void {
    if (!this.isInitialized || !this.animator) return;

    if (this.currentTimelineTimeMs >= this.globalDurationMs) {
      this.seek(0);
    }
    this.animator.start(this.handleFrame.bind(this));
    this.triggerEvent("start", undefined);
  }

  public pause(): void {
    if (!this.isInitialized || !this.animator) return;
    this.animator.pause();
    this.triggerEvent("pause", undefined);
  }

  public stop(): void {
    if (!this.isInitialized || !this.animator) return;
    this.animator.stop();
    this.currentTimelineTimeMs = 0;
    this.updateRenderersAtTime(0);
    this.updateCamera(0);
    this.polylineRenderer?.resetAllPaths();
    this.triggerEvent("seek", { timeMs: 0 });

    this.triggerEvent("pause", undefined);
  }

  public seek(timeMs: number): void {
    if (!this.isInitialized || !this.animator || !this.polylineRenderer) return;
    if (this.animator.isPaused()) {
      this.isPausedBeforeSeek = true;
    } else {
      this.isPausedBeforeSeek = false;
      this.pause();
    }
    const clampedTime = Math.max(0, Math.min(timeMs, this.globalDurationMs));
    this.animator.setCurrentTimelineTimeMs(clampedTime);
    this.currentTimelineTimeMs = clampedTime;

    const absoluteTargetTimeForRender = this.globalStartTimeMs + clampedTime;

    this.updateRenderersAtTime(absoluteTargetTimeForRender);
    this.updateCamera(absoluteTargetTimeForRender);

    this.trackIds.forEach((trackId) => {
      const route = this.processedRoutes.get(trackId);

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

      const absoluteTargetTime = absoluteTargetTimeForRender;

      if (absoluteTargetTime < trackStartTime) {
        this.polylineRenderer?.setPath(trackId, []);
        return;
      }

      const originalPoints = route.filter((p) => p.t <= absoluteTargetTime);

      let pathPoints = originalPoints.map((p) => ({ lat: p.lat, lng: p.lng }));

      const targetPoint = interpolateRoute(
        route,
        absoluteTargetTime,
        trackStartTime,
        trackDuration
      );

      if (targetPoint) {
        const targetLatLng = { lat: targetPoint.lat, lng: targetPoint.lng };
        const lastPointInPath =
          pathPoints.length > 0 ? pathPoints[pathPoints.length - 1] : null;

        if (
          !lastPointInPath ||
          lastPointInPath.lat !== targetLatLng.lat ||
          lastPointInPath.lng !== targetLatLng.lng
        ) {
          const lastOriginalPointTime =
            originalPoints.length > 0
              ? originalPoints[originalPoints.length - 1].t
              : -Infinity;
          if (absoluteTargetTime > lastOriginalPointTime) {
            pathPoints.push(targetLatLng);
          }
        }
      }

      if (pathPoints.length === 1) {
        pathPoints.push({ ...pathPoints[0] });
        console.warn(
          `Path for track ${trackId} at relative time ${clampedTime} had only 1 point. Duplicating.`
        );
      }

      this.polylineRenderer?.setPath(trackId, pathPoints);
    });

    this.triggerEvent("seek", { timeMs: clampedTime });
    if (!this.isPausedBeforeSeek) {
      this.play();
    }
  }

  public setSpeed(multiplier: number): void {
    if (!this.isInitialized || !this.animator) return;
    this.animator.setSpeed(multiplier);
  }

  public setCameraMode(mode: CameraMode, options?: CameraOptions): void {
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
    }

    this.updateCamera(this.currentTimelineTimeMs);
  }

  public setRoute(route: RouteInput): void {
    if (!this.isInitialized) {
      this.options.route = route;
      return;
    }

    this.options.route = route;

    this.processRouteData(route);
  }

  public setOptions(options: Partial<PlayerOptions>): void {
    if (options.fps !== undefined) this.options.fps = options.fps;
    if (options.initialSpeed !== undefined)
      this.options.initialSpeed = options.initialSpeed;

    let needsRendererReinit = false;
    if (
      options.rendererType !== undefined &&
      options.rendererType !== this.options.rendererType
    ) {
      this.options.rendererType = options.rendererType;
      needsRendererReinit = true;
    }
    if (options.markerOptions !== undefined) {
      this.options.markerOptions = options.markerOptions;

      if (this.markerRenderer instanceof MarkerRenderer) {
        console.warn(
          "Updating MarkerRenderer options dynamically is not yet fully implemented. Re-creating overlay might be needed."
        );
      } else if (needsRendererReinit) {
      } else {
        console.warn("Cannot apply markerOptions to current renderer type.");
      }
    }

    if (options.route !== undefined) {
      this.setRoute(options.route);
    }

    if (needsRendererReinit && this.isInitialized && this.getMap()) {
      const map = this.getMap() as google.maps.Map;
      this.markerRenderer?.destroy();
      const rendererType = this.options.rendererType ?? "marker";
      if (rendererType === "webgl") {
        this.markerRenderer = new WebGLOverlayRenderer({ map });
      } else {
        this.markerRenderer = new MarkerRenderer({
          map: map as google.maps.Map,
          markerOptions: this.options.markerOptions,
        });
      }

      this.updateRenderersAtTime(this.currentTimelineTimeMs);
    }

    if (
      (options.fps !== undefined || options.initialSpeed !== undefined) &&
      this.animator
    ) {
      const wasRunning =
        this.animator.getCurrentTimelineTimeMs() > 0 &&
        this.currentTimelineTimeMs < this.globalDurationMs;
      this.animator.destroy();
      this.animator = new Animator({
        fps: this.options.fps ?? 60,
        initialSpeed: this.options.initialSpeed,
      });
      this.animator.setCurrentTimelineTimeMs(this.currentTimelineTimeMs);
      if (wasRunning) {
        this.animator.start(this.handleFrame.bind(this));
      }
    }
  }

  public destroy(): void {
    console.warn(
      "GmRouteReplayOverlay: destroy() called explicitly. Prefer setMap(null)."
    );
    this.setMap(null);
  }

  public getDurationMs(): number {
    return this.globalDurationMs;
  }
}
