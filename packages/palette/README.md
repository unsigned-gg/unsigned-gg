# @unsigned-gg/palette

The shared ⌘K command bar. Canon requires a spotlight command bar as primary
navigation on **every** page; this package is the single implementation, and
each surface supplies only its item list.

- `dist/palette.js` — plain `<script>` build; sets `window.UnsignedPalette`.
  `build-site.sh` copies it to the site root as `/palette.js` for the no-build
  static surfaces (landing, 404).
- `dist/palette.mjs` — ESM build for built apps
  (`import UnsignedPalette from "@unsigned-gg/palette"`).

Both are generated from `src/core.js` by `bun run build` and checked in;
CI asserts dist matches source (same discipline as `@unsigned-gg/tokens`).

## API

```js
const bar = UnsignedPalette.init({
  getItems: (query) => [
    { hex: "0x01", label: "Capabilities", k2: "", run: () => { /* … */ } },
  ],
  placeholder: "jump to a section, or type a command…",
  emptyText: "nothing at that address.",
});
bar.open(); bar.close(); bar.destroy();
```

`getItems(query)` is called on every keystroke and must return the filtered
list — lock state, route tables, and easter eggs live in the caller.
The engine owns the dialog DOM, ⌘K/Ctrl-K + `/` + Escape + arrow-key
handling, `prefers-reduced-motion`, and styling via `/tokens.css` custom
properties only (no re-declared values).

`/learn` currently keeps its own palette implementation (predates this
package); migrating it onto the shared engine is roadmap P5.
