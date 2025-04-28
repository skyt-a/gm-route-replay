# CameraMode

プレイヤーのカメラが地図上のマーカー（現在位置）をどのように追従するかを指定するモードです。

## 型定義

```typescript
 type CameraMode = "center" | "ahead" | "none";
```

## モード

*   **`'center'`** (デフォルト)
    常にマーカーが地図の中心に来るようにカメラを移動します。視点は真上から固定です。
*   **`'ahead'`**
    マーカーの進行方向前方を見るように、傾斜（tilt）と回転（heading）をつけてカメラを追従させます。よりダイナミックな視点を提供します。
    詳細な挙動は `PlayerOptions` の `cameraOptions` で調整できます。
*   **`'none'`**
    カメラは自動的に追従しません。ユーザーが手動で地図を操作する必要があります。

## 設定方法

`PlayerOptions` で初期値を設定するか、`PlayerHandle` の `setCameraMode` メソッドで動的に変更します。

```typescript
// 初期設定
const player = createPlayer({
  map: map,
  route: routeData,
  cameraMode: 'ahead',
  cameraOptions: { aheadDistance: 120, defaultTilt: 50 }
});

// 動的な変更
player.setCameraMode('center');
``` 