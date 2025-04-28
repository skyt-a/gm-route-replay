/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true, // describe, it などをグローバルに利用可能にする
    environment: "jsdom", // DOM 環境のモック
    // setupFiles: ['./vitest.setup.ts'], // 必要に応じて後で追加
  },
});
