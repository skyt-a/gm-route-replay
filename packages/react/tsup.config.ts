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
  external: ["react", "route-replay-googlemaps-core"],
  minify: !options.watch,
  treeshake: true,
  metafile: true,
  globalName: "GmRouteReplayReact",
  esbuildOptions(options) {
    options.define = {
      "process.env.NODE_ENV": JSON.stringify(
        options.minify ? "production" : "development"
      ),
    };
  },
}));
