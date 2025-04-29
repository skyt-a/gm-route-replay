/// <reference types="@types/google.maps" />

import { useState, useEffect, useRef, useCallback } from "react";
import {
  createPlayer,
  PlayerHandle,
  PlayerOptions,
  PlayerEventMap,
  RoutePoint,
  Plugin,
  CameraMode,
  CameraOptions,
} from "gm-route-replay-core";

type LocalRouteInput =
  | RoutePoint[]
  | { [trackId: string]: RoutePoint[] }
  | string;

// Options specific to the hook
// Explicitly include options from PlayerOptions that are needed,
// plus the hook-specific ones.
interface UseRouteReplayOptions {
  route: LocalRouteInput;
  fps?: 60 | 30;
  initialSpeed?: number;
  autoFit?: boolean;
  markerOptions?: google.maps.MarkerOptions;
  polylineOptions?: google.maps.PolylineOptions;
  interpolation?: "linear" | "spline";
  plugins?: Plugin[];

  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  cameraMode?: CameraMode;
  mapId?: string;
}

interface RouteReplayState {
  isPlaying: boolean;
  progress: number;
  speed: number;
  durationMs: number;
  cameraMode: CameraMode;
}

// Define the return type of the hook explicitly
interface UseRouteReplayResult {
  player: PlayerHandle | null;
  state: RouteReplayState;
  controls: {
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (ms: number) => void;
    setSpeed: (multiplier: number) => void;
    setCameraMode: (mode: CameraMode, options?: CameraOptions) => void;
  };
}

export function useRouteReplay(
  options: UseRouteReplayOptions
): UseRouteReplayResult {
  const { mapContainerRef, mapId } = options;
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const optionsRef = useRef(options);

  const [playerState, setPlayerState] = useState<RouteReplayState>({
    isPlaying: false,
    progress: 0,
    speed: options.initialSpeed ?? 1,
    durationMs: 0,
    cameraMode: options.cameraMode ?? "center",
  });
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // Update optionsRef whenever options change
  useEffect(() => {
    optionsRef.current = options;
    setPlayerState((prevState) => ({
      ...prevState,
      speed: options.initialSpeed ?? prevState.speed,
      cameraMode: options.cameraMode ?? prevState.cameraMode,
    }));
  }, [options]);

  // Initialize map instance effect
  useEffect(() => {
    if (
      mapContainerRef.current &&
      !mapInstanceRef.current &&
      typeof google !== "undefined" &&
      google.maps
    ) {
      console.log("Initializing Google Map instance with Map ID:", mapId);
      try {
        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 3,
          disableDefaultUI: true,
          mapId: mapId, // Pass the mapId here
        });
        mapInstanceRef.current = map;
        setIsMapInitialized(true);
        console.log("Google Map instance created.");
      } catch (error) {
        console.error("Error initializing Google Map:", error);
      }
    }

    // Cleanup logic remains similar, but only if map was initialized
    // return () => {
    //   if (mapInstanceRef.current) {
    //     console.log("Clearing map instance reference.");
    //     mapInstanceRef.current = null;
    //     setIsMapInitialized(false);
    //   }
    // };
  }, [mapContainerRef, mapId, google.maps]); // Add mapId to dependencies

  // Initialize and manage player instance effect
  useEffect(() => {
    let player: PlayerHandle | null = null;
    const currentOptions = optionsRef.current; // Use options from ref

    if (isMapInitialized && mapInstanceRef.current) {
      try {
        const { mapContainerRef: _ref, ...playerCoreOptions } = currentOptions;

        player = createPlayer({
          ...playerCoreOptions,
          map: mapInstanceRef.current,
        });
        playerRef.current = player;

        let calculatedDurationMs = 0;
        const routeInput = playerCoreOptions.route as LocalRouteInput;
        if (typeof routeInput === "string") {
          console.warn("Cannot determine duration from URL input yet.");
        } else if (Array.isArray(routeInput)) {
          // Single track
          if (routeInput.length >= 2) {
            const times = routeInput.map((p) => p.t);
            calculatedDurationMs = Math.max(
              0,
              Math.max(...times) - Math.min(...times)
            );
          }
        } else if (typeof routeInput === "object" && routeInput !== null) {
          let minTime = Infinity;
          let maxTime = -Infinity;
          let hasValidTrack = false;
          for (const trackId in routeInput) {
            if (Object.prototype.hasOwnProperty.call(routeInput, trackId)) {
              const track = routeInput[trackId];
              if (Array.isArray(track) && track.length >= 2) {
                const times = track.map((p) => p.t);
                minTime = Math.min(minTime, Math.min(...times));
                maxTime = Math.max(maxTime, Math.max(...times));
                hasValidTrack = true;
              }
            }
          }
          if (hasValidTrack) {
            calculatedDurationMs = Math.max(0, maxTime - minTime);
          }
        }
        setPlayerState((prevState) => ({
          ...prevState,
          durationMs: calculatedDurationMs,
        }));

        // --- Event Listeners (using calculatedDurationMs for seek) ---
        const handleFrame: PlayerEventMap["frame"] = (payload) => {
          setPlayerState((prevState) => ({
            ...prevState,
            progress: payload.progress,
          }));
        };
        const handlePlay: PlayerEventMap["start"] = () => {
          setPlayerState((prevState) => ({ ...prevState, isPlaying: true }));
        };
        const handlePause: PlayerEventMap["pause"] = () => {
          setPlayerState((prevState) => ({ ...prevState, isPlaying: false }));
        };
        const handleSeek: PlayerEventMap["seek"] = (payload) => {
          const duration = calculatedDurationMs; // Use duration from this effect's scope
          const newProgress =
            duration > 0
              ? Math.min(1, Math.max(0, payload.timeMs / duration))
              : 0;
          setPlayerState((prevState) => ({
            ...prevState,
            progress: newProgress,
          }));
        };
        const handleFinish: PlayerEventMap["finish"] = () => {
          setPlayerState((prevState) => ({
            ...prevState,
            isPlaying: false,
            progress: 1,
          }));
        };
        const handleError: PlayerEventMap["error"] = (payload) => {
          console.error("Hook: Route replay error event:", payload.error);
          setPlayerState((prevState) => ({ ...prevState, isPlaying: false }));
        };

        player.on("frame", handleFrame);
        player.on("start", handlePlay);
        player.on("pause", handlePause);
        player.on("seek", handleSeek);
        player.on("finish", handleFinish);
        player.on("error", handleError);

        // Initialize state based on created player (if needed, though options cover it now)
        setPlayerState((prevState) => ({
          ...prevState,
          cameraMode: optionsRef.current.cameraMode ?? "center",
        }));
      } catch (error) {
        console.error("Hook: Failed to create or setup player:", error);
      }
    }

    return () => {
      if (playerRef.current) {
        console.log("Hook: Destroying player instance due to cleanup...");
        playerRef.current.destroy();
        playerRef.current = null;
        console.log("Hook: Player instance destroyed.");
        // Reset state using options from ref for initial speed
        setPlayerState({
          isPlaying: false,
          progress: 0,
          speed: optionsRef.current.initialSpeed ?? 1,
          durationMs: 0,
          cameraMode: optionsRef.current.cameraMode ?? "center",
        });
        // Reset map init status? Maybe not necessary if container ref doesn't change
        // setIsMapInitialized(false);
      }
    };
    // Player initialization should depend on map being ready AND potentially options changing
    // If options (like route) change, we need to re-initialize the player.
  }, [isMapInitialized, options]); // Depend on map readiness and options object

  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setPlayerState((prevState) => ({
      ...prevState,
      isPlaying: false,
      progress: 0,
    }));
  }, []);

  const seek = useCallback((ms: number) => {
    playerRef.current?.seek(ms);
  }, []);

  const setSpeed = useCallback((multiplier: number) => {
    playerRef.current?.setSpeed(multiplier);
    setPlayerState((prevState) => ({ ...prevState, speed: multiplier }));
  }, []);

  const setCameraMode = useCallback(
    (mode: CameraMode, camOptions?: CameraOptions) => {
      playerRef.current?.setCameraMode(mode, camOptions);
      setPlayerState((prevState) => ({
        ...prevState,
        cameraMode: mode as CameraMode,
      }));
    },
    []
  );

  const controlsObject = {
    play,
    pause,
    stop,
    seek,
    setSpeed,
    setCameraMode,
  };
  console.log("[Hook] Returning controls object:", controlsObject);

  return {
    player: playerRef.current,
    state: playerState,
    controls: controlsObject,
  };
}
