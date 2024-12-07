import { join } from "node:path";
import { $ } from "bun";
import * as esbuild from "esbuild";

//
// Builds protocol sources for Genstack.
//

const enableCjs = true;
const enableEsm = true;
const enableNodeBundle = true;
const enableNeutralBundle = true;

const outDir = "dist";
const outPath = join(process.cwd(), outDir);

console.info(`Building protocol to ${outPath}`);

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
  if (enableEsm)
    await build("node-esm", {
      entryPoints: [src("index.mts")],
      outfile: out("node.mjs"),
    });
}

if (enableNeutralBundle) {
  if (enableCjs)
    await build("neutral-cjs", {
      entryPoints: [src("index.mts")],
      outfile: out("neutral.cjs"),
    });

  if (enableEsm)
    await build("neutral-esm", {
      entryPoints: [src("index.mts")],
      outfile: out("neutral.mjs"),
    });
}

await $`mkdir -p ./dist/gen`;
await $`cp -fr ./gen/proto/* ./dist/gen/`;
await $`cp -fr ./gen/grpc/* ./dist/gen/`;
await $`find ./dist -name "*.kt" -delete`;
await $`find ./dist -name "*.java" -delete`;
await $`find ./dist -type d -empty -delete`;

console.info("Protocol JS/TS packages ready.");
