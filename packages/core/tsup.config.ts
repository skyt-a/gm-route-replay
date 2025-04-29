import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  outDir: "dist",
  target: "es2020",
  format: ["esm", "cjs"],
  splitting: false,
  sourcemap: true,
  clean: true,
  tsconfig: "./tsconfig.json",
  minify: !options.watch,
  treeshake: true,
  metafile: true,
  globalName: "GmRouteReplayCore",
  esbuildOptions(options) {
    options.define = {
      "process.env.NODE_ENV": JSON.stringify(
        options.minify ? "production" : "development"
      ),
    };
  },
}));
