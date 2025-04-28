# RouteInput

`PlayerOptions` の `route` プロパティに指定できるルートデータの型定義です。以下のいずれかの形式を受け付けます。

## 型定義

```typescript
import { RoutePoint } from './types';

type RouteInput =
  | RoutePoint[] // 単一ルート
  | { [trackId: string]: RoutePoint[] } // 複数ルート (Multi-track)
  | string; // ルートデータを含むURL (現在未実装)
```

## 形式

1.  **単一ルート**: `RoutePoint[]`
    `RoutePoint` オブジェクトの配列。単一の移動体を表現します。
    ```typescript
    const singleRoute: RouteInput = [
      { lat: 35.68, lng: 139.76, t: 1678886400000 },
      { lat: 35.68, lng: 139.77, t: 1678886460000 },
    ];
    ```

2.  **複数ルート (Multi-track)**: `{ [trackId: string]: RoutePoint[] }`
    キーがトラックID（任意の文字列）、値がそのトラックの `RoutePoint` 配列であるオブジェクト。複数の移動体を同時に表現できます。
    ```typescript
    const multiTrackRoute: RouteInput = {
      car1: [
        { lat: 35.68, lng: 139.76, t: 1678886400000 },
        { lat: 35.68, lng: 139.77, t: 1678886460000 },
      ],
      bikeA: [
        { lat: 35.685, lng: 139.765, t: 1678886410000 },
        { lat: 35.685, lng: 139.775, t: 1678886450000 },
      ],
    };
    ```

3.  **URL**: `string`
    ルートデータ（例: GeoJSON LineString with times）を取得できるURL。（現在未実装） 