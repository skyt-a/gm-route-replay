# GM Route Replay

[![Deploy VitePress Docs to GitHub Pages](https://github.com/skyt-a/gm-route-replay/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/skyt-a/gm-route-replay/actions/workflows/deploy-docs.yml)

A library for replaying route data with time information on Google Maps.
It supports high-performance rendering using `WebGLOverlayView` and simultaneous playback of multiple tracks (moving entities).

## Documentation

For detailed API references and usage examples, please refer to the documentation site:

**[GM Route Replay Documentation (English)](https://skyt-a.github.io/gm-route-replay/en/)**

(日本語版は [こちら](./README.ja.md))

## Features

*   **Selectable Renderers:**
    *   Default: Uses standard `google.maps.Marker` for simple usage.
    *   Optional: Uses `google.maps.WebGLOverlayView` for high-performance rendering of large numbers of markers.
*   **Multi-track:** Play back multiple route data simultaneously.
*   **Flexible Camera Control:** Multiple camera modes, including fixed, follow, and look-ahead.
*   **Simple API:** Provides a core library and a React Hook.
*   **TypeScript:** Safe development with type definitions.

## Installation

```bash
# Core Library
pnpm add gm-route-replay-core

# React Hook (if using React)
pnpm add gm-route-replay-react
```

## Basic Usage (React Component)

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Loader } from "@googlemaps/js-api-loader";
import { RouteReplay, RouteReplayHandle } from "gm-route-replay-react";
import type { RouteInput } from 'gm-route-replay-core';

function MapComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key
  const mapId = 'YOUR_MAP_ID'; // Optional: Required for WebGL renderer

  // Load Google Maps API
  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.importLibrary("maps").then((google) => {
      const map = new google.Map(document.getElementById("map")!, {
        center: { lat: 35.68, lng: 139.76 },
        zoom: 15,
        mapId: mapId,
      });
      setMapInstance(map);
    });
  }, [apiKey]);

  const routeData: RouteInput = [
    { lat: 35.68, lng: 139.76, t: Date.now() },
    { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
    // ... more points
  ];

  return (
    <div>
      <div id="map" style={{ height: '400px', width: '100%' }} />
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={routeData}
          autoFit={true}
          // Options can be passed here
          // markerOptions={{...}}
          // polylineOptions={{...}}
        />
      )}
      <button onClick={() => replayHandleRef.current?.play()} disabled={!mapInstance}>
        Play
      </button>
      <button onClick={() => replayHandleRef.current?.pause()} disabled={!mapInstance}>
        Pause
      </button>
      {/* Add more controls as needed */}
    </div>
  );
}
```

## Basic Usage (Core Library)

If you are not using React, you can use the core library directly.

```html
<!DOCTYPE html>
<html>
<head>
    <title>GM Route Replay Core Example</title>
    <style>
        #map { height: 400px; width: 100%; }
    </style>
</head>
<body>
    <h1>GM Route Replay Core Example</h1>
    <div id="map"></div>
    <button id="playBtn">Play</button>
    <button id="pauseBtn">Pause</button>
    <!-- Replace YOUR_GOOGLE_MAPS_API_KEY -->
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap&libraries=geometry&v=weekly" defer></script>
    <!-- Load your bundled script that includes the code below -->
    <script type="module" src="./core-example.js"></script> 
</body>
</html>
```

```javascript:core-example.js
import { createPlayer } from 'gm-route-replay-core';

let map;
let player;

// This function is called by the Google Maps script load
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.68, lng: 139.76 },
    zoom: 14,
    mapId: 'YOUR_MAP_ID' // Optional: for WebGL renderer
  });

  const routeData = [
    { lat: 35.680, lng: 139.760, t: Date.now() },
    { lat: 35.680, lng: 139.770, t: Date.now() + 10000, heading: 90 },
    { lat: 35.685, lng: 139.770, t: Date.now() + 20000, heading: 0 },
    { lat: 35.685, lng: 139.760, t: Date.now() + 30000, heading: 270 },
    { lat: 35.680, lng: 139.760, t: Date.now() + 40000, heading: 180 },
  ];

  player = createPlayer({
    map: map,
    route: routeData,
    autoFit: true,
    rendererType: 'webgl', 
    mapId: 'YOUR_MAP_ID',
  });

  document.getElementById('playBtn')?.addEventListener('click', () => player?.play());
  document.getElementById('pauseBtn')?.addEventListener('click', () => player?.pause());
}

window.initMap = initMap;
```

## License

[ISC](./LICENSE)
