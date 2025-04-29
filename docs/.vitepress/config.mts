import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Shared configs
  title: "GM Route Replay",
  base: "/gm-route-replay/",
  // Internationalization configuration
  locales: {
    // Japanese Locale
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
              { text: "React Hook サンプル", link: "/ja/examples/basic" },
              { text: "コアライブラリ使用例", link: "/ja/examples/core-basic" },
            ],
          },
          {
            text: "API リファレンス",
            items: [
              {
                text: "コアライブラリ (gm-route-replay-core)",
                collapsed: false,
                items: [
                  { text: "createPlayer", link: "/ja/api/core/createPlayer" },
                  { text: "PlayerOptions", link: "/ja/api/core/playerOptions" },
                  { text: "PlayerHandle", link: "/ja/api/core/playerHandle" },
                  { text: "RoutePoint", link: "/ja/api/core/routePoint" },
                  { text: "RouteInput", link: "/ja/api/core/routeInput" },
                  { text: "CameraMode", link: "/ja/api/core/cameraMode" },
                  { text: "Events", link: "/ja/api/core/events" },
                ],
              },
              {
                text: "React Hook (gm-route-replay-react)",
                collapsed: false,
                items: [
                  {
                    text: "useRouteReplay",
                    link: "/ja/api/react/useRouteReplay",
                  },
                ],
              },
            ],
          },
        ],
        editLink: {
          pattern:
            "https://github.com/your-repo/gm-route-replay/edit/main/docs/:path",
          text: "このページを GitHub で編集",
        },
        socialLinks: [
          // { icon: 'github', link: 'https://github.com/your-repo/gm-route-replay' }
        ],
      },
    },
    // English Locale (links already have /en/ prefix)
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
              { text: "React Hook Example", link: "/en/examples/basic" },
              { text: "Core Library Example", link: "/en/examples/core-basic" },
            ],
          },
          {
            text: "API Reference",
            items: [
              {
                text: "Core Library (gm-route-replay-core)",
                collapsed: false,
                items: [
                  { text: "createPlayer", link: "/en/api/core/createPlayer" },
                  { text: "PlayerOptions", link: "/en/api/core/playerOptions" },
                  { text: "PlayerHandle", link: "/en/api/core/playerHandle" },
                  { text: "RoutePoint", link: "/en/api/core/routePoint" },
                  { text: "RouteInput", link: "/en/api/core/routeInput" },
                  { text: "CameraMode", link: "/en/api/core/cameraMode" },
                  { text: "Events", link: "/en/api/core/events" },
                ],
              },
              {
                text: "React Hook (gm-route-replay-react)",
                collapsed: false,
                items: [
                  {
                    text: "useRouteReplay",
                    link: "/en/api/react/useRouteReplay",
                  },
                ],
              },
            ],
          },
        ],
        editLink: {
          pattern:
            "https://github.com/your-repo/gm-route-replay/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        socialLinks: [
          // { icon: 'github', link: 'https://github.com/your-repo/gm-route-replay' }
        ],
      },
    },
  },
});
