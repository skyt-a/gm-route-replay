# GM Route Replay

[![Deploy VitePress Docs to GitHub Pages](https://github.com/skyt-a/gm-route-replay/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/skyt-a/gm-route-replay/actions/workflows/deploy-docs.yml)

Google Maps 上で時間情報付きのルートデータを再生するためのライブラリです。
WebGLOverlayView を利用した高パフォーマンスなレンダリングと、複数のトラック（移動体）の同時再生をサポートします。

## ドキュメント

詳細な API リファレンスと使用例については、以下のドキュメントサイトを参照してください。

**[GM Route Replay Documentation](https://skyt-a.github.io/gm-route-replay/ja/)**

## 特徴

*   **選べるレンダラー:** 
    *   デフォルト: 標準の `google.maps.Marker` を使用し、シンプルに利用可能。
    *   オプション: 大量のマーカー描画に `google.maps.WebGLOverlayView` を使用し、高パフォーマンスを実現。
*   **Multi-track:** 複数のルートデータを同時に再生
*   **柔軟なカメラ制御:** 固定、追従、進行方向前方など、複数のカメラモード
*   **シンプルな API:** コアライブラリと React Hook を提供
*   **TypeScript:** 型定義による安全な開発

## インストール

```bash
# コアライブラリ
pnpm add @gm/route-replay-core

# React Hook (React を使用する場合)
pnpm add @gm/route-replay-react
```

## 基本的な使い方 (React Hook)

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useRouteReplay } from '@gm/route-replay-react';
import type { RouteInput } from '@gm/route-replay-core';

function MapComponent() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);
  const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key
  const mapId = 'YOUR_MAP_ID'; // Optional: Required for WebGL renderer

  // Load Google Maps API
  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.load().then(() => setIsMapApiLoaded(true));
  }, [apiKey]);

  const routeData: RouteInput = [
    { lat: 35.68, lng: 139.76, t: Date.now() },
    { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },
    // ... more points
  ];

  const { state, controls } = useRouteReplay({
    mapContainerRef,
    isMapApiLoaded,
    route: routeData,
    rendererType: 'webgl',
    mapId: mapId,
  });

  return (
    <div>
      <div ref={mapContainerRef} style={{ height: '400px', width: '100%' }} />
      <button onClick={controls.play} disabled={!isMapApiLoaded || state.isPlaying}>
        Play
      </button>
      <button onClick={controls.pause} disabled={!isMapApiLoaded || !state.isPlaying}>
        Pause
      </button>
      {/* Add more controls as needed */}
    </div>
  );
}
```

## 開発

1.  **リポジトリをクローン:**
    ```bash
    git clone https://github.com/skyt-a/gm-route-replay.git
    cd gm-route-replay
    ```
2.  **依存関係をインストール:**
    ```bash
    pnpm install
    ```
3.  **開発サーバーを起動:**
    ```bash
    # パッケージ全体のビルド/ウォッチ
    pnpm dev

    # ドキュメントサイトの開発サーバー
    pnpm docs:dev

    # React サンプルの開発サーバー (examples/react-vite)
    cd examples/react-vite
    # .env ファイルに API キーを設定
    cp .env.example .env
    # サーバー起動
    pnpm dev
    ```

## ライセンス

[ISC](./LICENSE) (package.json に基づく - 必要であれば LICENSE ファイルを作成してください)
