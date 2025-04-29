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
import { useRouteReplay } from 'gm-route-replay-react';
import { useRef, useState, useEffect } from 'react';

function MyMapComponent() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);
  // ... (Load Google Maps API logic)

  const { state, controls } = useRouteReplay({
    mapContainerRef,
    isMapApiLoaded,
    route: [/* your route points */],
    // ... other options
  });

  return (
    <div>
      <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
      {/* Add controls (play, pause, etc.) */}
      <button onClick={controls.play} disabled={!isMapApiLoaded || state.isPlaying}>Play</button>
      <button onClick={controls.pause} disabled={!isMapApiLoaded || !state.isPlaying}>Pause</button>
    </div>
  );
}
```

## License

ISC 