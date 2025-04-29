# RouteReplay Component

The main React component for displaying and controlling route replay.

```tsx
import { RouteReplay, RouteReplayHandle } from 'gm-route-replay-react';
import type { RouteInput, PlayerOptions, PlayerEventMap } from 'gm-route-replay-core';
import { useRef, useState, useEffect } from 'react';

function MyComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const routeData: RouteInput = [/* ... */];

  // Initialize map instance ...

  return (
    <>
      <div id="map"></div>
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={routeData}
          // Options
          autoFit={true}
          initialSpeed={2}
          cameraMode="ahead"
          markerOptions={{ /* ... */ }}
          polylineOptions={{ /* ... */ }}
          // Event Handlers
          onFrame={(payload) => console.log('Frame:', payload.progress)}
          onStart={() => console.log('Started')}
          onPause={() => console.log('Paused')}
          onFinish={() => console.log('Finished')}
          onError={(payload) => console.error('Error:', payload.error)}
        />
      )}
      {/* Control buttons, etc. */}
      <button onClick={() => replayHandleRef.current?.play()}>Play</button>
    </>
  );
}
```

## Props

The component accepts the following props:

### `map`

- **Type:** `google.maps.Map`
- **Required:** `true`

The Google Map instance to display the replay on.

### `route`

- **Type:** `RouteInput`
- **Required:** `true`

The route data to display. Format is `RoutePoint[]` or `{ [trackId: string]: RoutePoint[] }`.
See [RouteInput Type](../core/route-input.md) for details.

### `ref`

- **Type:** `React.Ref<RouteReplayHandle>`
- **Required:** `false`

A Ref to control the player externally. Provides access to `RouteReplayHandle` methods (`play`, `pause`, etc.).
See [`RouteReplayHandle`](./route-replay-handle.md) for details.

### Optional Props

You can pass the same options as the core library's `createPlayer` function (`PlayerOptions`) as props.
See [PlayerOptions](../core/player-options.md) for details.

Key options:

- `autoFit?: boolean`: Whether to automatically adjust the map bounds to fit the entire route (default: `true`).
- `initialSpeed?: number`: Initial playback speed (default: `1`).
- `cameraMode?: CameraMode`: Initial camera mode (default: `"center"`).
- `markerOptions?: google.maps.MarkerOptions | ((trackId: string) => google.maps.MarkerOptions)`: Marker options, or a function returning options per track ID.
- `polylineOptions?: google.maps.PolylineOptions | ((trackId: string) => google.maps.PolylineOptions)`: Polyline options, or a function returning options per track ID.
- `loop?: boolean`: Whether to loop playback (default: `false`).
- `defaultMarkerIcon?: string | google.maps.Icon | google.maps.Symbol`: Default marker icon.

### Event Handler Props

You can pass callback functions as props corresponding to player events.
See [Events](../core/events.md) for event payload details.

- `onFrame?: (payload: PlayerEventMap['frame']) => void`: On frame update.
- `onStart?: (payload: PlayerEventMap['start']) => void`: On playback start.
- `onPause?: (payload: PlayerEventMap['pause']) => void`: On pause.
- `onSeek?: (payload: PlayerEventMap['seek']) => void`: On seek.
- `onFinish?: (payload: PlayerEventMap['finish']) => void`: On playback finish.
- `onError?: (payload: PlayerEventMap['error']) => void`: On error.
- `onDurationChange?: (payload: PlayerEventMap['durationchange']) => void`: On total duration change.
- `onStateChange?: (payload: PlayerEventMap['statechange']) => void`: On player state change.
- `onCameraModeChange?: (payload: PlayerEventMap['cameramodechange']) => void`: On camera mode change.
- `onSpeedChange?: (payload: PlayerEventMap['speedchange']) => void`: On playback speed change. 