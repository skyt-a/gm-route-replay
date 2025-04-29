# GmRouteReplayOverlay Class

The main class providing the route replay functionality. It inherits from Google Maps `OverlayView` to draw and control the replay on the map.

## Constructor

```typescript
import { GmRouteReplayOverlay, GmRouteReplayOverlayOptions } from 'gm-route-replay-core';

new GmRouteReplayOverlay(options: GmRouteReplayOverlayOptions);
```

## Parameters

*   **`options`**: `GmRouteReplayOverlayOptions`
    An options object to configure the overlay's behavior. See the [`GmRouteReplayOverlayOptions`](./overlay-options.md) page for details.

## Getting an Instance and Adding to Map

After creating an instance of `GmRouteReplayOverlay`, add it to the Google Maps `Map` object's `overlayMapTypes` or use the `setMap()` method.

**Important:** Following the `OverlayView` lifecycle, the player is initialized after the `onAdd` method is called, and its various methods become available.

```typescript
import { GmRouteReplayOverlay } from 'gm-route-replay-core';

const map = new google.maps.Map(document.getElementById('map'), { /* ... map options ... */ });

const routeData = [
  { lat: 35.68, lng: 139.76, t: Date.now() },
  { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
  { lat: 35.69, lng: 139.77, t: Date.now() + 20000 },
];

const replayOverlay = new GmRouteReplayOverlay({
  map: map,
  route: routeData,
  initialSpeed: 2,
  cameraMode: 'ahead',

});


replayOverlay.setMap(map);


replayOverlay.addEventListener('ready', () => {
  console.log('Player is ready!');
  replayOverlay.play();
});


if (replayOverlay.isReady()) {
  replayOverlay.play();
} else {

}
```

## Methods and Properties

See [`Overlay Methods & Properties`](./overlay-methods.md) for the instance methods and properties. 