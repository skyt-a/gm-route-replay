# Overlay Methods & Properties

Methods and properties available on an instance of the `GmRouteReplayOverlay` class.

## Methods

*   **`play(): void`**
    Starts or resumes playback from the current position.
*   **`pause(): void`**
    Pauses playback at the current position.
*   **`stop(): void`**
    Stops playback and resets the playback position to the start of the route.
*   **`seek(timeMs: number): void`**
    Moves the playback position to the specified timestamp (in milliseconds, relative to the route start time).
*   **`setSpeed(speed: number): void`**
    Sets the playback speed multiplier. `1` is normal speed, `2` is double speed.
*   **`setCameraMode(mode: CameraMode, options?: CameraOptions): void`**
    Sets the camera follow mode. See `CameraMode` for details. Optionally, `CameraOptions` can be provided to update specific settings for the mode.
*   **`setMap(map: google.maps.Map | null): void`**
    Sets or removes the map for the overlay. This is the standard method inherited from `OverlayView`. Use this to associate the overlay with a map if you didn't provide `map` in the constructor. Passing `null` removes it from the map.
*   **`addEventListener<K extends keyof PlayerEventMap>(type: K, listener: (ev: PlayerEventMap[K]) => any): void`**
    Subscribes to player events. See the `Events` page for event types and payloads.
*   **`removeEventListener<K extends keyof PlayerEventMap>(type: K, listener: (ev: PlayerEventMap[K]) => any): void`**
    Removes a previously registered event listener.
*   **`destroy(): void`**
    Destroys the overlay instance. Removes associated elements from the map, stops animations, and removes event listeners. It's recommended to call `setMap(null)` or this method when the instance is no longer needed.

## Properties (Read-only)

*   **`isReady: boolean`**
    Whether the player is initialized and ready for operations.
*   **`durationMs: number`**
    The total playback duration of the route in milliseconds.
*   **`currentTimeMs: number`**
    The current playback time in milliseconds.
*   **`currentProgress: number`**
    The current playback progress (from 0 to 1).
*   **`currentSpeed: number`**
    The current playback speed.
*   **`currentCameraMode: CameraMode`**
    The current camera mode.

## Example

```typescript
import { GmRouteReplayOverlay } from 'route-replay-googlemaps-core';


const overlay = new GmRouteReplayOverlay(options);
overlay.setMap(map);

overlay.addEventListener('ready', () => {

  document.getElementById('playButton').addEventListener('click', () => overlay.play());
  document.getElementById('pauseButton').addEventListener('click', () => overlay.pause());


  document.getElementById('speedSlider').addEventListener('input', (event) => {
    const speed = parseFloat((event.target as HTMLInputElement).value);
    overlay.setSpeed(speed);
  });


  overlay.addEventListener('frame', (payload) => {
    console.log(`Frame at progress: ${overlay.currentProgress.toFixed(2)}`);
  });

  overlay.addEventListener('finish', () => {
    console.log('Playback finished!');
  });
});


window.addEventListener('beforeunload', () => {
  overlay.setMap(null);
});
``` 