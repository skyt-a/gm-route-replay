# GmRouteReplayOverlayOptions

Interface defining the configuration options passed to the `GmRouteReplayOverlay` class constructor.

## Properties

*   **`map`**: `google.maps.Map` (Required)
    The Google Maps instance to display the route replay on.
*   **`route`**: `RouteInput` (Required)
    The route data to play back. See `RouteInput` for details.
*   **`fps?`**: `60 | 30` (Optional, Default: `60`)
    Target frame rate for the animation (frames per second).
*   **`initialSpeed?`**: `number` (Optional, Default: `1`)
    Initial playback speed multiplier.
*   **`autoFit?`**: `boolean` (Optional, Default: `true`)
    Whether to automatically fit the map bounds to the entire route on load.
*   **`markerOptions?`**: `google.maps.MarkerOptions | ((trackId: string) => google.maps.MarkerOptions)` (Optional)
    Display options for the marker indicating the current position on the route. Or a function returning options per track ID.
*   **`polylineOptions?`**: `google.maps.PolylineOptions | ((trackId: string) => google.maps.PolylineOptions)` (Optional)
    Display options for the polyline showing the traversed path. If not specified, the polyline is not displayed. Or a function returning options per track ID.
*   **`interpolation?`**: `'linear' | 'spline'` (Optional, Default: `'linear'`)
    Interpolation method between route points. (Currently only `'linear'` is supported)
*   **`plugins?`**: `Plugin[]` (Optional)
    An array of plugins to extend player functionality.
*   **`cameraMode?`**: `CameraMode` (Optional, Default: `'center'`)
    Camera follow mode. See `CameraMode` for details.
*   **`cameraOptions?`**: `CameraOptions` (Optional)
    Detailed settings for specific camera modes (especially `'ahead'`).
    *   `aheadDistance?`: `number` (Default: `100`) - How many meters ahead to look in `'ahead'` mode.
    *   `defaultTilt?`: `number` (Default: `45`) - Default tilt angle in `'ahead'` mode.
    *   `zoomLevel?`: `number` - Fixed zoom level for the camera mode. Overrides zoom adjustments from `autoFit`.
*   **`loop?`**: `boolean` (Optional, Default: `false`)
    Whether to loop the playback.
*   **`defaultMarkerIcon?`**: `string | google.maps.Icon | google.maps.Symbol` (Optional)
    The default marker icon to use if not specified individually in `markerOptions`.

## Example

```typescript
import { GmRouteReplayOverlay, GmRouteReplayOverlayOptions } from 'route-replay-googlemaps-core';

const options: GmRouteReplayOverlayOptions = {
  map: mapInstance,
  route: multiTrackRouteData,
  initialSpeed: 1.5,
  autoFit: true,
  polylineOptions: {
    strokeColor: '#00FFFF',
    strokeWeight: 3,
  },
  cameraMode: 'ahead',
  cameraOptions: {
    aheadDistance: 150,
    defaultTilt: 60,
    zoomLevel: 17
  },
  markerOptions: (trackId) => ({
    icon: trackId === 'truck' ? './truck.png' : './car.png'
  }),
};

const overlay = new GmRouteReplayOverlay(options);
overlay.setMap(mapInstance);
``` 