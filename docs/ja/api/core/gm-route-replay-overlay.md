# GmRouteReplayOverlay クラス

ルートリプレイ機能を提供するメインクラスです。Google Maps の `OverlayView` を継承しており、マップ上にリプレイを描画・制御します。

## コンストラクタ

```typescript
import { GmRouteReplayOverlay, GmRouteReplayOverlayOptions } from 'route-replay-googlemaps-core';

new GmRouteReplayOverlay(options: GmRouteReplayOverlayOptions);
```

## パラメータ

*   **`options`**: `GmRouteReplayOverlayOptions`
    オーバーレイの動作を設定するためのオプションオブジェクトです。詳細は [`GmRouteReplayOverlayOptions`](./overlay-options.md) のページを参照してください。

## インスタンスの取得とマップへの追加

`GmRouteReplayOverlay` のインスタンスを作成した後、Google Maps の `Map` オブジェクトの `overlayMapTypes` に追加するか、`setMap()` メソッドを使用します。

**重要:** `OverlayView` のライフサイクルに従い、`onAdd` メソッドが呼ばれた後にプレイヤーが初期化され、各種メソッドが利用可能になります。

```typescript
import { GmRouteReplayOverlay } from 'route-replay-googlemaps-core';

const map = new google.maps.Map(document.getElementById('map'), { /* ... map options ... */ });

const routeData = [
  { lat: 35.68, lng: 139.76, t: Date.now() },
  { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
  { lat: 35.69, lng: 139.77, t: Date.now() + 20000 },
];

const replayOverlay = new GmRouteReplayOverlay({
  map: map,
  route: routeData,
  initialSpeed: 2,
  cameraMode: 'ahead',

});


replayOverlay.setMap(map);


replayOverlay.addEventListener('ready', () => {
  console.log('Player is ready!');
  replayOverlay.play();
});


if (replayOverlay.isReady()) {
  replayOverlay.play();
} else {

}
```

## メソッドとプロパティ

インスタンスのメソッドやプロパティについては [`Overlay Methods & Properties`](./overlay-methods.md) を参照してください。 