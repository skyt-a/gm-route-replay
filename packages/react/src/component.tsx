import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  GmRouteReplayOverlay,
  PlayerOptions as CoreOptions, // Rename to avoid conflict if needed
  RouteInput,
  PlayerEventMap,
  PlayerEvent,
  CameraMode,
  CameraOptions,
} from "gm-route-replay-core";

// Define props for the component
// Exclude 'map' and 'route' from CoreOptions as they are separate props
type ComponentSpecificOptions = Omit<CoreOptions, "map" | "route">;

interface RouteReplayProps extends ComponentSpecificOptions {
  map: google.maps.Map | null | undefined;
  route: RouteInput;
  // Event Handlers mapped from PlayerEventMap
  onFrame?: PlayerEventMap["frame"];
  onStart?: PlayerEventMap["start"];
  onPause?: PlayerEventMap["pause"];
  onSeek?: PlayerEventMap["seek"];
  onFinish?: PlayerEventMap["finish"];
  onError?: PlayerEventMap["error"];
  // Add other props like className, style if needed
}

// Define the handle type for useImperativeHandle
export interface RouteReplayHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (ms: number) => void;
  setSpeed: (multiplier: number) => void;
  setCameraMode: (mode: CameraMode, options?: CameraOptions) => void;
  setRoute: (route: RouteInput) => void;
  setOptions: (options: Partial<CoreOptions>) => void;
  getDurationMs: () => number;
  // Add other methods if needed
}

export const RouteReplay = forwardRef<RouteReplayHandle, RouteReplayProps>(
  (props, ref) => {
    const {
      map,
      route,
      onFrame,
      onStart,
      onPause,
      onSeek,
      onFinish,
      onError,
      ...overlayOptions // Rest are options for the overlay constructor/setOptions
    } = props;

    const overlayRef = useRef<GmRouteReplayOverlay | null>(null);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
    // Refs to store previous prop values for comparison
    const prevRouteRef = useRef<RouteInput | null>(null);
    const prevOptionsStringRef = useRef<string | null>(null);

    // Effect for creating and managing the overlay instance
    useEffect(() => {
      if (!map || !route) {
        // If map or route is not available, ensure cleanup if overlay exists
        if (overlayRef.current) {
          console.log(
            "RouteReplay Component: Map or Route became null, removing overlay."
          );
          overlayRef.current.setMap(null); // Triggers onRemove
          overlayRef.current = null;
        }
        return;
      }

      let isMounted = true; // Flag to prevent updates after unmount

      const initializeOverlay = async () => {
        try {
          // Dynamic import GmRouteReplayOverlay only when needed
          const { GmRouteReplayOverlay } = await import("gm-route-replay-core");

          if (!isMounted) return; // Don't proceed if unmounted during import

          // Create or update overlay instance
          if (!overlayRef.current) {
            console.log(
              "RouteReplay Component: Creating GmRouteReplayOverlay instance..."
            );
            const combinedOptions: CoreOptions = {
              map,
              route,
              ...overlayOptions,
            };
            overlayRef.current = new GmRouteReplayOverlay(combinedOptions);
            console.log("RouteReplay Component: Instance created.");
            overlayRef.current.setMap(map); // Set map immediately after creation
          } else {
            // If overlay exists, ensure it's on the correct map
            if (overlayRef.current.getMap() !== map) {
              console.log(
                "RouteReplay Component: Setting map on existing overlay instance."
              );
              overlayRef.current.setMap(map);
            }
            // Potentially update route/options if they weren't handled by other effects yet
            // This might be redundant if other useEffects handle updates reliably
          }

          // --- Setup Event Listeners --- (Only if overlayRef.current exists)
          if (overlayRef.current) {
            listenersRef.current.forEach((listener) => listener.remove());
            listenersRef.current = [];
            const overlay = overlayRef.current;
            const addListener = (
              event: PlayerEvent,
              handler?: (...args: any[]) => void
            ) => {
              if (handler) {
                console.log(
                  `RouteReplay Component: Adding listener for ${event}`
                );
                listenersRef.current.push(
                  google.maps.event.addListener(overlay, event, handler)
                );
              }
            };
            addListener("frame", onFrame);
            addListener("start", onStart);
            addListener("pause", onPause);
            addListener("seek", onSeek);
            addListener("finish", onFinish);
            addListener("error", onError);
          }
        } catch (error) {
          console.error(
            "RouteReplay Component: Error during dynamic import or overlay creation:",
            error
          );
          if (onError && isMounted) {
            onError({
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }
      };

      initializeOverlay();

      // --- Cleanup Function ---
      return () => {
        isMounted = false; // Set flag on cleanup
        console.log("RouteReplay Component: Main useEffect cleanup running...");
        // Listeners are removed here, overlay detached in the outer conditional or on unmount
        listenersRef.current.forEach((listener) => listener.remove());
        listenersRef.current = [];
        // Detach overlay on unmount if it exists
        if (overlayRef.current) {
          console.log(
            "RouteReplay Component: Detaching overlay map on unmount."
          );
          overlayRef.current.setMap(null);
          overlayRef.current = null; // Clear the ref
        }
        // Clear prev value refs on unmount
        prevRouteRef.current = null;
        prevOptionsStringRef.current = null;
      };
    }, [map, onFrame, onStart, onPause, onSeek, onFinish, onError]); // Include handlers in deps?

    // Effect for handling updates to route prop
    useEffect(() => {
      if (overlayRef.current && route && route !== prevRouteRef.current) {
        console.log(
          "RouteReplay Component: Route prop changed, calling setRoute."
        );
        overlayRef.current.setRoute(route);
        prevRouteRef.current = route;
      }
    }, [route]);

    // Effect for handling updates to other options
    useEffect(() => {
      if (overlayRef.current) {
        const currentOptionsString = JSON.stringify(overlayOptions);
        if (currentOptionsString !== prevOptionsStringRef.current) {
          console.log(
            "RouteReplay Component: Options changed, calling setOptions.",
            overlayOptions
          );
          overlayRef.current.setOptions(overlayOptions);
          prevOptionsStringRef.current = currentOptionsString;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(overlayOptions)]);

    // Expose control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        play: () => overlayRef.current?.play(),
        pause: () => overlayRef.current?.pause(),
        stop: () => overlayRef.current?.stop(),
        seek: (ms) => overlayRef.current?.seek(ms),
        setSpeed: (multiplier) => overlayRef.current?.setSpeed(multiplier),
        setCameraMode: (mode, camOptions) =>
          overlayRef.current?.setCameraMode(mode, camOptions),
        setRoute: (newRoute) => overlayRef.current?.setRoute(newRoute),
        setOptions: (newOptions) => overlayRef.current?.setOptions(newOptions),
        getDurationMs: () => overlayRef.current?.getDurationMs() ?? 0,
      }),
      []
    ); // Empty dependency array ensures the handle doesn't change

    // This component doesn't render anything itself, it just manages the overlay
    return null;
  }
);

RouteReplay.displayName = "RouteReplay"; // For better debugging
