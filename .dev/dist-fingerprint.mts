import { $, BunFile } from "bun";
import { join, basename } from "node:path";
import { stat } from "node:fs/promises";
import pkgInfo from "../package.json";

const releaseInfo = "release-info.json";

enum Tool {
  MD5SUM = "MD5SUM",
  SHA1SUM = "SHA1SUM",
  SHA256SUM = "SHA256SUM",
  SHA512SUM = "SHA512SUM",
}

enum Platform {
  LINUX_AMD64 = "linux-amd64",
  LINUX_ARM64 = "linux-arm64",
  MACOS_AMD64 = "macos-amd64",
  MACOS_ARM64 = "macos-arm64",
  WINDOWS_AMD64 = "windows-amd64",
  WINDOWS_ARM64 = "windows-arm64",
}

type ToolInfo = {
  tool: Tool;
  path: string;
};

type FileInfo = {
  path: string;
  file: BunFile;
};

type ToolConfig = Record<Tool, ToolInfo | undefined>;

type ArtifactFingerprints = {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
};

type ArtifactInfo = {
  path: string;
  platform: Platform;
  fingerprints: ArtifactFingerprints;
};

type AllArtifacts = Record<string, ArtifactInfo>;

type ReleaseManifest = {
  version: string;
  platforms: Platform[];
  artifacts: AllArtifacts;
};

type SLSASpec = {
  files: string[];
  checksum: string;
};

const toolsCache: Partial<ToolConfig> = {};

async function resolveTool(tool: Tool): Promise<ToolInfo> {
  const envPath = process.env[tool];
  if (envPath) {
    return { tool, path: envPath };
  }
  return { tool, path: tool.toLowerCase() };
}

function hashlockPath(artifact: FileInfo, type: Tool): string {
  const base = artifact.path;
  switch (type) {
    case Tool.MD5SUM:
      return `${base}.md5`;
    case Tool.SHA1SUM:
      return `${base}.sha1`;
    case Tool.SHA256SUM:
      return `${base}.sha256`;
    case Tool.SHA512SUM:
      return `${base}.sha512`;
  }
}

async function detectPlatform(artifact: FileInfo): Promise<Platform> {
  if (
    artifact.path.includes("linux") ||
    artifact.path.includes("deb") ||
    artifact.path.includes("rpm")
  ) {
    if (
      artifact.path.includes("x64") ||
      artifact.path.includes("x86") ||
      artifact.path.includes("amd64")
    ) {
      return Platform.LINUX_AMD64;
    }
    if (artifact.path.includes("arm64") || artifact.path.includes("aarch64")) {
      return Platform.LINUX_ARM64;
    }
    // linux defaults to `amd64`
    return Platform.LINUX_AMD64;
  } else if (
    artifact.path.includes("mac") ||
    artifact.path.includes("darwin") ||
    artifact.path.includes("dmg")
  ) {
    if (
      artifact.path.includes("x64") ||
      artifact.path.includes("x86") ||
      artifact.path.includes("amd64")
    ) {
      return Platform.MACOS_AMD64;
    }
    if (artifact.path.includes("arm64") || artifact.path.includes("aarch64")) {
      return Platform.MACOS_ARM64;
    }
    // macos defaults to `arm64`
    return Platform.MACOS_ARM64;
  } else if (
    artifact.path.includes("win") ||
    artifact.path.includes("msi") ||
    artifact.path.includes("exe")
  ) {
    if (
      artifact.path.includes("x64") ||
      artifact.path.includes("x86") ||
      artifact.path.includes("amd64")
    ) {
      return Platform.WINDOWS_AMD64;
    }
    if (artifact.path.includes("arm64") || artifact.path.includes("aarch64")) {
      return Platform.WINDOWS_ARM64;
    }
    // windows defaults to `amd64`
    return Platform.WINDOWS_AMD64;
  }
  throw new Error(`Failed to determine platform for path: '${artifact.path}'`);
}

function fingerprintType(type: Tool): keyof ArtifactFingerprints {
  switch (type) {
    case Tool.MD5SUM:
      return "md5";
    case Tool.SHA1SUM:
      return "sha1";
    case Tool.SHA256SUM:
      return "sha256";
    case Tool.SHA512SUM:
      return "sha512";
  }
}

class DistOptions {
  private artifacts: AllArtifacts = {};

  constructor(private seenPaths: Set<String>) {}

  async tool(tool: Tool): Promise<ToolInfo> {
    return toolsCache[tool] || (await resolveTool(tool));
  }

  didSee(artifact: string) {
    this.seenPaths.add(artifact);
  }

  seen(artifact: string): boolean {
    return this.seenPaths.has(artifact);
  }

  async register(artifact: FileInfo, fingerprint: Tool, hash: string) {
    const base = this.artifacts[artifact.path] || {};
    this.artifacts[artifact.path] = {
      ...base,
      path: artifact.path,
      platform: await detectPlatform(artifact),
      fingerprints: {
        ...(base.fingerprints || {}),
        [fingerprintType(fingerprint)]: hash,
      },
    };
  }

  async fingerprint(artifact: FileInfo, type: Tool): Promise<void> {
    //
    this.didSee(artifact.path);
    const tool = await this.tool(type);
    const outpath = hashlockPath(artifact, type);
    const out = await $`${tool.path} ${artifact.path} > ${outpath}`;
    if (out.exitCode !== 0) {
      throw new Error(
        `Failed to fingerprint file '${artifact.path}' with tool '${type}'`,
      );
    }
    const fingerprint = Bun.file(outpath);
    if (!(await fingerprint.exists())) {
      throw new Error(
        `Fingerprint file for artifact '${artifact.path}' and tool '${type}' is missing`,
      );
    }
    const [hash] = (await fingerprint.text()).replace("\n", "").split("  ");

    await this.register(artifact, type, hash);
  }

  async sign(artifact: FileInfo, type: Tool): Promise<void> {
    this.didSee(artifact.path);
  }

  async finalize() {
    const seenPlatforms: Set<Platform> = new Set();
    Object.values(this.artifacts).map((artifact) => {
      seenPlatforms.add(artifact.platform);
    });

    const artifactManifest: ReleaseManifest = {
      version: pkgInfo.version,
      platforms: Array.from(seenPlatforms),
      artifacts: this.artifacts,
    };
    const encoded = JSON.stringify(artifactManifest, null, "  ");
    const manifestPath = join(process.cwd(), releaseInfo);
    console.info(`Writing manifest at path '${manifestPath}'...`);
    await Bun.write(manifestPath, encoded);

    const slsaSpecs: Partial<Record<Platform, string>> = {};
    const gatheredFingerprints: Partial<
      Record<Platform, Partial<SLSASpec> | undefined>
    > = {};

    // match files by platform to assign them to SLSA spec groups
    Object.values(this.artifacts).map((artifact) => {
      const base = gatheredFingerprints[artifact.platform] || { files: [] };
      gatheredFingerprints[artifact.platform] = {
        ...base,
        files: [artifact.path].concat(base.files || []),
      };
    });

    // build fingerprints for each of the SLSA spec groups
    await Promise.all(
      Object.entries(gatheredFingerprints).map((entry) => {
        const [platform, artifact] = entry;
        const specFile = join(process.cwd(), `slsa-${platform}.txt`);
        console.log(
          `- Building SLSA spec for platform '${platform}' -> '${specFile}'`,
        );

        return this.tool(Tool.SHA256SUM).then(async (tool) => {
          const files = artifact.files || [];
          if (files.length < 1) {
            return "";
          }
          await $`${tool.path} ${files} > ${specFile}`;
          const spec = Bun.file(specFile);
          const specData = await spec.text();
          const lines = specData.split("\n")
          const remapped = lines.map((line) => {
            if (!line) {
              return "";
            }
            const trimmed = line.trim()
            const split = trimmed.split('  ').filter((i) => !!i).map((i) => i.trim())
            const [hash, file] = split
            if (!hash || !file) {
              throw new Error(`Failed to extract info from line: '${trimmed}'`)
            }
            const filename = basename(file)
            return `${hash}  ${filename}`
          }).filter((i) => !!i)
          slsaSpecs[platform] = remapped.join('\n');
        });
      }),
    );

    // process finalized slsa specs
    const encodedHashes = btoa(Object.values(slsaSpecs).join("\n"));
    const outfile = "slsa-hashes.b64";
    const slsaOut = join(process.cwd(), outfile);
    await Bun.write(slsaOut, encodedHashes);

    console.log(`- SLSA: ${slsaOut}`);
    console.info(`Release processing done (version: ${pkgInfo.version})`);
  }
}

async function touchPath(config: DistOptions, file: FileInfo) {
  config.didSee(file.path);
}

// ------------

async function processArtifact(
  config: DistOptions,
  file: FileInfo,
): Promise<void> {
  // process fingerprints for file
  const ops: Promise<void>[] = [];
  if (!config.seen(file.path)) {
    ops.push(touchPath(config, file));
    ops.push(config.fingerprint(file, Tool.MD5SUM));
    ops.push(config.fingerprint(file, Tool.SHA1SUM));
    ops.push(config.fingerprint(file, Tool.SHA256SUM));
    ops.push(config.fingerprint(file, Tool.SHA512SUM));
  }
  return Promise.all(ops).then(() => {});
}

async function processDirectory(
  config: DistOptions,
  file: FileInfo,
): Promise<void> {
  // nothing yet
  await touchPath(config, file);
}

// ------------

async function processEntry(
  config: DistOptions,
  artifact: string,
): Promise<void> {
  console.info(`- Processing: ${artifact}`);
  const file = Bun.file(artifact);
  const fileInfo: FileInfo = { path: artifact, file };
  const fstat = await stat(artifact);
  if (fstat.isDirectory()) {
    // process directories
    return processDirectory(config, fileInfo);
  } else if (!(await file.exists())) {
    throw new Error(`Artifact at name '${artifact}' does not exist`);
  } else {
    // process files
    return processArtifact(config, fileInfo);
  }
}

const seen = new Set<String>();
const config = new DistOptions(seen);

console.info("Building fingerprints...");

await Promise.all(
  Bun.argv.slice(2).map((entry) => processEntry(config, entry)),
);

await config.finalize();
