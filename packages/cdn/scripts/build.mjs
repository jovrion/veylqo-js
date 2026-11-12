import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const entry = resolve(pkgRoot, "src/index.js");
const outDir = resolve(pkgRoot, "dist");

await mkdir(outDir, { recursive: true });

await Promise.all([
  build({
    entryPoints: [entry],
    outfile: resolve(outDir, "veylqo-cdn.esm.js"),
    bundle: true,
    format: "esm",
    target: ["es2022"],
    platform: "browser",
    minify: true,
  }),
  build({
    entryPoints: [entry],
    outfile: resolve(outDir, "veylqo-cdn.iife.js"),
    bundle: true,
    format: "iife",
    globalName: "Veylqo",
    target: ["es2022"],
    platform: "browser",
    minify: true,
  }),
]);
