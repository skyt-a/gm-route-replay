import { defineConfig } from "vitepress";

export default defineConfig({
  title: "GoogleMaps Route Replay",
  base: "/route-replay-googlemaps/",

  locales: {
    ja: {
      label: "日本語",
      lang: "ja",
      link: "/ja/",
      themeConfig: {
        nav: [
          { text: "ホーム", link: "/ja/" },
          { text: "サンプル", link: "/ja/examples/basic" },
          { text: "API リファレンス", link: "/ja/api/core/createPlayer" },
        ],
        sidebar: [
          {
            text: "サンプル",
            items: [
              { text: "React Component サンプル", link: "/ja/examples/basic" },
              { text: "コアライブラリ使用例", link: "/ja/examples/core-basic" },
            ],
          },
          {
            text: "API リファレンス",
            items: [
              {
                text: "コアライブラリ (route-replay-googlemaps-core)",
                collapsed: false,
                items: [
                  {
                    text: "GmRouteReplayOverlay",
                    link: "/ja/api/core/route-replay-googlemaps-overlay",
                  },
                  {
                    text: "OverlayOptions",
                    link: "/ja/api/core/overlay-options",
                  },
                  {
                    text: "OverlayMethods",
                    link: "/ja/api/core/overlay-methods",
                  },
                  { text: "RoutePoint", link: "/ja/api/core/routePoint" },
                  { text: "RouteInput", link: "/ja/api/core/routeInput" },
                  { text: "CameraMode", link: "/ja/api/core/cameraMode" },
                  { text: "Events", link: "/ja/api/core/events" },
                ],
              },
              {
                text: "React Component (route-replay-googlemaps-react)",
                collapsed: false,
                items: [
                  {
                    text: "RouteReplay Component",
                    link: "/ja/api/react/route-replay-component",
                  },
                  {
                    text: "RouteReplay Handle",
                    link: "/ja/api/react/route-replay-handle",
                  },
                ],
              },
            ],
          },
        ],
        editLink: {
          pattern:
            "https://github.com/your-repo/route-replay-googlemaps/edit/main/docs/:path",
          text: "このページを GitHub で編集",
        },
        socialLinks: [],
      },
    },

    en: {
      label: "English",
      lang: "en",
      link: "/en/",
      themeConfig: {
        nav: [
          { text: "Home", link: "/en/" },
          { text: "Examples", link: "/en/examples/basic" },
          { text: "API Reference", link: "/en/api/core/createPlayer" },
        ],
        sidebar: [
          {
            text: "Examples",
            items: [
              { text: "React Component Example", link: "/en/examples/basic" },
              { text: "Core Library Example", link: "/en/examples/core-basic" },
            ],
          },
          {
            text: "API Reference",
            items: [
              {
                text: "Core Library (route-replay-googlemaps-core)",
                collapsed: false,
                items: [
                  {
                    text: "GmRouteReplayOverlay",
                    link: "/en/api/core/route-replay-googlemaps-overlay",
                  },
                  {
                    text: "OverlayOptions",
                    link: "/en/api/core/overlay-options",
                  },
                  {
                    text: "OverlayMethods",
                    link: "/en/api/core/overlay-methods",
                  },
                  { text: "RoutePoint", link: "/en/api/core/routePoint" },
                  { text: "RouteInput", link: "/en/api/core/routeInput" },
                  { text: "CameraMode", link: "/en/api/core/cameraMode" },
                  { text: "Events", link: "/en/api/core/events" },
                ],
              },
              {
                text: "React Component (route-replay-googlemaps-react)",
                collapsed: false,
                items: [
                  {
                    text: "RouteReplay Component",
                    link: "/en/api/react/route-replay-component",
                  },
                  {
                    text: "RouteReplay Handle",
                    link: "/en/api/react/route-replay-handle",
                  },
                ],
              },
            ],
          },
        ],
        editLink: {
          pattern:
            "https://github.com/your-repo/route-replay-googlemaps/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        socialLinks: [],
      },
    },
  },
});
