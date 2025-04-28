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

// 再生・一時停止ボタン
document.getElementById('playButton').addEventListener('click', () => player.play());
document.getElementById('pauseButton').addEventListener('click', () => player.pause());

// スピード変更スライダー
document.getElementById('speedSlider').addEventListener('input', (event) => {
  const speed = parseFloat((event.target as HTMLInputElement).value);
  player.setSpeed(speed);
});

// イベントの購読
player.on('frame', (payload) => {
  console.log(`Frame at progress: ${payload.progress.toFixed(2)}`);
});

player.on('finish', () => {
  console.log('Playback finished!');
});

// クリーンアップ
window.addEventListener('beforeunload', () => {
  player.destroy();
});
``` 