import { join } from "node:path";
import * as esbuild from "esbuild";

//
// Builds config sources for Genstack.
//

const enableCjs = true;
const enableEsm = true;

const outDir = "dist";
const outPath = join(process.cwd(), outDir);

console.info(`Building config to ${outPath}`);

const baseConfig: esbuild.BuildOptions = {
  bundle: true,
  splitting: false,
  outbase: outPath,
  platform: "neutral",
  format: "esm",
};

async function build(name: string, cfg: Partial<esbuild.BuildOptions> = {}) {
  console.info(`Building target '${name}'...`);
  await esbuild.build({
    ...baseConfig,
    ...cfg,
  });
}

function src(name: string): string {
  return join(process.cwd(), "src", "typescript", name);
}

function out(name: string): string {
  return join(outPath, name);
}

if (enableCjs)
  await build("neutral-cjs", {
    entryPoints: [src("index.mts")],
    outfile: out("neutral.cjs"),
    format: "cjs",
  });

if (enableEsm)
  await build("neutral-esm", {
    entryPoints: [src("index.mts")],
    outfile: out("neutral.mjs"),
  });

console.info("Config JS/TS packages ready.");
