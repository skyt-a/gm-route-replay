# PlayerHandle

The interface for the object returned by the `createPlayer` function, providing playback control and event subscription capabilities.

## Methods

*   **`play(): void`**
    Starts or resumes playback from the current position.
*   **`pause(): void`**
    Pauses playback at the current position.
*   **`stop(): void`**
    Stops playback and resets the playback position to the beginning of the route.
*   **`seek(ms: number): void`**
    Moves the playback position to the specified timestamp (in milliseconds, relative to the route's start time).
*   **`setSpeed(multiplier: number): void`**
    Sets the playback speed multiplier. `1` is normal speed, `2` is double speed.
*   **`setDirection(dir: "forward" | "reverse"): void`**
    Sets the playback direction. (Currently not implemented)
*   **`setCameraMode(mode: CameraMode, options?: CameraOptions): void`**
    Sets the camera follow mode. See `CameraMode` for details. Optionally, you can provide `CameraOptions` to update detailed settings for the mode.
*   **`on<E extends PlayerEvent>(ev: E, cb: PlayerEventMap[E]): void`**
    Subscribes to player events. See the `Events` page for details on event types and callback functions.
*   **`destroy(): void`**
    Destroys the player instance. Removes associated elements (markers, polylines, WebGL overlay) from the map, stops animation, and clears event listeners. Always call this when the instance is no longer needed.

## Example

```typescript
const player: PlayerHandle = createPlayer(options);

// Play/Pause buttons
document.getElementById('playButton').addEventListener('click', () => player.play());
document.getElementById('pauseButton').addEventListener('click', () => player.pause());

// Speed control slider
document.getElementById('speedSlider').addEventListener('input', (event) => {
  const speed = parseFloat((event.target as HTMLInputElement).value);
  player.setSpeed(speed);
});

// Event subscription
player.on('frame', (payload) => {
  console.log(`Frame at progress: ${payload.progress.toFixed(2)}`);
});

player.on('finish', () => {
  console.log('Playback finished!');
});

// Cleanup
window.addEventListener('beforeunload', () => {
  player.destroy();
});
``` 