// Generate dist/tokens.css + dist/tokens.js from tokens.json.
// Run: bun run build (or node build.mjs). dist/ is checked in — the no-build
// static surfaces consume the artifact directly; CI asserts dist matches source.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

const flat = {};
for (const [group, values] of Object.entries(t)) {
  if (group.startsWith("$")) continue;
  for (const [name, value] of Object.entries(values)) flat[name] = value;
}

const banner = `/* @unsigned-gg/tokens — GENERATED from tokens.json, do not edit. */`;
const css =
  `${banner}\n:root {\n` +
  Object.entries(flat)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n") +
  `\n}\n`;

const js =
  `${banner}\n` +
  `export const tokens = ${JSON.stringify(flat, null, 2)};\n` +
  `export default tokens;\n`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "tokens.css"), css);
writeFileSync(join(root, "dist", "tokens.js"), js);
console.log(`tokens: ${Object.keys(flat).length} vars → dist/tokens.{css,js}`);
