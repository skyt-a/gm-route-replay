import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [
      "packages/core/src/setupTests.ts",
      "packages/react/setupTests.ts",
    ],
  },
});
