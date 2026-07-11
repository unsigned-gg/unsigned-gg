// unsigned/roadmap — renders the Now/Next/Later board from data/roadmap.json.
// Keyboard-first per canon: ⌘/Ctrl-K spotlight jumps to any horizon or item.
// No build step; no framework. Data honesty: the JSON is a curated, sanitized
// snapshot — nothing here is fetched live from internal systems.
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const STATUS_LABEL = { shipped: 'shipped', building: 'building', planned: 'planned' };
const jumpTargets = []; // {label, kind, id}

async function boot() {
  let data;
  try {
    const res = await fetch('data/roadmap.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (e) {
    $('.board').append(el('p', {
      class: 'lede',
      text: 'Roadmap data is temporarily unavailable. Source: roadmap/data/roadmap.json.',
    }));
    return;
  }
  render(data);
  wirePalette();
}

function render(data) {
  const board = $('.board');
  board.textContent = '';
  for (const h of data.horizons) {
    jumpTargets.push({ label: h.label + ' — ' + h.hint, kind: h.label, id: 'h-' + h.id });
    const col = el('section', { class: 'horizon', id: 'h-' + h.id, 'aria-labelledby': 'ht-' + h.id });
    col.append(el('div', { class: 'horizon-head' }, [
      el('h2', { id: 'ht-' + h.id, text: h.label }),
      el('span', { class: 'hint', text: h.hint }),
      el('span', { class: 'count', text: String(h.items.length).padStart(2, '0') }),
    ]));
    for (const item of h.items) {
      const id = 'i-' + slug(item.title);
      jumpTargets.push({ label: item.title, kind: h.label, id });
      const card = el('article', { class: 'card', id, tabindex: '0' });
      card.append(
        el('div', { class: 'card-top' }, [
          el('span', { class: 'area', text: item.area }),
          el('span', { class: 'pill ' + item.status, text: STATUS_LABEL[item.status] || item.status }),
        ]),
        el('h3', { text: item.title }),
        el('p', { text: item.blurb }),
      );
      col.append(card);
    }
    board.append(col);
  }

  // stamps
  const when = (data.meta && data.meta.generatedAt) || '';
  const demo = data.meta && data.meta.demo;
  const stamp = $('[data-stamp]');
  if (stamp) stamp.textContent = demo ? 'demo data' : 'updated ' + when;
  const foot = $('[data-foot-stamp]');
  if (foot) foot.textContent = 'curated snapshot · ' + (when || 'undated') + ' · edit roadmap/data/roadmap.json to evolve';
}

/* ---------- ⌘K spotlight ---------- */
function wirePalette() {
  const wrap = $('.palette-wrap');
  const input = $('.palette input');
  const list = $('#cmd-list');
  let open = false, sel = 0, shown = [];

  const draw = (q) => {
    const needle = q.trim().toLowerCase();
    shown = needle
      ? jumpTargets.filter((t) => t.label.toLowerCase().includes(needle))
      : jumpTargets.slice();
    sel = 0;
    list.textContent = '';
    if (!shown.length) {
      list.append(el('li', {}, [el('span', { class: 'empty', text: 'no match — 0x00 results' })]));
      return;
    }
    shown.forEach((t, i) => {
      const li = el('li', { role: 'option', 'aria-selected': i === 0 ? 'true' : 'false', 'data-id': t.id }, [
        el('span', { class: 'k', text: t.kind }),
        el('span', { text: t.label }),
      ]);
      li.addEventListener('click', () => go(t.id));
      list.append(li);
    });
  };
  const highlight = () => [...list.children].forEach((li, i) =>
    li.setAttribute && li.setAttribute('aria-selected', i === sel ? 'true' : 'false'));
  const go = (id) => {
    close();
    const node = document.getElementById(id);
    if (!node) return;
    location.hash = id;
    node.focus({ preventScroll: false });
  };
  const openBar = () => { open = true; wrap.hidden = false; input.value = ''; draw(''); input.focus(); };
  const close = () => { open = false; wrap.hidden = true; };

  $('.kbd-hint').addEventListener('click', openBar);
  $('.scrim').addEventListener('click', close);
  input.addEventListener('input', () => draw(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); highlight(); scrollSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); highlight(); scrollSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) go(shown[sel].id); }
    else if (e.key === 'Escape') { close(); }
  });
  const scrollSel = () => list.children[sel] && list.children[sel].scrollIntoView({ block: 'nearest' });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? close() : openBar(); }
    else if (e.key === '/' && !open && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); openBar();
    }
  });
}

document.addEventListener('DOMContentLoaded', boot);
