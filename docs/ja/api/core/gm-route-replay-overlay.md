# GmRouteReplayOverlay クラス

ルートリプレイ機能を提供するメインクラスです。Google Maps の `OverlayView` を継承しており、マップ上にリプレイを描画・制御します。

## コンストラクタ

```typescript
import { GmRouteReplayOverlay, GmRouteReplayOverlayOptions } from 'gm-route-replay-core';

new GmRouteReplayOverlay(options: GmRouteReplayOverlayOptions);
```

## パラメータ

*   **`options`**: `GmRouteReplayOverlayOptions`
    オーバーレイの動作を設定するためのオプションオブジェクトです。詳細は [`GmRouteReplayOverlayOptions`](./overlay-options.md) のページを参照してください。

## インスタンスの取得とマップへの追加

`GmRouteReplayOverlay` のインスタンスを作成した後、Google Maps の `Map` オブジェクトの `overlayMapTypes` に追加するか、`setMap()` メソッドを使用します。

**重要:** `OverlayView` のライフサイクルに従い、`onAdd` メソッドが呼ばれた後にプレイヤーが初期化され、各種メソッドが利用可能になります。

```typescript
import { GmRouteReplayOverlay } from 'gm-route-replay-core';

const map = new google.maps.Map(document.getElementById('map'), { /* ... map options ... */ });

const routeData = [
  { lat: 35.68, lng: 139.76, t: Date.now() },
  { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
  { lat: 35.69, lng: 139.77, t: Date.now() + 20000 },
];

const replayOverlay = new GmRouteReplayOverlay({
  map: map, // map を渡す必要があります
  route: routeData,
  initialSpeed: 2,
  cameraMode: 'ahead',
  // ... other options
});

// マップにオーバーレイを追加（これにより onAdd が呼ばれ初期化される）
replayOverlay.setMap(map);

// 初期化後にメソッドを呼び出す (例: イベントリスナーや isReady() で確認後)
replayOverlay.addEventListener('ready', () => {
  console.log('Player is ready!');
  replayOverlay.play();
});

// または isReady() で確認
if (replayOverlay.isReady()) {
  replayOverlay.play();
} else {
  // まだ準備できていない場合の処理
}
```

## メソッドとプロパティ

インスタンスのメソッドやプロパティについては [`Overlay Methods & Properties`](./overlay-methods.md) を参照してください。 