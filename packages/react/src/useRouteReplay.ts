/// <reference types="@types/google.maps" />

import { useState, useEffect, useRef, useCallback } from "react";
// Assuming core is built and linked or using path aliases
// Adjust the import path based on your monorepo setup (e.g., using tsconfig paths or relative paths after build)
import {
  createPlayer,
  PlayerHandle,
  PlayerOptions,
  PlayerEventMap,
} from "@gm/route-replay-core";

// Options specific to the hook, excluding the 'map' instance which is handled by ref
// We also exclude internal properties potentially added by the core implementation
type UseRouteReplayOptions = Omit<PlayerOptions, "map"> & {
  mapContainerRef: React.RefObject<HTMLDivElement>; // Explicitly require map container ref
  isMapApiLoaded?: boolean; // Add flag for API load status
};

interface RouteReplayState {
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0 - represents playback progress
  // Consider adding more state derived from events:
  // currentTimeMs?: number; // Absolute time from the data
  // durationMs?: number;    // Total duration of the route data
  speed: number; // Current playback speed multiplier
}

export function useRouteReplay(options: UseRouteReplayOptions) {
  // Destructure mapContainerRef and isMapApiLoaded from options directly
  const { mapContainerRef, isMapApiLoaded, ...coreOptions } = options;
  const mapInstanceRef = useRef<google.maps.Map | null>(null); // Ref for the Google Map instance
  const playerRef = useRef<PlayerHandle | null>(null);
  const coreOptionsRef = useRef(coreOptions); // Ref core options

  const [playerState, setPlayerState] = useState<RouteReplayState>({
    isPlaying: false,
    progress: 0,
    speed: 1, // TODO: Get initial speed from options if added later
  });
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // Update coreOptionsRef whenever coreOptions change
  useEffect(() => {
    coreOptionsRef.current = coreOptions;
  }, [coreOptions]); // Dependencies might need refinement based on coreOptions structure

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

    if (isMapInitialized && mapInstanceRef.current) {
      console.log("Map initialized, attempting to create player...");
      try {
        player = createPlayer({
          ...coreOptionsRef.current, // Use the ref for core options
          map: mapInstanceRef.current,
        });
        playerRef.current = player;
        console.log("Player instance created:", player);

        // --- Event Listeners ---
        const handleFrame: PlayerEventMap["frame"] = (
          payload: Parameters<PlayerEventMap["frame"]>[0]
        ) => {
          // Update progress state based on payload
          // Assuming payload has a 'progress' property (0.0 to 1.0)
          setPlayerState((prevState) => ({
            ...prevState,
            // Use nullish coalescing in case payload.progress is undefined
            progress:
              typeof payload?.progress === "number"
                ? payload.progress
                : prevState.progress,
          }));
          // console.log('Frame event:', payload);
        };
        const handlePlay = () => {
          console.log("Player started event");
          setPlayerState((prevState: RouteReplayState) => ({
            ...prevState,
            isPlaying: true,
          }));
        };
        const handlePause = () => {
          console.log("Player paused event");
          setPlayerState((prevState: RouteReplayState) => ({
            ...prevState,
            isPlaying: false,
          }));
        };
        const handleSeek: PlayerEventMap["seek"] = (
          payload: Parameters<PlayerEventMap["seek"]>[0]
        ) => {
          console.log("Player seek event:", payload);
          // TODO: Update progress based on seek time and total duration
          // setPlayerState(prevState => ({ ...prevState, progress: calculateProgress(payload.timeMs) }));
        };
        const handleFinish = () => {
          console.log("Player finished event");
          setPlayerState((prevState: RouteReplayState) => ({
            ...prevState,
            isPlaying: false,
          }));
        };
        const handleError: PlayerEventMap["error"] = (
          payload: Parameters<PlayerEventMap["error"]>[0]
        ) => {
          // Check if payload is an object and has an error property which is an Error instance
          if (
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            payload.error instanceof Error
          ) {
            console.error("Route replay error event:", payload.error);
          } else {
            console.error("Route replay unknown error event:", payload);
          }
          setPlayerState((prevState: RouteReplayState) => ({
            ...prevState,
            isPlaying: false,
          }));
        };

        // Subscribe to events
        player.on("frame", handleFrame);
        player.on("start", handlePlay);
        player.on("pause", handlePause);
        player.on("seek", handleSeek);
        player.on("finish", handleFinish);
        player.on("error", handleError);
        console.log("Player event listeners attached.");
      } catch (error) {
        console.error("Failed to create or setup player:", error);
      }
    }

    // Cleanup function
    return () => {
      if (player) {
        console.log("Destroying player instance due to cleanup...");
        player.destroy();
        playerRef.current = null;
        console.log("Player instance destroyed.");
        setPlayerState({ isPlaying: false, progress: 0, speed: 1 });
      }
    };
  }, [isMapInitialized]);

  // --- Control Functions --- (Memoized)
  const play = useCallback(() => {
    console.log("Calling player.play()...");
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    console.log("Calling player.pause()...");
    playerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    console.log("Calling player.stop()...");
    playerRef.current?.stop();
    // Manually update state on stop, as there's no event for it
    setPlayerState({ isPlaying: false, progress: 0, speed: 1 });
  }, []);

  const seek = useCallback((ms: number) => {
    console.log(`Calling player.seek(${ms})...`);
    playerRef.current?.seek(ms);
  }, []);

  // TODO: Add setSpeed, setDirection controls (v0.2)

  return {
    player: playerRef.current, // Expose the raw player handle (mostly for debugging or advanced use)
    state: playerState, // Read-only reactive state
    controls: {
      // Memoized control functions
      play,
      pause,
      stop,
      seek,
    },
  };
}
