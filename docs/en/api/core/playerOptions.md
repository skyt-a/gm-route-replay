# PlayerOptions

An interface defining the configuration options passed to the `createPlayer` function.

## Properties

*   **`map`**: `google.maps.Map` (Required)
    The Google Maps instance to render the route replay on.
*   **`route`**: `RouteInput` (Required)
    The route data to play back. See `RouteInput` for details.
*   **`fps?`**: `60 | 30` (Optional, Default: `60`)
    Target frames per second for the animation.
*   **`initialSpeed?`**: `number` (Optional, Default: `1`)
    The initial playback speed multiplier.
*   **`autoFit?`**: `boolean` (Optional, Default: `true`)
    Whether to automatically fit the map bounds to the entire route on load.
*   **`markerOptions?`**: `google.maps.MarkerOptions` (Optional)
    Display options for the marker indicating the current position on the route. Applied when `rendererType` is `'marker'`. Ignored if `rendererType` is `'webgl'`.
*   **`polylineOptions?`**: `google.maps.PolylineOptions` (Optional)
    Display options for the polyline showing the traversed path. If not specified, the polyline is not displayed.
*   **`interpolation?`**: `'linear' | 'spline'` (Optional, Default: `'linear'`)
    Interpolation method between route points. (Currently only `'linear'` is supported)
*   **`plugins?`**: `Plugin[]` (Optional)
    An array of plugins to extend player functionality.
*   **`cameraMode?`**: `CameraMode` (Optional, Default: `'center'`)
    Camera follow mode. See `CameraMode` for details.
*   **`cameraOptions?`**: `CameraOptions` (Optional)
    Detailed settings for specific camera modes (especially `'ahead'`).
    *   `aheadDistance?`: `number` (Default: `100`) - How many meters ahead to look in `'ahead'` mode.
    *   `defaultTilt?`: `number` (Default: `45`) - Default tilt angle for `'ahead'` mode.
    *   `zoomLevel?`: `number` - Fixed zoom level for camera modes. Overrides `autoFit` zoom adjustment if set.
*   **`rendererType?`**: `'marker' | 'webgl'` (Optional, Default: `'marker'`)
    Selects the method for rendering the current position on the route.
    *   `'marker'`: Uses standard `google.maps.Marker`. Simple, but performance may degrade with many markers.
    *   `'webgl'`: Uses `google.maps.WebGLOverlayView`. Recommended for efficiently rendering a large number of markers. Requires setting up a Map ID in the Google Maps Platform.

## Example

```typescript
const options: PlayerOptions = {
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
  rendererType: 'webgl',
};

const player = createPlayer(options);
``` 