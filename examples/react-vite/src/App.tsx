import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouteReplay } from "@gm/route-replay-react"; // Assuming workspace link works
import type { RoutePoint } from "@gm/route-replay-core";
import "./App.css";

// --- Sample Data ---
// Simple square route for testing
const createSampleRoute = (startTime = Date.now()): RoutePoint[] => {
  const points: RoutePoint[] = [];
  const durationSegment = 5000; // 5 seconds per segment
  const latStart = 35.68;
  const lngStart = 139.76;
  const delta = 0.01; // Size of the square

  // Start point
  points.push({ lat: latStart, lng: lngStart, t: startTime, heading: 0 });
  // Move East
  points.push({
    lat: latStart,
    lng: lngStart + delta,
    t: startTime + durationSegment,
    heading: 90,
  });
  // Move North
  points.push({
    lat: latStart + delta,
    lng: lngStart + delta,
    t: startTime + durationSegment * 2,
    heading: 0,
  });
  // Move West
  points.push({
    lat: latStart + delta,
    lng: lngStart,
    t: startTime + durationSegment * 3,
    heading: 270,
  });
  // Move South (back to start)
  points.push({
    lat: latStart,
    lng: lngStart,
    t: startTime + durationSegment * 4,
    heading: 180,
  });

  return points;
};
const sampleRoute = createSampleRoute();
// --- End Sample Data ---

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null); // Renamed ref
  const [error, setError] = useState<string | null>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false); // State to track API load

  // useRouteReplay Hook
  const { state, controls } = useRouteReplay({
    mapContainerRef:
      mapContainerRef as unknown as React.RefObject<HTMLDivElement>, // Pass the ref directly
    isMapApiLoaded: isMapApiLoaded, // Pass the API loaded state
    route: sampleRoute,
    autoFit: true,
    markerOptions: {
      title: "Replay Vehicle",
    },
    // Add default polyline options to enable drawing the route line
    polylineOptions: {
      strokeColor: "#FF0000", // Red color
      strokeOpacity: 0.8,
      strokeWeight: 4,
    },
  });

  // Effect to handle map loading
  useEffect(() => {
    if (!apiKey) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY in .env file");
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["maps"],
    });

    loader
      .load()
      .then(() => {
        console.log("Google Maps API loaded");
        setIsMapApiLoaded(true); // Mark API as loaded
      })
      .catch((e: unknown) => {
        console.error("Error loading Google Maps API:", e);
        setError("Failed to load Google Maps API. Check API key and network.");
      });
  }, [apiKey]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // Simple progress bar
  const progressPercent = (state.progress * 100).toFixed(1);

  return (
    <>
      <h1>gm-route-replay React Example</h1>
      <div
        ref={mapContainerRef} // Use the renamed ref here
        id="map"
        style={{ height: "500px", width: "100%", marginBottom: "1rem" }}
      >
        {/* Display loading message until the API is loaded */}
        {!isMapApiLoaded && <div>Loading Google Maps API...</div>}
        {/* The hook will render the map inside this div once the API is loaded */}
      </div>

      <div className="controls">
        {/* Controls need to be enabled only after the map is ready internally by the hook */}
        {/* We can use state.isReady which might be provided by the hook, or infer based on API load */}
        <button
          onClick={controls.play}
          disabled={state.isPlaying || !isMapApiLoaded}
        >
          Play
        </button>
        <button
          onClick={controls.pause}
          disabled={!state.isPlaying || !isMapApiLoaded}
        >
          Pause
        </button>
        <button onClick={controls.stop} disabled={!isMapApiLoaded}>
          Stop
        </button>
        {/* Seek functionality can be added here later */}
      </div>

      <div className="state">
        <p>Status: {state.isPlaying ? "Playing" : "Paused/Stopped"}</p>
        <p>Progress: {progressPercent}%</p>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        {/* <p>Current Time: {state.currentTimeMs} ms</p> */}
        {/* <p>Speed: {state.speed}x</p> */}
      </div>

      <p>
        <em>
          Note: Ensure you have a valid <code>VITE_GOOGLE_MAPS_API_KEY</code> in
          an <code>.env</code> file in the <code>examples/react-vite</code>{" "}
          directory.
        </em>
      </p>
    </>
  );
}

export default App;
