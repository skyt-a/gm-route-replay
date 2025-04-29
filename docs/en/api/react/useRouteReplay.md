# useRouteReplay()

A custom hook for easily implementing the route replay functionality in React applications.
It wraps `gm-route-replay-core`'s `createPlayer` and integrates it with React's state management and lifecycle.

## Signature

```typescript
import {
  RouteInput, // Re-exported or defined locally
  CameraMode,
  CameraOptions,
  PlayerHandle
} from 'gm-route-replay-core'; // Assuming types are accessible

interface UseRouteReplayOptions {
  // Core options (excluding map)
  route: RouteInput;
  fps?: 60 | 30;
  initialSpeed?: number;
  autoFit?: boolean;
  markerOptions?: google.maps.MarkerOptions;
  polylineOptions?: google.maps.PolylineOptions;
  interpolation?: "linear" | "spline";
  plugins?: Plugin[];

  // Hook-specific options
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  isMapApiLoaded?: boolean;
  cameraMode?: CameraMode;
  mapId?: string; // Optional Map ID for WebGL/Vector maps
}

interface RouteReplayState {
  isPlaying: boolean;
  progress: number;
  speed: number;
  durationMs: number;
  cameraMode: CameraMode;
}

interface UseRouteReplayResult {
  player: PlayerHandle | null;
  state: RouteReplayState;
  controls: {
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (ms: number) => void;
    setSpeed: (multiplier: number) => void;
    setCameraMode: (mode: CameraMode, options?: CameraOptions) => void;
  };
}

function useRouteReplay(options: UseRouteReplayOptions): UseRouteReplayResult;
```

## Parameters

*   **`options`**: `UseRouteReplayOptions`
    Hook configuration options, including a subset of `PlayerOptions` and hook-specific options.
    *   **`mapContainerRef`**: `React.RefObject<HTMLDivElement | null>` (Required)
        A Ref to the `div` element where the Google Map will be rendered.
    *   **`isMapApiLoaded?`**: `boolean` (Optional)
        A flag indicating whether the Google Maps JavaScript API has been loaded. Typically managed using `@googlemaps/js-api-loader` or similar.
    *   **`mapId?`**: `string` (Optional)
        The Map ID configured in the Google Maps Platform. Required when using the WebGL renderer or vector map features.
    *   Other options (`route`, `initialSpeed`, `cameraMode`, `rendererType`, etc.) are the same as in `PlayerOptions`.

## Returns

*   **`UseRouteReplayResult`** object:
    *   **`player`**: `PlayerHandle | null`
        The underlying `gm-route-replay-core` `PlayerHandle` instance created internally. Direct access is possible, but `controls` are typically used.
    *   **`state`**: `RouteReplayState`
        An object containing the current state of the player.
        *   `isPlaying`: `boolean` - Whether playback is currently active.
        *   `progress`: `number` - Overall progress (0.0 to 1.0).
        *   `speed`: `number` - Current playback speed multiplier.
        *   `durationMs`: `number` - Total playback duration of the entire route in milliseconds.
        *   `cameraMode`: `CameraMode` - Current camera mode.
    *   **`controls`**: A set of functions to control the player.
        *   `play()`: Starts/resumes playback.
        *   `pause()`: Pauses playback.
        *   `stop()`: Stops playback and resets to the beginning.
        *   `seek(ms: number)`: Seeks to the specified time (in milliseconds).
        *   `setSpeed(multiplier: number)`: Sets the playback speed.
        *   `setCameraMode(mode: CameraMode, options?: CameraOptions)`: Sets the camera mode.

## Usage Example

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useRouteReplay } from 'gm-route-replay-react';
import type { RouteInput } from 'gm-route-replay-core';

function MyMapComponent() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''; // Get from environment variable
  const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID; // For WebGL

  // Sample route data
  const routeData: RouteInput = {
    track1: [ /* ... RoutePoint array ... */ ],
  };

  // Load Google Maps API
  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.load().then(() => setIsMapApiLoaded(true));
  }, [apiKey]);

  // Use the useRouteReplay hook
  const { state, controls } = useRouteReplay({
    mapContainerRef,
    isMapApiLoaded,
    route: routeData,
    initialSpeed: 1,
    cameraMode: 'center',
    rendererType: 'webgl',
    mapId: mapId,
  });

  return (
    <div>
      <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
      <div>
        <button onClick={controls.play} disabled={state.isPlaying}>Play</button>
        <button onClick={controls.pause} disabled={!state.isPlaying}>Pause</button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.progress}
          onChange={(e) => controls.seek(parseFloat(e.target.value) * state.durationMs)}
          disabled={state.durationMs === 0}
        />
        <span>Speed: {state.speed.toFixed(1)}x</span>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={state.speed}
          onChange={(e) => controls.setSpeed(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

export default MyMapComponent;
``` 