# RouteReplayHandle

Interface for methods exposed via the `ref` of the `RouteReplay` component.
This allows imperative control of the replay player from the parent component.

```tsx
import { useRef } from 'react';
import { RouteReplay, RouteReplayHandle } from 'gm-route-replay-react';

function MyComponent() {
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  // ... other setup ...

  const handlePlay = () => {
    replayHandleRef.current?.play();
  };

  const handleSeek = (timeMs: number) => {
    replayHandleRef.current?.seek(timeMs);
  }

  return (
    <>
      {/* ... */}
      <RouteReplay ref={replayHandleRef} map={mapInstance} route={routeData} />
      <button onClick={handlePlay}>Play</button>
      {/* ... */}
    </>
  );
}
```

## Methods

### `play()`

Starts or resumes playback.

### `pause()`

Pauses playback.

### `stop()`

Stops playback and resets the time to the beginning (0).

### `seek(timeMs: number)`

Moves the playback position to the specified time (in milliseconds).

- `timeMs`: The target time in milliseconds. Should be between 0 and `getDurationMs()`.

### `setSpeed(speed: number)`

Sets the playback speed.

- `speed`: The new playback speed (e.g., `1` for normal, `2` for double speed).

### `setCameraMode(mode: CameraMode)`

Sets the camera follow mode.

- `mode`: The new camera mode (`"center"` | `"ahead"` | `"none")`.
See [CameraMode](../core/camera-mode.md) for details.

### `getDurationMs(): number`

Returns the total playback duration of the route in milliseconds.

### `getCurrentTimeMs(): number`

Returns the current playback time in milliseconds.

### `getCurrentProgress(): number`

Returns the current playback progress as a value between 0 (start) and 1 (end).

### `getCurrentSpeed(): number`

Returns the current playback speed.

### `getCurrentCameraMode(): CameraMode`

Returns the current camera mode.

### `isReady(): boolean`

Returns whether the player is initialized and ready for operations. 