# React Component Example

This page shows a basic usage example using the `<RouteReplay>` component.

Make sure you have a `.env` file in the `examples/react-vite` directory with your `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID` (if using WebGL rendering).

```tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { RouteReplay, RouteReplayHandle } from "gm-route-replay-react";
import type { RoutePoint, RouteInput, CameraMode, PlayerEventMap } from "gm-route-replay-core";
import "./App.css";

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

const now = Date.now();
const multiTrackRouteData: RouteInput = {
  track1: createSquareRoute(now, 35.68, 139.76, 0.01, 20, 0), 
  track2: createSquareRoute(now + 5000, 35.685, 139.77, 0.005, 15, 45), square starting 5s later, offset heading
  track3: [
    { lat: 35.67, lng: 139.75, t: now + 2000, heading: 45 },
    { lat: 35.675, lng: 139.755, t: now + 12000, heading: 45 },
  ],
};

const markerOptionsConfig: google.maps.MarkerOptions = {};
const polylineOptionsConfig: google.maps.PolylineOptions = {
  strokeColor: "#FF0000", 
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID; // Read Map ID from env
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);

  // State for playback control and display
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [durationMs, setDurationMs] = useState(0);
  const [currentCameraMode, setCurrentCameraMode] = useState<CameraMode>("center");
  const [isSeeking, setIsSeeking] = useState(false);

  // Effect to handle map loading
  useEffect(() => {
    if (!apiKey) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY in .env file");
      return;
    }
    // Consider adding WebGL check if needed based on options
    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["maps", "geometry"], // ADDED geometry library
    });
    loader
      .importLibrary("maps")
      .then((google) => {
        console.log("Google Maps API loaded (maps, geometry)");
        if (!mapInstance) {
          const map = new google.Map(document.getElementById("map")!, {
            center: { lat: 35.68, lng: 139.76 },
            zoom: 15,
            disableDefaultUI: true, // Example: customize UI
            mapId: mapId,
          });
          setMapInstance(map);
        }
      })
      .catch((e: unknown) => {
        console.error("Error loading/initializing Google Maps:", e);
        setError("Failed to load/initialize Google Maps.");
      });
  }, [apiKey, mapId, mapInstance]);

  // --- Event Handlers for <RouteReplay> Component ---
  const handleFrame: PlayerEventMap["frame"] = useCallback(
    (payload) => {
      if (!isSeeking) {
        setProgress(payload.progress);
      }
    },
    [isSeeking]
  );

  const handleStart = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleSeek: PlayerEventMap["seek"] = useCallback(
    (payload) => {
      const currentDuration = replayHandleRef.current?.getDurationMs() ?? 0;
      if (currentDuration !== durationMs) {
        setDurationMs(currentDuration);
      }
      if (!isSeeking) {
        const newProgress = currentDuration > 0 ? payload.timeMs / currentDuration : 0;
        setProgress(Math.min(1, Math.max(0, newProgress)));
      }
    },
    [durationMs, isSeeking]
  );

  const handleFinish = useCallback(() => {
    setIsPlaying(false);
    setProgress(1);
  }, []);

  const handleError: PlayerEventMap["error"] = useCallback((payload) => {
    console.error("Error event:", payload.error);
    setError(`Replay Error: ${payload.error.message}`);
    setIsPlaying(false);
  }, []);

  // --- Control Callbacks using the ref ---
  const handlePlay = useCallback(() => replayHandleRef.current?.play(), []);
  const handlePauseControl = useCallback(() => replayHandleRef.current?.pause(), []);
  const handleStop = useCallback(() => {
    replayHandleRef.current?.stop();
    setProgress(0);
    setIsPlaying(false);
  }, []);

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSpeed = parseFloat(event.target.value);
      if (!isNaN(newSpeed)) {
        replayHandleRef.current?.setSpeed(newSpeed);
        setSpeed(newSpeed);
      }
    },
    []
  );

  const handleSetSpeed = useCallback(
    (speed: number) => {
      replayHandleRef.current?.setSpeed(speed);
      setSpeed(speed);
    },
    []
  );

  // Callback for camera mode change
  const handleCameraModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const mode = event.target.value as CameraMode;
      replayHandleRef.current?.setCameraMode(mode);
      setCurrentCameraMode(mode);
    },
    []
  );

  // --- Seek Bar Handlers ---
  const handleSeekInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setIsSeeking(true);
      const newProgress = parseFloat(event.target.value);
      setProgress(newProgress);
    },
    []
  );

  const handleSeekChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newProgress = parseFloat(event.target.value);
      if (durationMs > 0 && replayHandleRef.current) {
        replayHandleRef.current.seek(newProgress * durationMs);
      }
      setIsSeeking(false);
    },
    [durationMs]
  );

  // --- Conditional rendering based on error (this is fine) ---
  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const isReady = !!mapInstance && durationMs > 0;

  // --- JSX return ---
  return (
    <>
      <h1>gm-route-replay React Example (Multi-Track)</h1>
      {/* Map container */}
      <div
        id="map"
        style={{ height: "500px", width: "100%" }}
      ></div>

      {/* RouteReplay Component */}
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={multiTrackRouteData}
          autoFit={true}
          markerOptions={markerOptionsConfig}
          polylineOptions={polylineOptionsConfig}
          initialSpeed={1}
          cameraMode={"center"}
          // Event Handlers
          onFrame={handleFrame}
          onStart={handleStart}
          onPause={handlePause}
          onSeek={handleSeek}
          onFinish={handleFinish}
          onError={handleError}
        />
      )}

      {/* Controls (Simplified - adapt as needed) */}
      <div className="controls">
        <button onClick={handlePlay} disabled={isPlaying || !isReady}>Play</button>
        <button onClick={handlePauseControl} disabled={!isPlaying || !isReady}>Pause</button>
        <button onClick={handleStop} disabled={!isReady}>Stop</button>
        {/* Add more controls like speed, seek bar, camera mode here */}
      </div>
    </>
  );
}

export default App;

```

