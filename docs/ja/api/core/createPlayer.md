# createPlayer()

`createPlayer` 関数は、ルートリプレイ機能のメインエントリーポイントであり、新しいプレイヤーインスタンスを初期化して返します。

## シグネチャ

```typescript
import { PlayerOptions, PlayerHandle } from '@gm/route-replay-core';

function createPlayer(options: PlayerOptions): PlayerHandle;
```

## パラメータ

*   **`options`**: `PlayerOptions`
    プレイヤーの動作を設定するためのオプションオブジェクトです。詳細は `PlayerOptions` のページを参照してください。

## 戻り値

*   **`PlayerHandle`**
    プレイヤーを制御するためのメソッド（再生、一時停止、シークなど）とイベントリスナーを登録するためのメソッド (`on`) を持つオブジェクトです。詳細は `PlayerHandle` のページを参照してください。

## 使用例

```typescript
import { createPlayer } from '@gm/route-replay-core';

const map = new google.maps.Map(document.getElementById('map'), { /* ... map options ... */ });

const routeData = [
  { lat: 35.68, lng: 139.76, t: Date.now() },
  { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
  { lat: 35.69, lng: 139.77, t: Date.now() + 20000 },
];

const player = createPlayer({
  map: map,
  route: routeData,
  initialSpeed: 2,
  cameraMode: 'ahead',
  rendererType: 'webgl', // Recommended for performance
  // ... other options
});

// 再生開始
player.play();
``` 