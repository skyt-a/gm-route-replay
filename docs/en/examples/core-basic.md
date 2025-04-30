# Core Library Example

This page shows a basic usage example using the core `route-replay-googlemaps-core` library directly, without React.

## HTML Setup

You'll need a basic HTML file to host the map and controls:

```html
<!DOCTYPE html>
<html>
<head>
    <title>GoogleMaps Route Replay Core Example</title>
    <style>
        #map { height: 400px; width: 100%; }
        button { margin: 5px; }
    </style>
</head>
<body>
    <h1>GoogleMaps Route Replay Core Example</h1>
    <div id="map"></div>
    <div>
        <button id="playBtn">Play</button>
        <button id="pauseBtn">Pause</button>
        <button id="stopBtn">Stop</button>
    </div>

    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap&libraries=geometry&v=weekly" defer></script>
    <script type="module" src="./core-example.js"></script> 
</body>
</html>
```

## JavaScript Implementation

Create a JavaScript file (e.g., `core-example.js`) to initialize the map and the player:

```javascript
import { createPlayer } from 'route-replay-googlemaps-core';

let map;
let player;


function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.68, lng: 139.76 },
    zoom: 14,
    mapId: 'YOUR_MAP_ID' 
  });


  const startTime = Date.now();
  const routeData = [
    { lat: 35.680, lng: 139.760, t: startTime },
    { lat: 35.680, lng: 139.770, t: startTime + 10000, heading: 90 },
    { lat: 35.685, lng: 139.770, t: startTime + 20000, heading: 0 },  
    { lat: 35.685, lng: 139.760, t: startTime + 30000, heading: 270 },
    { lat: 35.680, lng: 139.760, t: startTime + 40000, heading: 180 },
  ];

  try {
    player = createPlayer({
      map: map,
      route: routeData,
      autoFit: true,          
      initialSpeed: 1,        


      cameraMode: 'center',   
      polylineOptions: {      
        strokeColor: '#0000FF',
        strokeWeight: 3,
      },
      markerOptions: {        

      }
    });

    document.getElementById('playBtn')?.addEventListener('click', () => player?.play());
    document.getElementById('pauseBtn')?.addEventListener('click', () => player?.pause());
    document.getElementById('stopBtn')?.addEventListener('click', () => player?.stop());
    player.on('frame', (payload) => {

    });
    player.on('finish', () => {
      console.log('Playback finished!');
    });
  } catch (error) {
    console.error('Failed to create player:', error);
    alert('Failed to initialize route replay: ' + error.message);
  }
}


window.initMap = initMap;
```

**Important:**

*   Replace `YOUR_GOOGLE_MAPS_API_KEY` and (if using WebGL) `YOUR_MAP_ID` with your actual credentials.
*   You will need a build tool (like Vite, esbuild, Rollup, Webpack) to bundle the JavaScript code that uses `import`, or adapt the code to use a UMD build if provided by the library in the future. 