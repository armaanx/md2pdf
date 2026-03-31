import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  jsx: "automatic",
  banner: {
    js: "#!/usr/bin/env node"
  },
  external: [
    "playwright",
    "fsevents",
    "ink",
    "@inkjs/ui",
    "commander",
    "chokidar",
    "get-port",
    "open",
    "mime-types",
    "react",
    "react-devtools-core"
  ]
});
