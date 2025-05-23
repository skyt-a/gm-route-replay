[English](./README.md) | **日本語**

# GoogleMaps Route Replay

[![Deploy VitePress Docs to GitHub Pages](https://github.com/skyt-a/route-replay-googlemaps/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/skyt-a/route-replay-googlemaps/actions/workflows/deploy-docs.yml)

Google Maps 上で時間情報付きのルートデータを再生するためのライブラリです。

https://github.com/user-attachments/assets/c024a0e5-4d4a-43f5-88bc-e8c5e16e4110

デモ: https://gm-route-replay-react-vite.vercel.app

## ドキュメント

詳細な API リファレンスと使用例については、以下のドキュメントサイトを参照してください。

**[GoogleMaps Route Replay Documentation](https://skyt-a.github.io/route-replay-googlemaps/ja/)**

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
npm install route-replay-googlemaps-core
yarn add route-replay-googlemaps-core
pnpm add route-replay-googlemaps-core

# React Hook (React を使用する場合)
npm install route-replay-googlemaps-react
yarn add route-replay-googlemaps-react
pnpm add route-replay-googlemaps-react
```

## 基本的な使い方 (React Component)

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Loader } from "@googlemaps/js-api-loader";
import { RouteReplay, RouteReplayHandle } from "route-replay-googlemaps-react";
import type { RouteInput } from 'route-replay-googlemaps-core';

function MapComponent() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const replayHandleRef = useRef<RouteReplayHandle>(null);
  const apiKey = 'あなたのGoogle Maps APIキー';
  const mapId = 'あなたのMap ID';


  useEffect(() => {
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps'] });
    loader.importLibrary("maps").then((google) => {
      const map = new google.Map(document.getElementById("map")!, {
        center: { lat: 35.68, lng: 139.76 },
        zoom: 15,
        mapId: mapId,
      });
      setMapInstance(map);
    });
  }, [apiKey]);

  const routeData: RouteInput = [
    { lat: 35.68, lng: 139.76, t: Date.now() },
    { lat: 35.68, lng: 139.77, t: Date.now() + 10000 },

  ];

  return (
    <div>
      <div id="map" style={{ height: '400px', width: '100%' }} />
      {mapInstance && (
        <RouteReplay
          ref={replayHandleRef}
          map={mapInstance}
          route={routeData}
          autoFit={true}
        />
      )}
      <button onClick={() => replayHandleRef.current?.play()} disabled={!mapInstance}>
        再生
      </button>
      <button onClick={() => replayHandleRef.current?.pause()} disabled={!mapInstance}>
        一時停止
      </button>
    </div>
  );
}
```

## 基本的な使い方 (コアライブラリ)

React を使用しない場合は、コアライブラリを直接利用できます。

```html
<!DOCTYPE html>
<html>
<head>
    <title>GoogleMaps Route Replay Core Example</title>
    <style>
        #map { height: 400px; width: 100%; }
    </style>
</head>
<body>
    <h1>GoogleMaps Route Replay Core Example</h1>
    <div id="map"></div>
    <button id="playBtn">Play</button>
    <button id="pauseBtn">Pause</button>
    <!-- Replace YOUR_GOOGLE_MAPS_API_KEY -->
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap&libraries=geometry&v=weekly" defer></script>
    <!-- Load your bundled script that includes the code below -->
    <script type="module" src="./core-example.js"></script> 
</body>
</html>
```

```javascript: core-example.js
import { GmRouteReplayOverlay } from 'route-replay-googlemaps-core';

let map;
let replayOverlay;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.68, lng: 139.76 },
    zoom: 14,
    mapId: 'YOUR_MAP_ID'
  });

  const routeData = [
    { lat: 35.680, lng: 139.760, t: Date.now() },
    { lat: 35.680, lng: 139.770, t: Date.now() + 10000, heading: 90 },
    { lat: 35.685, lng: 139.770, t: Date.now() + 20000, heading: 0 },
    { lat: 35.685, lng: 139.760, t: Date.now() + 30000, heading: 270 },
    { lat: 35.680, lng: 139.760, t: Date.now() + 40000, heading: 180 },
  ];

  replayOverlay = new GmRouteReplayOverlay({
    map: map,
    route: routeData,
    autoFit: true,
  });


  replayOverlay.setMap(map);


  replayOverlay.addEventListener('ready', () => {
    document.getElementById('playBtn')?.addEventListener('click', () => replayOverlay?.play());
    document.getElementById('pauseBtn')?.addEventListener('click', () => replayOverlay?.pause());
  });
}

window.initMap = initMap;
```

## ライセンス

[ISC](./LICENSE)
