# Events

プレイヤーインスタンスは、再生状態の変化や進行状況に応じてイベントを発行します。これらのイベントは `PlayerHandle` の `on` メソッドを使用して購読できます。

## イベントの種類 (`PlayerEvent`)

利用可能なイベント名の型です。

```typescript
type PlayerEvent =
  | "start"
  | "frame"
  | "pause"
  | "seek"
  | "finish"
  | "error";
```

## イベントペイロード (`PlayerEventMap`)

各イベントに対応するコールバック関数とそのペイロード（引数）の型定義です。

```typescript
interface PlayerEventMap {
  start: () => void;
  frame: (payload: {
    trackId: string | number; // Multi-track の場合は trackId, Single-track の場合は 0 (仮)
    pos: google.maps.LatLngLiteral;
    heading?: number;
    progress: number; // 全体の進行度 (0.0 ~ 1.0)
  }) => void;
  pause: () => void;
  seek: (payload: { timeMs: number }) => void; // シーク先の時間 (ms)
  finish: () => void;
  error: (payload: { error: Error }) => void;
}
```

## 各イベントの説明

*   **`start`**: 再生が開始されたとき（`play` が呼び出され、実際に再生が始まったとき）に発行されます。
*   **`frame`**: アニメーションの各フレームが描画される直前に発行されます。ペイロードには現在のトラックID、位置、方位（利用可能な場合）、全体の進行度が含まれます。
*   **`pause`**: 再生が一時停止されたとき（`pause` が呼び出されたとき）に発行されます。
*   **`seek`**: 再生位置が変更されたとき（`seek` が呼び出されたとき）に発行されます。ペイロードにはシーク先の時間（ルート開始からのミリ秒）が含まれます。
*   **`finish`**: ルートの最後まで再生が完了したときに発行されます。
*   **`error`**: 処理中にエラーが発生したときに発行されます。ペイロードにはエラーオブジェクトが含まれます。

## イベントの購読例

```typescript
const player = createPlayer(options);

player.on('start', () => {
  console.log('Playback started');
  // UI の状態を更新するなど
});

player.on('frame', ({ trackId, pos, progress }) => {
  // 現在位置や進行度を表示するなど
  document.getElementById('progressBar').style.width = `${progress * 100}%`;
  // Multi-track の場合は trackId も利用可能
  console.log(`Track ${trackId} is at ${pos.lat}, ${pos.lng}`);
});

player.on('finish', () => {
  console.log('Playback finished');
  // 再生ボタンを再度有効にするなど
});

player.on('error', ({ error }) => {
  console.error('Player error:', error);
  // エラーメッセージを表示するなど
});
``` 