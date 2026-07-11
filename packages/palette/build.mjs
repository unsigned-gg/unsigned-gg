// Generate dist/palette.js (plain <script>, window.UnsignedPalette) and
// dist/palette.mjs (ESM default export) from src/core.js.
// Run: bun run build (or node build.mjs). dist/ is checked in — the no-build
// static surfaces consume /palette.js directly; CI asserts dist matches source.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const core = readFileSync(join(root, "src", "core.js"), "utf8");

const banner = `/* @unsigned-gg/palette — GENERATED from src/core.js, do not edit. */`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(
  join(root, "dist", "palette.js"),
  `${banner}\n${core}\nwindow.UnsignedPalette = createUnsignedPalette();\n`,
);
writeFileSync(
  join(root, "dist", "palette.mjs"),
  `${banner}\n${core}\nconst UnsignedPalette = createUnsignedPalette();\nexport default UnsignedPalette;\n`,
);
console.log("palette: dist/palette.{js,mjs} written");
