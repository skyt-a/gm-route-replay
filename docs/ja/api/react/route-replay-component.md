# RouteReplay コンポーネント

ルートリプレイの表示と制御を行うための主要な React コンポーネントです。

```tsx
import { RouteReplay, RouteReplayHandle } from 'gm-route-replay-react';
import type { RouteInput, PlayerOptions, PlayerEventMap } from 'gm-route-replay-core';
import { useRef, useState, useEffect } from 'react';

function MyComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const routeData: RouteInput = [/* ... */];



  return (
    <>
      <div id="map"></div>
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={routeData}

          autoFit={true}
          initialSpeed={2}
          cameraMode="ahead"
          markerOptions={{ /* ... */ }}
          polylineOptions={{ /* ... */ }}

          onFrame={(payload) => console.log('Frame:', payload.progress)}
          onStart={() => console.log('Started')}
          onPause={() => console.log('Paused')}
          onFinish={() => console.log('Finished')}
          onError={(payload) => console.error('Error:', payload.error)}
        />
      )}
      <button onClick={() => replayHandleRef.current?.play()}>Play</button>
    </>
  );
}
```

## Props

コンポーネントは以下の Props を受け取ります。

### `map`

- **型:** `google.maps.Map`
- **必須:** `true`

リプレイを表示する Google Map インスタンス。

### `route`

- **型:** `RouteInput`
- **必須:** `true`

表示するルートデータ。`RoutePoint[]` または `{ [trackId: string]: RoutePoint[] }` の形式です。
詳細は [`RouteInput`](../core/routeInput.md) を参照してください。

### `ref`

- **型:** `React.Ref<RouteReplayHandle>`
- **必須:** `false`

プレイヤーを外部から制御するための Ref。`RouteReplayHandle` のメソッド（`play`, `pause` など）にアクセスできます。
詳細は [`RouteReplayHandle`](./route-replay-handle.md) を参照してください。

### オプション Props

コアライブラリの `createPlayer` 関数のオプション (`PlayerOptions`) と同じオプションを Props として渡すことができます。
詳細は [`OverlayOptions`](../core/overlay-options.md) を参照してください。

主なオプション:

- `autoFit?: boolean`: ルート全体がマップに収まるように自動調整するかどうか (デフォルト: `true`)
- `initialSpeed?: number`: 初期の再生速度 (デフォルト: `1`)
- `cameraMode?: CameraMode`: 初期のカメラモード (デフォルト: `"center"`)
- `markerOptions?: google.maps.MarkerOptions | ((trackId: string) => google.maps.MarkerOptions)`: マーカーのオプション、またはトラックIDごとにオプションを返す関数。
- `polylineOptions?: google.maps.PolylineOptions | ((trackId: string) => google.maps.PolylineOptions)`: ポリラインのオプション、またはトラックIDごとにオプションを返す関数。
- `loop?: boolean`: 再生をループするかどうか (デフォルト: `false`)
- `defaultMarkerIcon?: string | google.maps.Icon | google.maps.Symbol`: デフォルトのマーカーアイコン。

### イベントハンドラ Props

プレイヤーのイベントに対応するコールバック関数を Props として渡すことができます。
イベントペイロードの詳細は [`Events`](../core/events.md) を参照してください。

- `onFrame?: (payload: PlayerEventMap['frame']) => void`: フレーム更新時
- `onStart?: (payload: PlayerEventMap['start']) => void`: 再生開始時
- `onPause?: (payload: PlayerEventMap['pause']) => void`: 一時停止時
- `onSeek?: (payload: PlayerEventMap['seek']) => void`: シーク時
- `onFinish?: (payload: PlayerEventMap['finish']) => void`: 再生終了時
- `onError?: (payload: PlayerEventMap['error']) => void`: エラー発生時
- `onDurationChange?: (payload: PlayerEventMap['durationchange']) => void`: 総再生時間の変更時
- `onStateChange?: (payload: PlayerEventMap['statechange']) => void`: プレイヤーステート変更時
- `onCameraModeChange?: (payload: PlayerEventMap['cameramodechange']) => void`: カメラモード変更時
- `onSpeedChange?: (payload: PlayerEventMap['speedchange']) => void`: 再生速度変更時 