/// <reference types="@types/google.maps" />

import { useState, useEffect, useRef, useCallback } from "react";
// Assuming core is built and linked or using path aliases
// Adjust the import path based on your monorepo setup (e.g., using tsconfig paths or relative paths after build)
import {
  createPlayer,
  PlayerHandle,
  PlayerOptions,
  PlayerEventMap,
  RoutePoint,
  Plugin,
} from "@gm/route-replay-core";

// Re-define RouteInput locally to avoid export issues
type LocalRouteInput =
  | RoutePoint[]
  | { [trackId: string]: RoutePoint[] }
  | string;

// Options specific to the hook
// Explicitly include options from PlayerOptions that are needed,
// plus the hook-specific ones.
interface UseRouteReplayOptions {
  // Core options (excluding map)
  route: LocalRouteInput;
  fps?: 60 | 30;
  initialSpeed?: number; // Explicitly include from PlayerOptions
  autoFit?: boolean;
  markerOptions?: google.maps.MarkerOptions;
  polylineOptions?: google.maps.PolylineOptions;
  interpolation?: "linear" | "spline";
  plugins?: Plugin[]; // Make sure Plugin type is imported or defined if used

  // Hook-specific options
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  isMapApiLoaded?: boolean;
}

interface RouteReplayState {
  isPlaying: boolean;
  progress: number;
  speed: number;
  durationMs: number;
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
  };
}

export function useRouteReplay(
  options: UseRouteReplayOptions
): UseRouteReplayResult {
  const { mapContainerRef, isMapApiLoaded, ...coreOptions } = options;
  // coreOptions should now correctly infer the type based on the explicit interface
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  // Store the potentially changing options in a ref
  const optionsRef = useRef(options);

  const [playerState, setPlayerState] = useState<RouteReplayState>({
    isPlaying: false,
    progress: 0,
    speed: options.initialSpeed ?? 1, // Use initialSpeed from options
    durationMs: 0,
  });
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // Update optionsRef whenever options change
  useEffect(() => {
    optionsRef.current = options;
    // Update speed in state if initialSpeed option changes
    setPlayerState((prevState) => ({
      ...prevState,
      speed: options.initialSpeed ?? prevState.speed,
    }));
  }, [options]); // Dependency is now the whole options object

  // Initialize map instance effect
  useEffect(() => {
    // This effect now depends on isMapApiLoaded
    if (
      isMapApiLoaded && // Check if API is loaded via prop
      mapContainerRef.current &&
      !mapInstanceRef.current &&
      typeof google !== "undefined" &&
      google.maps
    ) {
      console.log(
        "API loaded and Ref available. Initializing Google Map instance on ref:",
        mapContainerRef.current
      );
      try {
        // Basic map initialization, user should customize this
        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 0, lng: 0 }, // Default center, should be overridden by autoFit
          zoom: 3,
          disableDefaultUI: true, // Good default for programmatic control
        });
        mapInstanceRef.current = map;
        setIsMapInitialized(true);
        console.log("Google Map instance created.");
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        // Handle map initialization error
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
  }, [isMapApiLoaded, mapContainerRef]); // Add isMapApiLoaded to dependency array

  // Initialize and manage player instance effect
  useEffect(() => {
    let player: PlayerHandle | null = null;
    const currentOptions = optionsRef.current; // Use options from ref

    if (isMapInitialized && mapInstanceRef.current) {
      console.log("Map initialized, attempting to create player...");
      try {
        const {
          mapContainerRef: _ref,
          isMapApiLoaded: _loaded,
          ...playerCoreOptions
        } = currentOptions;

        // @ts-ignore Temporarily ignore type mismatch due to potential build/cache issues
        player = createPlayer({
          ...playerCoreOptions,
          map: mapInstanceRef.current,
        });
        playerRef.current = player;
        console.log("Player instance created:", player);

        // --- Calculate Global Duration from input route ---
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
          // Explicit check for object and non-null
          // Multi-track object
          let minTime = Infinity;
          let maxTime = -Infinity;
          let hasValidTrack = false;
          // Now typescript should know routeInput is { [trackId: string]: RoutePoint[] }
          for (const trackId in routeInput) {
            // Ensure hasOwnProperty check for safety
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
        } // Removed unnecessary 'else' block
        console.log(
          `[Hook] Global duration calculated: ${calculatedDurationMs}ms`
        );
        setPlayerState((prevState) => ({
          ...prevState,
          durationMs: calculatedDurationMs,
        }));
        // --- End Duration Calculation ---

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
      } catch (error) {
        console.error("Hook: Failed to create or setup player:", error);
      }
    }

    // Cleanup function
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
        });
        // Reset map init status? Maybe not necessary if container ref doesn't change
        // setIsMapInitialized(false);
      }
    };
    // Player initialization should depend on map being ready AND potentially options changing
    // If options (like route) change, we need to re-initialize the player.
  }, [isMapInitialized, options]); // Depend on map readiness and options object

  // --- Control Functions --- (Memoized, dependencies might need playerRef)
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

  return {
    player: playerRef.current,
    state: playerState,
    controls: {
      play,
      pause,
      stop,
      seek,
      setSpeed,
    },
  };
}
