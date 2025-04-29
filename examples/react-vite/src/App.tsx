import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouteReplay } from "gm-route-replay-react"; // スコープを削除
import type { RoutePoint, RouteInput, CameraMode } from "gm-route-replay-core"; // スコープを削除
import "./App.css";

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
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID; // Read Map ID from env
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);

  // Memoize options *before* useEffect that uses them
  const routeReplayOptions = useMemo(
    () => ({
      mapContainerRef: mapContainerRef as React.RefObject<HTMLDivElement>,
      isMapApiLoaded: isMapApiLoaded,
      route: multiTrackRouteData,
      autoFit: true,
      markerOptions: markerOptionsConfig,
      polylineOptions: polylineOptionsConfig,
      initialSpeed: 1,
      cameraMode: "center" as CameraMode,
      cameraOptions: { zoomLevel: 16 },
      rendererType: "webgl",
      mapId: mapId,
    }),
    [isMapApiLoaded, mapId]
  );

  // Effect to handle map loading
  useEffect(() => {
    if (!apiKey) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY in .env file");
      return;
    }
    if (routeReplayOptions.rendererType === "webgl" && !mapId) {
      setError(
        "WebGLOverlayRenderer requires a VITE_GOOGLE_MAPS_MAP_ID in .env file."
      );
      return;
    }
    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["maps", "geometry"], // ADDED geometry library
    });
    loader
      .load()
      .then(() => {
        console.log("Google Maps API loaded (maps, geometry)");
        setIsMapApiLoaded(true);
      })
      .catch((e: unknown) => {
        console.error("Error loading Google Maps API:", e);
        setError("Failed to load Google Maps API. Check API key and network.");
      });
  }, [apiKey, mapId, routeReplayOptions.rendererType]); // Depend on specific option field

  const { state, controls } = useRouteReplay(routeReplayOptions);

  // --- Callbacks must also be at the top level ---
  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSpeed = parseFloat(event.target.value);
      console.log(`[App] handleSpeedChange: New speed value = ${newSpeed}`); // DEBUG LOG
      if (!isNaN(newSpeed)) {
        console.log("[App] Calling controls.setSpeed..."); // DEBUG LOG
        controls.setSpeed(newSpeed);
      }
    },
    [controls]
  );

  const handleSetSpeed = useCallback(
    (speed: number) => {
      console.log(`[App] handleSetSpeed: Setting speed to ${speed}x`); // DEBUG LOG
      console.log("[App] Calling controls.setSpeed..."); // DEBUG LOG
      controls.setSpeed(speed);
    },
    [controls]
  );

  // Callback for camera mode change
  const handleCameraModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const mode = event.target.value as CameraMode;
      // TODO: Pass options if needed for 'ahead' mode customization
      (controls as any).setCameraMode(mode);
    },
    [controls]
  );

  // Log state changes for debugging
  useEffect(() => {
    console.log("[App] State updated:", state); // DEBUG LOG
  }, [state]);

  // --- Conditional rendering based on error (this is fine) ---
  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const progressPercent = (state.progress * 100).toFixed(1);

  // --- JSX return ---
  return (
    <>
      <h1>gm-route-replay React Example (Multi-Track)</h1>
      <div
        ref={mapContainerRef}
        id="map"
        style={{ height: "500px", width: "100%", marginBottom: "1rem" }}
      >
        {!isMapApiLoaded && <div>Loading Google Maps API...</div>}
      </div>

      <div className="controls">
        {/* ... Play/Pause/Stop buttons ... */}
        <button
          onClick={controls.play}
          disabled={state.isPlaying || !isMapApiLoaded}
        >
          {" "}
          Play{" "}
        </button>
        <button
          onClick={controls.pause}
          disabled={!state.isPlaying || !isMapApiLoaded}
        >
          {" "}
          Pause{" "}
        </button>
        <button onClick={controls.stop} disabled={!isMapApiLoaded}>
          {" "}
          Stop{" "}
        </button>
      </div>

      {/* Speed Controls Section */}
      <div className="controls speed-controls">
        <span>Speed: {state.speed.toFixed(1)}x</span>
        <input
          type="range"
          min="0.25"
          max="8"
          step="0.25"
          value={state.speed}
          onChange={handleSpeedChange}
          disabled={!isMapApiLoaded}
          style={{
            marginLeft: "10px",
            marginRight: "10px",
            verticalAlign: "middle",
          }}
        />
        <button onClick={() => handleSetSpeed(0.5)} disabled={!isMapApiLoaded}>
          0.5x
        </button>
        <button onClick={() => handleSetSpeed(1)} disabled={!isMapApiLoaded}>
          1x
        </button>
        <button onClick={() => handleSetSpeed(2)} disabled={!isMapApiLoaded}>
          2x
        </button>
        <button onClick={() => handleSetSpeed(4)} disabled={!isMapApiLoaded}>
          4x
        </button>
      </div>

      {/* Camera Mode Controls */}
      <div className="controls camera-controls">
        <span>Camera Mode:</span>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="center"
            checked={state.cameraMode === "center"}
            onChange={handleCameraModeChange}
            disabled={!isMapApiLoaded}
          />{" "}
          Center
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="ahead"
            checked={state.cameraMode === "ahead"}
            onChange={handleCameraModeChange}
            disabled={!isMapApiLoaded}
          />{" "}
          Ahead
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="cameraMode"
            value="none"
            checked={state.cameraMode === "none"}
            onChange={handleCameraModeChange}
            disabled={!isMapApiLoaded}
          />{" "}
          None
        </label>
      </div>

      <div className="state">
        {/* ... Status, Progress bar ... */}
        <p>Status: {state.isPlaying ? "Playing" : "Paused/Stopped"}</p>
        <p>Progress: {progressPercent}%</p>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Example of how you *might* display per-track info if state exposed it */}
      {/* <div className="per-track-state">
          {Object.keys(state.tracks || {}).map(trackId => (
              <div key={trackId}>
                  Track {trackId}: Progress {((state.tracks[trackId].progress || 0) * 100).toFixed(1)}%
              </div>
          ))}
      </div> */}

      <p>
        <em>
          Note: Ensure you have a valid <code>VITE_GOOGLE_MAPS_API_KEY</code>
          {routeReplayOptions.rendererType === "webgl" &&
            ", and a valid <code>VITE_GOOGLE_MAPS_MAP_ID</code>"}
          in an <code>.env</code> file in the <code>examples/react-vite</code>{" "}
          directory.
        </em>
      </p>
    </>
  );
}

export default App;
