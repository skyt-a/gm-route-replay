# コアライブラリ使用例

このページは、React を使わずに、コアライブラリ `route-replay-googlemaps-core` を直接使用する基本的な例を示します。

## HTML の準備

マップと操作ボタンを配置するための基本的な HTML ファイルが必要です。

```html
<!DOCTYPE html>
<html>
<head>
    <title>GoogleMaps Route Replay Core Example</title>
    <style>
        #map { height: 400px; width: 100%; }
        button { margin: 5px; }
    </style>
</head>
<body>
    <h1>コアライブラリ使用例</h1>
    <div id="map"></div>
    <div>
        <button id="playBtn">再生</button>
        <button id="pauseBtn">一時停止</button>
        <button id="stopBtn">停止</button>
        <!-- 必要に応じてシークバーや速度調整などのコントロールを追加 -->
    </div>

    <!-- YOUR_GOOGLE_MAPS_API_KEY を置き換えてください -->
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap&libraries=geometry&v=weekly" defer></script>
    
    <!-- バンドルされた JavaScript ファイルを読み込みます -->
    <!-- Vite, Webpack, esbuild などのバンドラでこの JS を処理するようにしてください -->
    <script type="module" src="./core-example.js"></script> 
</body>
</html>
```

## JavaScript の実装

マップとプレイヤーを初期化するための JavaScript ファイル（例: `core-example.js`）を作成します。

```javascript
import { createPlayer } from 'route-replay-googlemaps-core';

let map;
let player;


function initMap() {
  console.log('マップを初期化中...');
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.68, lng: 139.76 },
    zoom: 14,
    mapId: 'YOUR_MAP_ID' // オプション: rendererType: 'webgl' を使う場合に必要
  });


  const startTime = Date.now();
  const routeData = [
    { lat: 35.680, lng: 139.760, t: startTime },
    { lat: 35.680, lng: 139.770, t: startTime + 10000, heading: 90 },
    { lat: 35.685, lng: 139.770, t: startTime + 20000, heading: 0 },  // 北へ
    { lat: 35.685, lng: 139.760, t: startTime + 30000, heading: 270 },// 西へ
    { lat: 35.680, lng: 139.760, t: startTime + 40000, heading: 180 },// 南へ (スタート地点に戻る)
  ];

  console.log('プレイヤーを作成中...');
  try {
    player = createPlayer({
      map: map,
      route: routeData,
      autoFit: true,          // ルートに合わせて自動で地図範囲を調整
      initialSpeed: 1,        // 通常の再生速度


      cameraMode: 'center',   // マーカーを中央に保つ
      polylineOptions: {      // 軌跡を描画する
        strokeColor: '#0000FF',
        strokeWeight: 3,
      },
      markerOptions: {        // マーカーをカスタマイズ (オプション)

      }
    });


    document.getElementById('playBtn')?.addEventListener('click', () => player?.play());
    document.getElementById('pauseBtn')?.addEventListener('click', () => player?.pause());
    document.getElementById('stopBtn')?.addEventListener('click', () => player?.stop());

    console.log('プレイヤーが正常に作成されました:', player);


    player.on('frame', (payload) => {

    });
    player.on('finish', () => {
      console.log('再生が完了しました！');
    });

  } catch (error) {
    console.error('プレイヤーの作成に失敗しました:', error);
    alert('ルートリプレイの初期化に失敗しました: ' + error.message);
  }
}


window.initMap = initMap;
```

**重要:**

*   `YOUR_GOOGLE_MAPS_API_KEY` と（WebGL を使用する場合）`YOUR_MAP_ID` を実際の認証情報に置き換えてください。
*   `import` を使用する JavaScript コードをバンドルするためには、ビルドツール（Vite, esbuild, Rollup, Webpack など）が必要です。または、将来的にライブラリが UMD ビルドを提供する場合は、それに合わせてコードを調整してください。 