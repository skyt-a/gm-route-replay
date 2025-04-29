# GmRouteReplayOverlayOptions

`GmRouteReplayOverlay` クラスのコンストラクタに渡す設定オプションを定義するインターフェースです。

## プロパティ

*   **`map`**: `google.maps.Map` (必須)
    ルートリプレイを表示する Google Maps のインスタンス。
*   **`route`**: `RouteInput` (必須)
    再生するルートデータ。詳細は [`RouteInput`](./routeInput.md) を参照してください。
*   **`fps?`**: `60 | 30` (オプション, デフォルト: `60`)
    アニメーションの目標フレームレート（1秒あたりの描画回数）。
*   **`initialSpeed?`**: `number` (オプション, デフォルト: `1`)
    初期の再生速度の倍率。
*   **`autoFit?`**: `boolean` (オプション, デフォルト: `true`)
    ロード時に地図の表示領域をルート全体に自動的に合わせるかどうか。
*   **`markerOptions?`**: `google.maps.MarkerOptions | ((trackId: string) => google.maps.MarkerOptions)` (オプション)
    ルート上の現在位置を示すマーカーの表示オプション。または、トラックIDごとにオプションを返す関数。
*   **`polylineOptions?`**: `google.maps.PolylineOptions | ((trackId: string) => google.maps.PolylineOptions)` (オプション)
    通過した軌跡を示すポリラインの表示オプション。指定しない場合、ポリラインは表示されません。または、トラックIDごとにオプションを返す関数。
*   **`interpolation?`**: `'linear' | 'spline'` (オプション, デフォルト: `'linear'`)
    ルートポイント間の補間方法。(現状 `'linear'` のみサポート)
*   **`plugins?`**: `Plugin[]` (オプション)
    プレイヤーの機能を拡張するためのプラグインの配列。
*   **`cameraMode?`**: `CameraMode` (オプション, デフォルト: `'center'`)
    カメラの追従モード。詳細は [`CameraMode`](./cameraMode.md) を参照してください。
*   **`cameraOptions?`**: `CameraOptions` (オプション)
    特定のカメラモード（特に `'ahead'`）の詳細設定。
    *   `aheadDistance?`: `number` (デフォルト: `100`) - `'ahead'` モードで何メートル先を見るか。
    *   `defaultTilt?`: `number` (デフォルト: `45`) - `'ahead'` モードでのデフォルトの傾斜角度。
    *   `zoomLevel?`: `number` - カメラモードでの固定ズームレベル。設定すると `autoFit` によるズーム調整を上書きします。
*   **`loop?`**: `boolean` (オプション, デフォルト: `false`)
    再生をループするかどうか。
*   **`defaultMarkerIcon?`**: `string | google.maps.Icon | google.maps.Symbol` (オプション)
    `markerOptions` で個別に指定されていない場合の、デフォルトのマーカーアイコン。

## 例

```typescript
import { GmRouteReplayOverlay } from 'gm-route-replay-core';

const options: GmRouteReplayOverlayOptions = {
  map: mapInstance,
  route: multiTrackRouteData,
  initialSpeed: 1.5,
  autoFit: true,
  polylineOptions: {
    strokeColor: '#00FFFF',
    strokeWeight: 3,
  },
  cameraMode: 'ahead',
  cameraOptions: {
    aheadDistance: 150,
    defaultTilt: 60,
    zoomLevel: 17
  },
  markerOptions: (trackId) => ({
    icon: trackId === 'truck' ? './truck.png' : './car.png'
  }),
};

const overlay = new GmRouteReplayOverlay(options);
overlay.setMap(mapInstance);
``` 