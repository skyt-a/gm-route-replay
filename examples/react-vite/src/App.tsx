import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RouteReplay, // Import the component
  RouteReplayHandle, // Import the handle type
} from "gm-route-replay-react";
import type {
  RoutePoint,
  RouteInput,
  CameraMode,
  PlayerEventMap,
} from "gm-route-replay-core";
import "./App.css";
import { Loader } from "@googlemaps/js-api-loader";

// --- Sample Data & Config (Outside Component) ---
// Function to create a simple square route
const createSquareRoute = (
  startTime: number,
  latStart: number,
  lngStart: number,
  size: number,
  durationSec: number,
  headingOffset = 0
): RoutePoint[] => {
  const points: RoutePoint[] = [];
  const durationSegment = (durationSec * 1000) / 4;

  points.push({
    lat: latStart,
    lng: lngStart,
    t: startTime,
    heading: (0 + headingOffset) % 360,
  });
  points.push({
    lat: latStart,
    lng: lngStart + size,
    t: startTime + durationSegment,
    heading: (90 + headingOffset) % 360,
  });
  points.push({
    lat: latStart + size,
    lng: lngStart + size,
    t: startTime + durationSegment * 2,
    heading: (0 + headingOffset) % 360,
  });
  points.push({
    lat: latStart + size,
    lng: lngStart,
    t: startTime + durationSegment * 3,
    heading: (270 + headingOffset) % 360,
  });
  points.push({
    lat: latStart,
    lng: lngStart,
    t: startTime + durationSegment * 4,
    heading: (180 + headingOffset) % 360,
  });

  return points;
};

// --- Create Multi-Track Sample Data ---
const now = Date.now();
const multiTrackRouteData: RouteInput = {
  track1: createSquareRoute(now, 35.68, 139.76, 0.01, 20, 0), // Square near Tokyo Station
  track2: createSquareRoute(now + 5000, 35.685, 139.77, 0.005, 15, 45), // Smaller, faster square starting 5s later, offset heading
  track3: [
    // Simple line segment track
    { lat: 35.67, lng: 139.75, t: now + 2000, heading: 45 },
    { lat: 35.675, lng: 139.755, t: now + 12000, heading: 45 },
  ],
};
// --- End Multi-Track Sample Data ---

// Stable config objects
const markerOptionsConfig: google.maps.MarkerOptions = {
  // title: "Replay Vehicle", // Title might be less useful for multi-track
  // We might want different icons per track later
};
const polylineOptionsConfig: google.maps.PolylineOptions = {
  strokeColor: "#FF0000", // Default color, might want per-track colors later
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);

  // --- State for playback control and display ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1); // Initial speed matches default
  const [durationMs, setDurationMs] = useState(0); // Will be calculated by core
  const [currentCameraMode, setCurrentCameraMode] =
    useState<CameraMode>("center");
  const [isSeeking, setIsSeeking] = useState(false); // <-- Add isSeeking state

  // Effect to handle map loading and initialization (similar to before)
  useEffect(() => {
    if (!apiKey) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY in .env file");
      return;
    }
    // WebGL check only relevant for map init
    // if (/* Need to decide if WebGL is default */ !mapId) { ... }

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["maps", "geometry"],
    });
    loader
      .importLibrary("maps")
      .then((google) => {
        console.log("Google Maps API loaded (maps, geometry)");
        if (!mapInstance) {
          console.log("Initializing Google Map instance...");
          const map = new google.Map(document.getElementById("map")!, {
            center: { lat: 35.68, lng: 139.76 },
            zoom: 15,
            disableDefaultUI: true,
            mapId: mapId,
          });
          setMapInstance(map);
          console.log("Google Map instance created and set.");
        }
      })
      .catch((e: unknown) => {
        console.error("Error loading/initializing Google Maps:", e);
        setError("Failed to load/initialize Google Maps.");
      });
    // No cleanup needed for map instance here, component handles it
  }, [apiKey, mapId, mapInstance]);

  // --- Event Handlers for <RouteReplay> Component ---
  const handleFrame: PlayerEventMap["frame"] = useCallback(
    (payload) => {
      // Only update progress from frame event if user is not actively seeking
      if (!isSeeking) {
        setProgress(payload.progress);
      }
      // console.log("[App] Frame event:", payload);
    },
    [isSeeking]
  ); // <-- Add isSeeking to dependency array

  const handleStart = useCallback(() => {
    console.log("[App] Start event");
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  // Updated handleSeek using getDurationMs
  const handleSeek: PlayerEventMap["seek"] = useCallback(
    (payload) => {
      console.log("[App] Seek event:", payload);
      // Update duration state when seek event occurs (especially the initial one)
      const currentDuration = replayHandleRef.current?.getDurationMs() ?? 0;
      if (currentDuration !== durationMs) {
        setDurationMs(currentDuration);
      }

      // Only update progress from seek event if user is not actively seeking
      if (!isSeeking) {
        const newProgress =
          currentDuration > 0 ? payload.timeMs / currentDuration : 0;
        setProgress(Math.min(1, Math.max(0, newProgress)));
      }
    },
    [durationMs, isSeeking] // <-- Add isSeeking to dependency array
  );

  const handleFinish = useCallback(() => {
    console.log("[App] Finish event");
    setIsPlaying(false);
    setProgress(1);
  }, []);

  const handleError: PlayerEventMap["error"] = useCallback((payload) => {
    console.error("[App] Error event:", payload.error);
    setError(`Replay Error: ${payload.error.message}`);
    setIsPlaying(false);
  }, []);

  // --- Control Callbacks using the ref ---
  const handlePlay = useCallback(() => {
    replayHandleRef.current?.play();
    setIsPlaying(false);
  }, []);
  const handlePauseControl = useCallback(() => {
    replayHandleRef.current?.pause();
  }, []);
  const handleStop = useCallback(() => {
    replayHandleRef.current?.stop();
    // Stop in core resets time, update local state too
    setProgress(0);
    setIsPlaying(false);
  }, []);

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSpeed = parseFloat(event.target.value);
      if (!isNaN(newSpeed)) {
        replayHandleRef.current?.setSpeed(newSpeed);
        setSpeed(newSpeed); // Update local state for display
      }
    },
    []
  );

  const handleSetSpeed = useCallback((newSpeed: number) => {
    replayHandleRef.current?.setSpeed(newSpeed);
    setSpeed(newSpeed);
  }, []);

  const handleCameraModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const mode = event.target.value as CameraMode;
      replayHandleRef.current?.setCameraMode(mode);
      setCurrentCameraMode(mode); // Update local state for display
    },
    []
  );

  // --- NEW: Seek Bar Handlers ---
  const handleSeekInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setIsSeeking(true); // Set seeking flag
      const newProgress = parseFloat(event.target.value);
      setProgress(newProgress); // Update local progress state immediately for visual feedback
      // Note: We call the actual seek in handleSeekChange (on mouse up)
      // Or we could call it here if we want live seeking during drag:
      // if (durationMs > 0 && replayHandleRef.current) {
      //   replayHandleRef.current.seek(newProgress * durationMs);
      // }
    },
    [] // No dependencies needed for setting state
  );

  const handleSeekChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newProgress = parseFloat(event.target.value);
      if (durationMs > 0 && replayHandleRef.current) {
        console.log(`[App] User seek to progress: ${newProgress}`);
        replayHandleRef.current.seek(newProgress * durationMs);
      }
      setIsSeeking(false); // Unset seeking flag after user finishes
    },
    [durationMs] // Need durationMs to calculate seek time
  );
  // --- END NEW: Seek Bar Handlers ---

  // Effect to get duration from the overlay once available (if needed)
  // This assumes the overlay instance or its state provides duration. Example:
  // useEffect(() => {
  //     if (replayHandleRef.current) {
  // --- Callbacks must also be at the top level ---

  // --- Conditional rendering based on error (this is fine) ---
  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const progressPercent = (progress * 100).toFixed(1);

  const isReady = !!mapInstance && durationMs > 0; // Consider ready only when duration is known

  // --- JSX return ---
  return (
    <>
      <h1>gm-route-replay React Example (Component)</h1>
      <div
        id="map"
        style={{ height: "500px", width: "100%", marginBottom: "1rem" }}
      ></div>

      {/* Conditionally render RouteReplay only when map is ready */}
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={multiTrackRouteData}
          // Pass options as props
          autoFit={true}
          markerOptions={markerOptionsConfig}
          polylineOptions={polylineOptionsConfig}
          initialSpeed={1} // Use 1 for initial, state 'speed' is for control
          cameraMode={"center"} // Use 'center' for initial, state 'currentCameraMode' is for control
          // Pass event handlers
          onFrame={handleFrame}
          onStart={handleStart}
          onPause={handlePause}
          onSeek={handleSeek}
          onFinish={handleFinish}
          onError={handleError}
        />
      )}

      {/* UI Controls using local state and ref calls */}
      <div className="controls">
        <button onClick={handlePlay} disabled={isPlaying || !isReady}>
          Play
        </button>
        <button onClick={handlePauseControl} disabled={!isPlaying || !isReady}>
          Pause
        </button>
        <button onClick={handleStop} disabled={!isReady}>
          Stop
        </button>
      </div>

      <div className="controls speed-controls">
        <span>Speed: {speed.toFixed(1)}x</span>
        <input
          type="range"
          min="0.25"
          max="8"
          step="0.25"
          value={speed}
          onChange={handleSpeedChange}
          disabled={!isReady}
          style={{
            marginLeft: "10px",
            marginRight: "10px",
            verticalAlign: "middle",
          }}
        />
        <button onClick={() => handleSetSpeed(0.5)} disabled={!isReady}>
          0.5x
        </button>
        <button onClick={() => handleSetSpeed(1)} disabled={!isReady}>
          1x
        </button>
        <button onClick={() => handleSetSpeed(2)} disabled={!isReady}>
          2x
        </button>
        <button onClick={() => handleSetSpeed(4)} disabled={!isReady}>
          4x
        </button>
      </div>

      <div className="controls camera-controls">
        <span>Camera Mode:</span>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="center"
            checked={currentCameraMode === "center"}
            onChange={handleCameraModeChange}
            disabled={!isReady}
          />{" "}
          Center
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="ahead"
            checked={currentCameraMode === "ahead"}
            onChange={handleCameraModeChange}
            disabled={!isReady}
          />{" "}
          Ahead
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="none"
            checked={currentCameraMode === "none"}
            onChange={handleCameraModeChange}
            disabled={!isReady}
          />{" "}
          None
        </label>
      </div>

      {/* --- UPDATED: Progress Bar --- */}
      <div className="controls progress-controls">
        <span>Progress: {progressPercent}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001" // Smaller step for smoother seeking
          value={progress}
          onInput={handleSeekInput} // Handle dragging
          onChange={handleSeekChange} // Handle mouse up / change commit
          disabled={!isReady}
          style={{
            marginLeft: "10px",
            width: "400px",
            verticalAlign: "middle",
          }}
        />
        <span style={{ marginLeft: "10px" }}>
          (
          {durationMs > 0 ? ((progress * durationMs) / 1000).toFixed(1) : "0.0"}
          s / {durationMs > 0 ? (durationMs / 1000).toFixed(1) : "0.0"}s)
        </span>
      </div>
      {/* --- END UPDATED: Progress Bar --- */}

      <p>
        <em>
          Note: Ensure VITE_GOOGLE_MAPS_API_KEY{" "}
          {mapId && "and VITE_GOOGLE_MAPS_MAP_ID "}in .env
        </em>
      </p>
    </>
  );
}

export default App;
