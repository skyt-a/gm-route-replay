# RoutePoint

ルート上の単一の地点を表すインターフェースです。

## プロパティ

*   **`lat`**: `number` (必須)
    地点の緯度（度単位）。
*   **`lng`**: `number` (必須)
    地点の経度（度単位）。
*   **`t`**: `number` (必須)
    地点のタイムスタンプ（Unixミリ秒）。ルート内の他のポイントとの相対的な時間関係を定義します。
*   **`heading?`**: `number` (オプション)
    地点での方位（度単位、0-360）。指定されない場合、次のポイントへの方向から計算されることがあります。
*   **`elev?`**: `number` (オプション)
    地点の標高（メートル単位）。現在は使用されていません。

## 例

```typescript
const point1: RoutePoint = {
  lat: 35.681236,
  lng: 139.767125,
  t: 1678886400000,
  heading: 90,
};

const point2: RoutePoint = {
  lat: 35.681236,
  lng: 139.777125,
  t: 1678886460000,

};
``` 