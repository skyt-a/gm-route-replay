# PlayerHandle 

`createPlayer` 関数が返すオブジェクトのインターフェースで、プレイヤーの再生制御とイベント購読の機能を提供します。

## メソッド

*   **`play(): void`**
    現在の位置から再生を開始または再開します。
*   **`pause(): void`**
    現在の位置で再生を一時停止します。
*   **`stop(): void`**
    再生を停止し、再生位置をルートの開始地点にリセットします。
*   **`seek(ms: number): void`**
    指定されたタイムスタンプ（ミリ秒単位、ルートの開始時刻からの相対時間）に再生位置を移動します。
*   **`setSpeed(multiplier: number): void`**
    再生速度の倍率を設定します。`1` が通常の速度、`2` が2倍速です。
*   **`setDirection(dir: "forward" | "reverse"): void`**
    再生方向を設定します。（現在未実装）
*   **`setCameraMode(mode: CameraMode, options?: CameraOptions): void`**
    カメラの追従モードを設定します。詳細は `CameraMode` を参照してください。オプションで `CameraOptions` を指定して、モードごとの詳細設定を更新することも可能です。
*   **`on<E extends PlayerEvent>(ev: E, cb: PlayerEventMap[E]): void`**
    プレイヤーイベントを購読します。イベントの種類とコールバック関数の詳細については、`Events` ページを参照してください。
*   **`destroy(): void`**
    プレイヤーインスタンスを破棄します。マップから関連する要素（マーカー、ポリライン、WebGL オーバーレイ）を削除し、アニメーションを停止し、イベントリスナーを解除します。インスタンスが不要になった場合は、必ず呼び出してください。

## 例

```typescript
const player: PlayerHandle = createPlayer(options);


document.getElementById('playButton').addEventListener('click', () => player.play());
document.getElementById('pauseButton').addEventListener('click', () => player.pause());


document.getElementById('speedSlider').addEventListener('input', (event) => {
  const speed = parseFloat((event.target as HTMLInputElement).value);
  player.setSpeed(speed);
});


player.on('frame', (payload) => {
  console.log(`Frame at progress: ${payload.progress.toFixed(2)}`);
});

player.on('finish', () => {
  console.log('Playback finished!');
});


window.addEventListener('beforeunload', () => {
  player.destroy();
});
``` 

# Overlay Methods & Properties

`GmRouteReplayOverlay` クラスのインスタンスで使用できるメソッドとプロパティ。

## メソッド

*   **`play(): void`**
    現在の位置から再生を開始または再開します。
*   **`pause(): void`**
    現在の位置で再生を一時停止します。
*   **`stop(): void`**
    再生を停止し、再生位置をルートの開始地点にリセットします。
*   **`seek(timeMs: number): void`**
    指定されたタイムスタンプ（ミリ秒単位、ルートの開始時刻からの相対時間）に再生位置を移動します。
*   **`setSpeed(speed: number): void`**
    再生速度の倍率を設定します。`1` が通常の速度、`2` が2倍速です。
*   **`setCameraMode(mode: CameraMode, options?: CameraOptions): void`**
    カメラの追従モードを設定します。詳細は [`CameraMode`](./cameraMode.md) を参照してください。オプションで `CameraOptions` を指定して、モードごとの詳細設定を更新することも可能です。
*   **`setMap(map: google.maps.Map | null): void`**
    オーバーレイを表示するマップを設定または解除します。`OverlayView` から継承された標準メソッドです。コンストラクタで `map` を指定しなかった場合に、これでマップに関連付けます。`null` を渡すとマップから削除されます。
*   **`addEventListener<K extends keyof PlayerEventMap>(type: K, listener: (ev: PlayerEventMap[K]) => any): void`**
    プレイヤーイベントを購読します。イベントの種類とペイロードについては [`Events`](./events.md) ページを参照してください。
*   **`removeEventListener<K extends keyof PlayerEventMap>(type: K, listener: (ev: PlayerEventMap[K]) => any): void`**
    登録したイベントリスナーを解除します。
*   **`destroy(): void`**
    オーバーレイインスタンスを破棄します。マップから関連する要素を削除し、アニメーションを停止し、イベントリスナーを解除します。インスタンスが不要になった場合は、`setMap(null)` を呼び出すか、このメソッドを呼び出すことを推奨します。

## プロパティ (読み取り専用)

*   **`isReady: boolean`**
    プレイヤーが初期化され、操作可能な状態かどうか。
*   **`durationMs: number`**
    ルート全体の総再生時間 (ミリ秒)。
*   **`currentTimeMs: number`**
    現在の再生時間 (ミリ秒)。
*   **`currentProgress: number`**
    現在の再生進捗 (0 から 1)。
*   **`currentSpeed: number`**
    現在の再生速度。
*   **`currentCameraMode: CameraMode`**
    現在のカメラモード。

## 例

```typescript
import { GmRouteReplayOverlay } from 'route-replay-googlemaps-core';


const overlay = new GmRouteReplayOverlay(options);
overlay.setMap(map);

overlay.addEventListener('ready', () => {

  document.getElementById('playButton').addEventListener('click', () => overlay.play());
  document.getElementById('pauseButton').addEventListener('click', () => overlay.pause());


  document.getElementById('speedSlider').addEventListener('input', (event) => {
    const speed = parseFloat((event.target as HTMLInputElement).value);
    overlay.setSpeed(speed);
  });


  overlay.addEventListener('frame', (payload) => {
    console.log(`Frame at progress: ${overlay.currentProgress.toFixed(2)}`);
  });

  overlay.addEventListener('finish', () => {
    console.log('Playback finished!');
  });
});


window.addEventListener('beforeunload', () => {
  overlay.setMap(null);
});
``` 