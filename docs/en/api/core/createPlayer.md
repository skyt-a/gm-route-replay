# createPlayer()

The `createPlayer` function is the main entry point for the route replay functionality. It initializes and returns a new player instance.

## Signature

```typescript
import { PlayerOptions, PlayerHandle } from 'gm-route-replay-core';

function createPlayer(options: PlayerOptions): PlayerHandle;
```

## Parameters

*   **`options`**: `PlayerOptions`
    An options object to configure the player's behavior. See the `PlayerOptions` page for details.

## Returns

*   **`PlayerHandle`**
    An object containing methods to control the player (play, pause, seek, etc.) and a method (`on`) to register event listeners. See the `PlayerHandle` page for details.

## Usage Example

```typescript
import { createPlayer } from 'gm-route-replay-core';

const map = new google.maps.Map(document.getElementById('map'), { /* ... map options ... */ });

const routeData = [
  { lat: 35.68, lng: 139.76, t: Date.now() },
  { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
  { lat: 35.69, lng: 139.77, t: Date.now() + 20000 },
];

const player = createPlayer({
  map: map,
  route: routeData,
  initialSpeed: 2,
  cameraMode: 'ahead',
  rendererType: 'webgl', // Recommended for performance
  // ... other options
});

// Start playback
player.play();
``` 