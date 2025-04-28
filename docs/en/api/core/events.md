# Events

The player instance emits events based on changes in playback state and progress. These events can be subscribed to using the `on` method of `PlayerHandle`.

## Event Types (`PlayerEvent`)

A type for the available event names.

```typescript
type PlayerEvent =
  | "start"
  | "frame"
  | "pause"
  | "seek"
  | "finish"
  | "error";
```

## Event Payloads (`PlayerEventMap`)

Type definitions for the callback function and its payload (arguments) corresponding to each event.

```typescript
interface PlayerEventMap {
  start: () => void;
  frame: (payload: {
    trackId: string | number; // trackId for Multi-track, 0 (provisional) for Single-track
    pos: google.maps.LatLngLiteral;
    heading?: number;
    progress: number; // Overall progress (0.0 ~ 1.0)
  }) => void;
  pause: () => void;
  seek: (payload: { timeMs: number }) => void; // Seek target time (ms)
  finish: () => void;
  error: (payload: { error: Error }) => void;
}
```

## Event Descriptions

*   **`start`**: Emitted when playback starts (when `play` is called and playback actually begins).
*   **`frame`**: Emitted just before each animation frame is drawn. The payload includes the current track ID, position, heading (if available), and overall progress.
*   **`pause`**: Emitted when playback is paused (when `pause` is called).
*   **`seek`**: Emitted when the playback position changes (when `seek` is called). The payload includes the target time (milliseconds from the route start).
*   **`finish`**: Emitted when playback completes to the end of the route.
*   **`error`**: Emitted when an error occurs during processing. The payload includes the error object.

## Event Subscription Example

```typescript
const player = createPlayer(options);

player.on('start', () => {
  console.log('Playback started');
  // Update UI state, etc.
});

player.on('frame', ({ trackId, pos, progress }) => {
  // Display current position or progress, etc.
  document.getElementById('progressBar').style.width = `${progress * 100}%`;
  // trackId is available for Multi-track
  console.log(`Track ${trackId} is at ${pos.lat}, ${pos.lng}`);
});

player.on('finish', () => {
  console.log('Playback finished');
  // Re-enable play button, etc.
});

player.on('error', ({ error }) => {
  console.error('Player error:', error);
  // Display error message, etc.
});
``` 