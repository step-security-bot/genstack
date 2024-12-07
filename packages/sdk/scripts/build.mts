import { join } from "node:path";
import * as esbuild from "esbuild";

//
// Builds the JavaScript SDK for Genstack.
//

const enableCjs = true;
const enableEsm = true;
const enableNodeBundle = true;
const enableNeutralBundle = true;

const outDir = "dist";
const outPath = join(process.cwd(), "dist");

console.info(`Building JS SDK to ${outPath}`);

const baseConfig: esbuild.BuildOptions = {
  bundle: true,
  splitting: false,
  outbase: outPath,
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

if (enableNodeBundle) {
  if (enableCjs)
    await build("node-cjs", {
      entryPoints: [src("index.mts")],
      outfile: out("sdk.node.cjs"),
    });

  if (enableEsm)
    await build("node-esm", {
      entryPoints: [src("index.mts")],
      outfile: out("sdk.node.mjs"),
    });
}

if (enableNeutralBundle) {
  if (enableCjs)
    await build("neutral-cjs", {
      entryPoints: [src("index.mts")],
      outfile: out("sdk.neutral.cjs"),
    });

  if (enableEsm)
    await build("neutral-esm", {
      entryPoints: [src("index.mts")],
      outfile: out("sdk.neutral.mjs"),
    });
}
