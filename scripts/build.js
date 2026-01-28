import { build } from "esbuild";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Read package.json for version
const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"));
const banner = `/*! leaflet-groupedlayercontrol v${pkg.version} | MIT License | https://github.com/ismyrnow/leaflet-groupedlayercontrol */`;

const sharedConfig = {
  entryPoints: ["src/leaflet.groupedlayercontrol.js"],
  bundle: true,
  banner: { js: banner },
  external: ["leaflet"],
  sourcemap: true,
};

async function buildAll() {
  try {
    // ESM build (unminified for better debugging)
    await build({
      ...sharedConfig,
      format: "esm",
      outfile: "dist/leaflet.groupedlayercontrol.js",
    });
    console.log("✓ Built ESM module");

    // ESM minified build
    await build({
      ...sharedConfig,
      format: "esm",
      outfile: "dist/leaflet.groupedlayercontrol.min.js",
      minify: true,
    });
    console.log("✓ Built ESM minified module");

    // CommonJS build for legacy support
    await build({
      ...sharedConfig,
      format: "cjs",
      outfile: "dist/leaflet.groupedlayercontrol.cjs",
    });
    console.log("✓ Built CommonJS module");

    console.log("\n✓ All builds completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildAll();
