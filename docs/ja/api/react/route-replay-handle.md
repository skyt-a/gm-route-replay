# RouteReplayHandle

`RouteReplay` コンポーネントの Ref (`ref`) を介して公開されるメソッドのインターフェースです。
これにより、親コンポーネントからリプレイプレイヤーを命令的に制御できます。

```tsx
import { useRef } from 'react';
import { RouteReplay, RouteReplayHandle } from 'gm-route-replay-react';

function MyComponent() {
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  // ... 他のセットアップ ...

  const handlePlay = () => {
    replayHandleRef.current?.play();
  };

  const handleSeek = (timeMs: number) => {
    replayHandleRef.current?.seek(timeMs);
  }

  return (
    <>
      {/* ... */}
      <RouteReplay ref={replayHandleRef} map={mapInstance} route={routeData} />
      <button onClick={handlePlay}>Play</button>
      {/* ... */}
    </>
  );
}
```

## メソッド

### `play()`

再生を開始または再開します。

### `pause()`

再生を一時停止します。

### `stop()`

再生を停止し、時間を開始位置 (0) にリセットします。

### `seek(timeMs: number)`

指定された時間 (ミリ秒単位) に再生位置を移動します。

- `timeMs`: 移動先の時間 (ミリ秒)。0 から `getDurationMs()` の間の値。

### `setSpeed(speed: number)`

再生速度を設定します。

- `speed`: 新しい再生速度 (例: `1` は通常速度, `2` は倍速)。

### `setCameraMode(mode: CameraMode)`

カメラの追従モードを設定します。

- `mode`: 新しいカメラモード (`"center"` | `"ahead"` | `"none")。
詳細は [`CameraMode`](../core/cameraMode.md) を参照してください。

### `getDurationMs(): number`

ルート全体の総再生時間 (ミリ秒) を返します。

### `getCurrentTimeMs(): number`

現在の再生時間 (ミリ秒) を返します。

### `getCurrentProgress(): number`

現在の再生進捗を 0 (開始) から 1 (終了) の間の値で返します。

### `getCurrentSpeed(): number`

現在の再生速度を返します。

### `getCurrentCameraMode(): CameraMode`

現在のカメラモードを返します。

### `isReady(): boolean`

プレイヤーが初期化され、操作可能な状態かどうかを返します。 