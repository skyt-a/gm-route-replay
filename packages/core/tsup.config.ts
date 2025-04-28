import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"], // Explicit entry point
  outDir: "dist",
  target: "es2020",
  format: ["esm", "cjs"], // Removed 'umd' temporarily
  splitting: false,
  sourcemap: true,
  clean: true,
  tsconfig: "./tsconfig.json", // Explicitly specify the tsconfig file
  minify: !options.watch,
  treeshake: true,
  metafile: true, // Keep metafile for core/react
  globalName: "GmRouteReplayCore", // Assign appropriate globalName
  esbuildOptions(options) {
    options.define = {
      "process.env.NODE_ENV": JSON.stringify(
        options.minify ? "production" : "development"
      ),
    };
  },
}));
