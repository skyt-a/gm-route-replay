import "./style.css";
import { Loader } from "@googlemaps/js-api-loader";
import {
  GmRouteReplayOverlay,
  RouteInput,
  CameraMode,
} from "gm-route-replay-core";
import type { RoutePoint } from "gm-route-replay-core";

// --- DOM Element References ---
const mapDiv = document.getElementById("map") as HTMLDivElement;
const playBtn = document.getElementById("playBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const speedRange = document.getElementById("speedRange") as HTMLInputElement;
const speedValueSpan = document.getElementById("speedValue") as HTMLSpanElement;
const speedBtns = document.querySelectorAll<HTMLButtonElement>(".speedBtn");
const cameraModeRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="cameraMode"]'
);
const progressSlider = document.getElementById(
  "progressSlider"
) as HTMLInputElement;
const progressPercentSpan = document.getElementById(
  "progressPercent"
) as HTMLSpanElement;
const timeDisplaySpan = document.getElementById(
  "timeDisplay"
) as HTMLSpanElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;

// --- State ---
let map: google.maps.Map | null = null;
let routeReplayOverlay: GmRouteReplayOverlay | null = null;
let isPlaying = false;
let currentSpeed = 1;
let currentProgress = 0;
let durationMs = 0;
let currentCamera: CameraMode = "center";
let isSeeking = false; // Flag to prevent feedback loop with progress slider

// --- Configuration & Data ---
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID; // Optional

// Sample route data (Tokyo Station to Kanda Station - Handcrafted)
const now = Date.now();
const tokyoToKandaRoute: RoutePoint[] = [
  { lat: 35.681, lng: 139.767, t: now, heading: 0 }, // Start Tokyo Sta. area
  { lat: 35.684, lng: 139.767, t: now + 45 * 1000, heading: 0 }, // Move North
  { lat: 35.684, lng: 139.766, t: now + 60 * 1000, heading: 270 }, // Turn West
  { lat: 35.688, lng: 139.766, t: now + 120 * 1000, heading: 0 }, // Move North again
  { lat: 35.69, lng: 139.768, t: now + 160 * 1000, heading: 45 }, // Towards Kanda slightly East
  { lat: 35.691, lng: 139.771, t: now + 180 * 1000, heading: 90 }, // End Kanda Sta. area
];

const routeData: RouteInput = {
  mainTrack: tokyoToKandaRoute,
};

// --- Initialization ---
async function initialize() {
  if (!apiKey) {
    showError("Missing VITE_GOOGLE_MAPS_API_KEY in .env");
    return;
  }
  statusDiv.textContent = "Loading Google Maps API...";

  try {
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "geometry"],
    });
    await loader.importLibrary("maps");
    statusDiv.textContent = "Initializing Map...";

    map = new google.maps.Map(mapDiv, {
      center: { lat: 35.685, lng: 139.768 }, // Centered between Tokyo and Kanda
      zoom: 16, // Zoom in a bit more
      disableDefaultUI: true,
      mapId: mapId, // Optional: enables vector map / WebGL features
    });

    statusDiv.textContent = "Initializing Route Replay...";

    // Dynamically import the overlay *after* google is defined
    const { GmRouteReplayOverlay } = await import("gm-route-replay-core");

    routeReplayOverlay = new GmRouteReplayOverlay({
      map: map,
      route: routeData,
      autoFit: true,
      initialSpeed: currentSpeed,
      cameraMode: currentCamera,
      rendererType: "marker",
      // markerOptions: {}, // Add if needed
      polylineOptions: { strokeColor: "#0000FF" }, // Example polyline
    });

    // Set the map on the overlay AFTER instantiation
    routeReplayOverlay.setMap(map);

    setupEventListeners();
    setupControls();
    updateUI(); // Update UI based on initial state (paused, progress 0)

    statusDiv.textContent = "Ready.";
  } catch (err) {
    showError(`Initialization failed: ${err}`);
    statusDiv.textContent = "Initialization Error.";
  }
}

// --- Event Listeners for Overlay ---
function setupEventListeners() {
  if (!routeReplayOverlay) return;

  google.maps.event.addListener(routeReplayOverlay, "start", () => {
    console.log("Event: start");
    isPlaying = true;
    updateUI();
  });

  google.maps.event.addListener(routeReplayOverlay, "pause", () => {
    console.log("Event: pause");
    isPlaying = false;
    updateUI();
  });

  google.maps.event.addListener(routeReplayOverlay, "finish", () => {
    console.log("Event: finish");
    isPlaying = false;
    currentProgress = 1; // Ensure progress is 1 on finish
    updateUI();
  });

  google.maps.event.addListener(
    routeReplayOverlay,
    "seek",
    (payload: { timeMs: number }) => {
      // Update duration if it wasn't set or changed
      const newDuration = routeReplayOverlay?.getDurationMs() ?? 0;
      if (newDuration !== durationMs) {
        durationMs = newDuration;
      }
      currentProgress =
        durationMs > 0
          ? Math.min(1, Math.max(0, payload.timeMs / durationMs))
          : 0;
      if (!isSeeking) {
        // Avoid feedback loop from slider input
        updateUI();
      }
    }
  );

  google.maps.event.addListener(
    routeReplayOverlay,
    "frame",
    (payload: { progress: number /* other fields? */ }) => {
      // Update progress based on frame event only if not seeking via slider
      if (!isSeeking) {
        currentProgress = payload.progress;
        updateUI();
      }
    }
  );

  google.maps.event.addListener(
    routeReplayOverlay,
    "error",
    (payload: { error: Error }) => {
      console.error("Event: error", payload);
      showError(`Playback Error: ${payload.error.message}`);
      isPlaying = false;
      updateUI();
    }
  );
}

// --- Control Event Listeners ---
function setupControls() {
  playBtn.addEventListener("click", () => routeReplayOverlay?.play());
  pauseBtn.addEventListener("click", () => routeReplayOverlay?.pause());
  stopBtn.addEventListener("click", () => {
    routeReplayOverlay?.stop();
    // Stop resets time and progress
    currentProgress = 0;
    isPlaying = false;
    updateUI();
  });

  speedRange.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    currentSpeed = parseFloat(target.value);
    routeReplayOverlay?.setSpeed(currentSpeed);
    updateUI();
  });

  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const speed = parseFloat(btn.dataset.speed || "1");
      currentSpeed = speed;
      speedRange.value = String(speed);
      routeReplayOverlay?.setSpeed(currentSpeed);
      updateUI();
    });
  });

  cameraModeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        currentCamera = target.value as CameraMode;
        routeReplayOverlay?.setCameraMode(currentCamera);
        updateUI(); // Update checked state visually if needed
      }
    });
  });

  progressSlider.addEventListener("input", (e) => {
    isSeeking = true; // Set flag to indicate user is dragging slider
    const target = e.target as HTMLInputElement;
    const progress = parseFloat(target.value);
    if (durationMs > 0) {
      const seekTime = progress * durationMs;
      currentProgress = progress; // Update local progress immediately for smoother slider feel
      routeReplayOverlay?.seek(seekTime);
      updateUI(); // Update text displays
    }
  });
  progressSlider.addEventListener("change", () => {
    // Reset seeking flag when user finishes dragging
    isSeeking = false;
  });
}

// --- UI Update Function ---
function updateUI() {
  // Enable/disable buttons based on state
  playBtn.disabled = isPlaying || !routeReplayOverlay;
  pauseBtn.disabled = !isPlaying || !routeReplayOverlay;
  stopBtn.disabled = !routeReplayOverlay;

  // Update speed display
  speedValueSpan.textContent = `${currentSpeed.toFixed(2)}x`;
  speedRange.value = String(currentSpeed);
  speedRange.disabled = !routeReplayOverlay;
  speedBtns.forEach((btn) => (btn.disabled = !routeReplayOverlay));

  // Update camera mode radio buttons
  cameraModeRadios.forEach((radio) => {
    radio.disabled = !routeReplayOverlay;
    radio.checked = radio.value === currentCamera;
  });

  // Update progress slider and text
  progressSlider.disabled = !routeReplayOverlay || durationMs <= 0;
  if (!isSeeking) {
    // Only update slider value if user isn't dragging it
    progressSlider.value = String(currentProgress);
  }
  progressPercentSpan.textContent = `${(currentProgress * 100).toFixed(1)}%`;
  const currentTimeSec =
    durationMs > 0 ? ((currentProgress * durationMs) / 1000).toFixed(1) : "?";
  const totalTimeSec = durationMs > 0 ? (durationMs / 1000).toFixed(1) : "?";
  timeDisplaySpan.textContent = `(${currentTimeSec}s / ${totalTimeSec}s)`;

  // Update status message
  if (routeReplayOverlay && durationMs > 0) {
    statusDiv.textContent = isPlaying
      ? "Status: Playing"
      : "Status: Paused/Stopped";
  } else if (map) {
    statusDiv.textContent = "Status: Ready (Overlay Initialized)";
  } else {
    statusDiv.textContent = "Status: Waiting for map...";
  }
}

// --- Helper Functions ---
function showError(message: string) {
  console.error(message);
  errorDiv.textContent = message;
}

// --- Start the application ---
initialize();
