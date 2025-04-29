import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  GmRouteReplayOverlay,
  PlayerOptions as CoreOptions,
  RouteInput,
  PlayerEventMap,
  PlayerEvent,
  CameraMode,
  CameraOptions,
} from "gm-route-replay-core";

type ComponentSpecificOptions = Omit<CoreOptions, "map" | "route">;

interface RouteReplayProps extends ComponentSpecificOptions {
  map: google.maps.Map | null | undefined;
  route: RouteInput;

  onFrame?: PlayerEventMap["frame"];
  onStart?: PlayerEventMap["start"];
  onPause?: PlayerEventMap["pause"];
  onSeek?: PlayerEventMap["seek"];
  onFinish?: PlayerEventMap["finish"];
  onError?: PlayerEventMap["error"];
}

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

    const prevRouteRef = useRef<RouteInput | null>(null);
    const prevOptionsStringRef = useRef<string | null>(null);

    useEffect(() => {
      if (!map || !route) {
        if (overlayRef.current) {
          console.log(
            "RouteReplay Component: Map or Route became null, removing overlay."
          );
          overlayRef.current.setMap(null);
          overlayRef.current = null;
        }
        return;
      }

      let isMounted = true;

      const initializeOverlay = async () => {
        try {
          const { GmRouteReplayOverlay } = await import("gm-route-replay-core");

          if (!isMounted) return;

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
            overlayRef.current.setMap(map);
          } else {
            if (overlayRef.current.getMap() !== map) {
              console.log(
                "RouteReplay Component: Setting map on existing overlay instance."
              );
              overlayRef.current.setMap(map);
            }
          }

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

      return () => {
        isMounted = false;
        console.log("RouteReplay Component: Main useEffect cleanup running...");

        listenersRef.current.forEach((listener) => listener.remove());
        listenersRef.current = [];

        if (overlayRef.current) {
          console.log(
            "RouteReplay Component: Detaching overlay map on unmount."
          );
          overlayRef.current.setMap(null);
          overlayRef.current = null;
        }

        prevRouteRef.current = null;
        prevOptionsStringRef.current = null;
      };
    }, [map, onFrame, onStart, onPause, onSeek, onFinish, onError]);

    useEffect(() => {
      if (overlayRef.current && route && route !== prevRouteRef.current) {
        console.log(
          "RouteReplay Component: Route prop changed, calling setRoute."
        );
        overlayRef.current.setRoute(route);
        prevRouteRef.current = route;
      }
    }, [route]);

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
    }, [JSON.stringify(overlayOptions)]);

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
    );

    return null;
  }
);

RouteReplay.displayName = "RouteReplay";
