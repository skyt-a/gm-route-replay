# useRouteReplay()

React アプリケーションで簡単にルートリプレイ機能を実装するためのカスタムフックです。
`@gm/route-replay-core` の `createPlayer` をラップし、React の状態管理とライフサイクルに統合します。

## シグネチャ

```typescript
import {
  RouteInput, // Re-exported or defined locally
  CameraMode,
  CameraOptions,
  PlayerHandle
} from '@gm/route-replay-core'; // Assuming types are accessible

interface UseRouteReplayOptions {
  // Core options (excluding map)
  route: RouteInput;
  fps?: 60 | 30;
  initialSpeed?: number;
  autoFit?: boolean;
  markerOptions?: google.maps.MarkerOptions;
  polylineOptions?: google.maps.PolylineOptions;
  interpolation?: "linear" | "spline";
  plugins?: Plugin[];

  // Hook-specific options
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  isMapApiLoaded?: boolean;
  cameraMode?: CameraMode;
  mapId?: string; // Optional Map ID for WebGL/Vector maps
}

interface RouteReplayState {
  isPlaying: boolean;
  progress: number;
  speed: number;
  durationMs: number;
  cameraMode: CameraMode;
}

interface UseRouteReplayResult {
  player: PlayerHandle | null;
  state: RouteReplayState;
  controls: {
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (ms: number) => void;
    setSpeed: (multiplier: number) => void;
    setCameraMode: (mode: CameraMode, options?: CameraOptions) => void;
  };
}

function useRouteReplay(options: UseRouteReplayOptions): UseRouteReplayResult;
```

## パラメータ

*   **`options`**: `UseRouteReplayOptions`
    フックの設定オプション。`PlayerOptions` の一部とフック固有のオプションを含みます。
    *   **`mapContainerRef`**: `React.RefObject<HTMLDivElement | null>` (必須)
        Google マップを描画する `div` 要素への Ref。
    *   **`isMapApiLoaded?`**: `boolean` (オプション)
        Google Maps JavaScript API がロードされたかどうかを示すフラグ。通常、`@googlemaps/js-api-loader` などで管理します。
    *   **`mapId?`**: `string` (オプション)
        Google Maps Platform で設定した Map ID。WebGL レンダラーを使用する場合や、ベクターマップ機能を使用する場合に必要です。
    *   その他のオプション (`route`, `initialSpeed`, `cameraMode`, `rendererType` など) は `PlayerOptions` と同様です。

## 戻り値

*   **`UseRouteReplayResult`** オブジェクト:
    *   **`player`**: `PlayerHandle | null`
        内部で作成された `@gm/route-replay-core` の `PlayerHandle` インスタンス。直接アクセスすることも可能ですが、通常は `controls` を使用します。
    *   **`state`**: `RouteReplayState`
        現在のプレイヤーの状態を含むオブジェクト。
        *   `isPlaying`: `boolean` - 再生中かどうか。
        *   `progress`: `number` - 全体の進行度 (0.0 〜 1.0)。
        *   `speed`: `number` - 現在の再生速度倍率。
        *   `durationMs`: `number` - ルート全体の総再生時間 (ミリ秒)。
        *   `cameraMode`: `CameraMode` - 現在のカメラモード。
    *   **`controls`**: プレイヤーを操作するための関数のセット。
        *   `play()`: 再生を開始/再開します。
        *   `pause()`: 再生を一時停止します。
        *   `stop()`: 再生を停止し、先頭に戻ります。
        *   `seek(ms: number)`: 指定時間 (ミリ秒) にシークします。
        *   `setSpeed(multiplier: number)`: 再生速度を設定します。
        *   `setCameraMode(mode: CameraMode, options?: CameraOptions)`: カメラモードを設定します。

## 使用例

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useRouteReplay } from '@gm/route-replay-react';
import type { RouteInput } from '@gm/route-replay-core';

function MyMapComponent() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''; // 環境変数から取得
  const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID; // WebGL用

  // サンプルルートデータ
  const routeData: RouteInput = {
    track1: [ /* ... RoutePoint array ... */ ],
  };

  // Google Maps API のロード
  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.load().then(() => setIsMapApiLoaded(true));
  }, [apiKey]);

  // useRouteReplay フックの使用
  const { state, controls } = useRouteReplay({
    mapContainerRef,
    isMapApiLoaded,
    route: routeData,
    initialSpeed: 1,
    cameraMode: 'center',
    rendererType: 'webgl',
    mapId: mapId,
  });

  return (
    <div>
      <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
      <div>
        <button onClick={controls.play} disabled={state.isPlaying}>Play</button>
        <button onClick={controls.pause} disabled={!state.isPlaying}>Pause</button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.progress}
          onChange={(e) => controls.seek(parseFloat(e.target.value) * state.durationMs)}
          disabled={state.durationMs === 0}
        />
        <span>Speed: {state.speed.toFixed(1)}x</span>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={state.speed}
          onChange={(e) => controls.setSpeed(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

export default MyMapComponent;
``` 