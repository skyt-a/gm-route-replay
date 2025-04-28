# RouteInput

The type definition for the route data that can be provided to the `route` property of `PlayerOptions`. It accepts one of the following formats:

## Type Definition

```typescript
import { RoutePoint } from './types';

type RouteInput =
  | RoutePoint[] // Single route
  | { [trackId: string]: RoutePoint[] } // Multiple routes (Multi-track)
  | string; // URL containing route data (currently not implemented)
```

## Formats

1.  **Single Route**: `RoutePoint[]`
    An array of `RoutePoint` objects, representing a single moving entity.
    ```typescript
    const singleRoute: RouteInput = [
      { lat: 35.68, lng: 139.76, t: 1678886400000 },
      { lat: 35.68, lng: 139.77, t: 1678886460000 },
    ];
    ```

2.  **Multiple Routes (Multi-track)**: `{ [trackId: string]: RoutePoint[] }`
    An object where keys are track IDs (any string) and values are `RoutePoint` arrays for that track. Allows representing multiple moving entities simultaneously.
    ```typescript
    const multiTrackRoute: RouteInput = {
      car1: [
        { lat: 35.68, lng: 139.76, t: 1678886400000 },
        { lat: 35.68, lng: 139.77, t: 1678886460000 },
      ],
      bikeA: [
        { lat: 35.685, lng: 139.765, t: 1678886410000 },
        { lat: 35.685, lng: 139.775, t: 1678886450000 },
      ],
    };
    ```

3.  **URL**: `string`
    A URL from which route data (e.g., GeoJSON LineString with times) can be fetched. (Currently not implemented) 