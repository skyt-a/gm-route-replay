# RoutePoint

An interface representing a single point along the route.

## Properties

*   **`lat`**: `number` (Required)
    Latitude of the point in degrees.
*   **`lng`**: `number` (Required)
    Longitude of the point in degrees.
*   **`t`**: `number` (Required)
    Timestamp of the point in Unix milliseconds. Defines the temporal relationship with other points in the route.
*   **`heading?`**: `number` (Optional)
    Heading at the point in degrees (0-360). If not specified, it may be calculated based on the direction to the next point.
*   **`elev?`**: `number` (Optional)
    Elevation of the point in meters. Currently not used.

## Example

```typescript
const point1: RoutePoint = {
  lat: 35.681236,
  lng: 139.767125,
  t: 1678886400000,
  heading: 90,
};

const point2: RoutePoint = {
  lat: 35.681236,
  lng: 139.777125,
  t: 1678886460000,

};
``` 