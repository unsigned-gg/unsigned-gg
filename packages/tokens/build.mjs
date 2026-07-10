// Generate dist/tokens.css + dist/tokens.js from tokens.json.
// Run: bun run build (or node build.mjs). dist/ is checked in — the no-build
// static surfaces consume the artifact directly; CI asserts dist matches source.
//
// Emission rules (foundation expansion 2026-07-10):
//   - LEGACY groups (color, font, motion) emit BARE var names (--bg, --mono,
//     --ease) — the original grammar every surface already binds.
//   - Every other group emits --<group>-<name> (--space-4, --radius-sm,
//     --text-body, --z-header, --grid-cell).
//   - The `role` group aliases other tokens BY NAME and emits var()
//     references (--accent: var(--green)), so surfaces bind semantics and a
//     hue change propagates. Role names emit bare (they are the API).
//   - $-prefixed keys are metadata everywhere.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

// The bare grammar is FROZEN at the original pre-expansion names — every
// token added after 2026-07-10 emits prefixed, whatever group it lives in.
// (Generic bare names like --fast/--base would collide in consumer sheets.)
const LEGACY_BARE = new Set([
  "bg", "surface", "surface-2", "surface-3", "border", "border-hover",
  "dim", "mid", "bright", "white", "green", "green-dim", "green-glow",
  "blue", "purple", "orange", "red",
  "mono", "sans",
  "ease",
]);

const flat = {}; // css var name (no --) -> value
const js = {};   // group -> { name -> resolved value } for the JS export

for (const [group, values] of Object.entries(t)) {
  if (group.startsWith("$")) continue;
  js[group] = {};
  for (const [name, value] of Object.entries(values)) {
    if (name.startsWith("$")) continue;
    if (group === "role") {
      // roles are the semantic API: bare by design, aliasing legacy names.
      if (!LEGACY_BARE.has(value))
        throw new Error(`role "${name}" aliases unknown legacy token "${value}"`);
      flat[name] = `var(--${value})`;
      js[group][name] = t.color[value] ?? value;
    } else if (LEGACY_BARE.has(name)) {
      flat[name] = value;
      js[group][name] = value;
    } else {
      flat[`${group}-${name}`] = value;
      js[group][name] = value;
    }
  }
}

const banner = `/* @unsigned-gg/tokens — GENERATED from tokens.json, do not edit. */`;
const css =
  `${banner}\n:root {\n` +
  Object.entries(flat)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n") +
  `\n}\n`;

const jsOut =
  `${banner}\n` +
  `export const tokens = ${JSON.stringify(js, null, 2)};\n` +
  `export default tokens;\n`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "tokens.css"), css);
writeFileSync(join(root, "dist", "tokens.js"), jsOut);
console.log(`tokens: ${Object.keys(flat).length} vars → dist/tokens.{css,js}`);
