# gm-route-replay-react

React hook and components for gm-route-replay.

See the [main project documentation](https://skyt-a.github.io/gm-route-replay/ja/) for more details.

## Installation

```bash
npm install gm-route-replay-react gm-route-replay-core react react-dom @types/google.maps
# or
yarn add gm-route-replay-react gm-route-replay-core react react-dom @types/google.maps
# or
pnpm add gm-route-replay-react gm-route-replay-core react react-dom @types/google.maps
```

## Usage

```tsx
import { RouteReplay, RouteReplayHandle } from 'gm-route-replay-react';
import { useRef, useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { RouteInput } from 'gm-route-replay-core';

function MyMapComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';

  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.importLibrary("maps").then((google) => {
      const map = new google.Map(document.getElementById("map")!, {
        center: { lat: 35.68, lng: 139.76 },
        zoom: 15,
      });
      setMapInstance(map);
    });
  }, [apiKey]);

  const routeData: RouteInput = [/* your route points */];

  return (
    <div>
      <div id="map" style={{ height: '500px', width: '100%' }} />
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={routeData}
        />
      )}
      <button onClick={() => replayHandleRef.current?.play()} disabled={!mapInstance}>Play</button>
      <button onClick={() => replayHandleRef.current?.pause()} disabled={!mapInstance}>Pause</button>
    </div>
  );
}
```

## License

ISC 