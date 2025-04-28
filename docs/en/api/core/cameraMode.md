# CameraMode

Specifies how the player's camera follows the marker (current position) on the map.

## Type Definition

```typescript
 type CameraMode = "center" | "ahead" | "none";
```

## Modes

*   **`'center'`** (Default)
    The camera moves to keep the marker always at the center of the map. The viewpoint is fixed from directly above.
*   **`'ahead'`**
    The camera follows the marker with tilt and heading adjustments to look ahead in the direction of travel, providing a more dynamic perspective.
    Detailed behavior can be adjusted using `cameraOptions` in `PlayerOptions`.
*   **`'none'`**
    The camera does not follow automatically. The user needs to manually pan and zoom the map.

## How to Set

Set the initial value in `PlayerOptions` or change it dynamically using the `setCameraMode` method of `PlayerHandle`.

```typescript
// Initial setting
const player = createPlayer({
  map: map,
  route: routeData,
  cameraMode: 'ahead',
  cameraOptions: { aheadDistance: 120, defaultTilt: 50 }
});

// Dynamic change
player.setCameraMode('center');
``` 