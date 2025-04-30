**English** | [日本語](./README.ja.md)

# GoogleMaps Route Replay

[![Deploy VitePress Docs to GitHub Pages](https://github.com/skyt-a/route-replay-googlemaps/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/skyt-a/route-replay-googlemaps/actions/workflows/deploy-docs.yml)

A library for replaying route data with time information on Google Maps.
It supports high-performance rendering using `WebGLOverlayView` and simultaneous playback of multiple tracks (moving entities).

https://github.com/user-attachments/assets/c024a0e5-4d4a-43f5-88bc-e8c5e16e4110

demo: https://gm-route-replay-react-vite.vercel.app

## Documentation

For detailed API references and usage examples, please refer to the documentation site:

**[GoogleMaps Route Replay Documentation (English)](https://skyt-a.github.io/route-replay-googlemaps/en/)**

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
npm install route-replay-googlemaps-core
yarn add route-replay-googlemaps-core
pnpm add route-replay-googlemaps-core

# if using React
npm install route-replay-googlemaps-react
yarn add route-replay-googlemaps-react
pnpm add route-replay-googlemaps-react
```

## Basic Usage (React Component)

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Loader } from "@googlemaps/js-api-loader";
import { RouteReplay, RouteReplayHandle } from "route-replay-googlemaps-react";
import type { RouteInput } from 'route-replay-googlemaps-core';

function MapComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
  const mapId = 'YOUR_MAP_ID';


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
        />
      )}
      <button onClick={() => replayHandleRef.current?.play()} disabled={!mapInstance}>
        Play
      </button>
      <button onClick={() => replayHandleRef.current?.pause()} disabled={!mapInstance}>
        Pause
      </button>
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
    <title>GoogleMaps Route Replay Core Example</title>
    <style>
        #map { height: 400px; width: 100%; }
    </style>
</head>
<body>
    <h1>GoogleMaps Route Replay Core Example</h1>
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
import { GmRouteReplayOverlay } from 'route-replay-googlemaps-core';

let map;
let replayOverlay;


function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.68, lng: 139.76 },
    zoom: 14,
    mapId: 'YOUR_MAP_ID' 
  });

  const routeData = [
    { lat: 35.680, lng: 139.760, t: Date.now() },
    { lat: 35.680, lng: 139.770, t: Date.now() + 10000, heading: 90 },
    { lat: 35.685, lng: 139.770, t: Date.now() + 20000, heading: 0 },
    { lat: 35.685, lng: 139.760, t: Date.now() + 30000, heading: 270 },
    { lat: 35.680, lng: 139.760, t: Date.now() + 40000, heading: 180 },
  ];

  replayOverlay = new GmRouteReplayOverlay({
    map: map,
    route: routeData,
    autoFit: true,

  });
  replayOverlay.setMap(map);
  replayOverlay.addEventListener('ready', () => {
    document.getElementById('playBtn')?.addEventListener('click', () => replayOverlay?.play());
    document.getElementById('pauseBtn')?.addEventListener('click', () => replayOverlay?.pause());
  });
}

window.initMap = initMap;
```

## License

[ISC](./LICENSE)

