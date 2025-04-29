import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe, it などをグローバルに使えるようにする
    environment: "jsdom", // DOM API を使うテストのため (OverlayView など)
    setupFiles: ["./src/setupTests.ts"], // モックなどのセットアップファイル (後で作成)
    coverage: {
      provider: "v8", // or 'istanbul'
      reporter: ["text", "json", "html"],
    },
  },
});
