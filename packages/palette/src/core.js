// @unsigned-gg/palette — dependency-free ⌘K command bar engine.
// Canon (.impeccable.md): the spotlight command bar is primary navigation on
// every page. This is the one shared implementation; per-surface item lists
// are supplied by the caller. Styling references /tokens.css custom
// properties only — no re-declared values.
//
// Authored source. build.mjs wraps this file into dist/palette.js (plain
// <script>, sets window.UnsignedPalette) and dist/palette.mjs (ESM default
// export) — same body, two consumption modes, like tokens.css/tokens.js.

function createUnsignedPalette() {
  const CSS = `
.upal-wrap { position: fixed; inset: 0; z-index: var(--z-overlay); display: none; }
.upal-wrap.open { display: block; }
.upal-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
.upal {
  position: relative; margin: 12vh auto 0; width: min(560px, calc(100vw - 32px));
  background: var(--surface); border: 1px solid var(--border-hover); border-radius: var(--radius-xl);
  overflow: hidden; animation: upal-rise var(--motion-base) var(--ease) both;
  font-family: var(--sans);
}
@keyframes upal-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .upal { animation: none; } }
.upal input {
  display: block; width: 100%; border: none; border-bottom: 1px solid var(--border); border-radius: 0;
  background: transparent; color: var(--bright); padding: 16px 18px; font-size: var(--text-body);
  font-family: inherit;
}
.upal input:focus-visible { outline: none; }
.upal ul { list-style: none; margin: 0; max-height: 320px; overflow-y: auto; padding: 6px; }
.upal li {
  display: flex; align-items: baseline; gap: var(--space-4); margin: 0;
  padding: 9px 12px; border-radius: var(--radius-base); cursor: pointer;
  font-size: var(--text-body); color: var(--mid);
}
.upal li .hx { font-family: var(--mono); font-size: var(--text-label); color: var(--dim); min-width: 34px; }
.upal li .k2 { margin-left: auto; font-family: var(--mono); font-size: var(--text-micro); color: var(--dim); }
.upal li[aria-selected="true"] { background: var(--green-glow); color: var(--white); }
.upal li[aria-selected="true"] .hx { color: var(--green); }
.upal .upal-empty { padding: 22px 16px; font-family: var(--mono); font-size: var(--text-meta); color: var(--dim); }
`;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  function init(opts) {
    const getItems = opts.getItems;
    const placeholder = opts.placeholder || 'jump to a section, or type a command…';
    const emptyText = opts.emptyText || 'nothing at that address.';
    const mount = opts.mount || document.body;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'upal-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'command bar');
    wrap.innerHTML = `
      <div class="upal-scrim"></div>
      <div class="upal">
        <input type="text" placeholder="${esc(placeholder)}" aria-label="command bar input"
               role="combobox" aria-expanded="true" spellcheck="false" autocomplete="off" />
        <ul role="listbox"></ul>
      </div>`;
    mount.appendChild(wrap);

    const input = wrap.querySelector('input');
    const list = wrap.querySelector('ul');
    let sel = 0;
    let lastFocus = null;

    const items = (q) => getItems(q || '');

    function renderList() {
      const its = items(input.value);
      sel = Math.min(sel, Math.max(0, its.length - 1));
      list.innerHTML = its.length
        ? its.map((a, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}">
            <span class="hx">${esc(a.hex)}</span>${esc(a.label)}${a.k2 ? `<span class="k2">${esc(a.k2)}</span>` : ''}</li>`).join('')
        : `<div class="upal-empty">${esc(emptyText)}</div>`;
      list.querySelectorAll('li').forEach((li) => {
        li.addEventListener('click', () => { its[+li.dataset.i].run(); close(); });
        li.addEventListener('mousemove', () => {
          sel = +li.dataset.i;
          list.querySelectorAll('li').forEach((x, i) => x.setAttribute('aria-selected', String(i === sel)));
        });
      });
      return its;
    }

    function open() {
      lastFocus = document.activeElement;
      wrap.classList.add('open');
      input.value = '';
      sel = 0;
      renderList();
      input.focus();
    }
    function close() {
      wrap.classList.remove('open');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    const isOpen = () => wrap.classList.contains('open');

    input.addEventListener('input', () => { sel = 0; renderList(); });
    input.addEventListener('keydown', (e) => {
      const its = items(input.value);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (its.length) { sel = (sel + 1) % its.length; renderList(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (its.length) { sel = (sel - 1 + its.length) % its.length; renderList(); } }
      else if (e.key === 'Enter' && its[sel]) { its[sel].run(); close(); }
    });
    wrap.querySelector('.upal-scrim').addEventListener('click', close);

    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen() ? close() : open(); return; }
      if (isOpen()) { if (e.key === 'Escape') close(); return; }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); open(); }
    };
    addEventListener('keydown', onKey);

    function destroy() {
      removeEventListener('keydown', onKey);
      wrap.remove();
      style.remove();
    }

    return { open, close, destroy };
  }

  return { init };
}
