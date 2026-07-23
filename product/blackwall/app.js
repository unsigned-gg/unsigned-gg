/* unsigned/product/blackwall — pipeline stepper + command bar. No build. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- pipeline stepper ---------- */
  const STAGES = [
    ['prompt',    'Task in',        'A prompt or a named task from the task library. Budgets and expected paths resolve here — before a single token is spent.'],
    ['provider',  'Model runs',     'The provider seam executes it — an OpenAI-compatible gateway, the claude CLI, or the omp harness. Retries with backoff on transient failure.'],
    ['jail',      'Inside the jail','Landlock confines the process. It works in a scratch materialization of the parent world; the real tree is not reachable, by kernel policy.'],
    ['diff',      'Diff',           'The scratch workspace is diffed. What the agent changed becomes data — nothing has touched your repository.'],
    ['changeset', 'Changeset',      'The diff is stored as a content-addressed changeset: each path an entry, each blob hashed, the whole set replayable.'],
    ['world',     'World commit',   'The run forks a world in the DAG. Later runs can build on it; parallel runs merge or branch without ever colliding in a working tree.'],
    ['settle',    'Settle',         'The explicit decision: select, release, apply, or discard. Typed — a settled run cannot settle twice.'],
    ['reconcile', 'Reconcile',      'An applied run reconciles into a real branch: conventional commit, custody metadata in the message, verify command gating it.'],
    ['pr',        'PR + merge gate','blackwall opens the pull request and watches CI. Green reports ready; the merge stays a human decision unless you opt in.'],
  ];

  const stepper = $('[data-stepper]');
  if (stepper) {
    const tabs = $('.steps', stepper);
    const title = $('[data-step-title]', stepper);
    const body = $('[data-step-body]', stepper);
    let current = 0;

    STAGES.forEach(([key, , ], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'tab';
      b.textContent = key;
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', () => select(i));
      tabs.appendChild(b);
    });

    const buttons = $$('button', tabs);
    function select(i) {
      current = (i + STAGES.length) % STAGES.length;
      buttons.forEach((b, j) => b.setAttribute('aria-selected', j === current ? 'true' : 'false'));
      title.textContent = STAGES[current][1];
      body.textContent = STAGES[current][2];
    }
    tabs.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); select(current + 1); buttons[current].focus(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); select(current - 1); buttons[current].focus(); }
    });
    select(0);
  }

  /* ---------- command bar (section jump) ---------- */
  const SECTIONS = [
    ['problem',   'the problem'],
    ['custody',   'custody, not trust'],
    ['pipeline',  'one run, end to end'],
    ['telemetry', 'every run answers for itself'],
    ['lineage',   'lineage'],
    ['surface',   'surface — shipped + in flight'],
    ['anatomy',   'anatomy'],
  ];
  const wrap = $('.palette-wrap');
  const input = $('.palette input');
  const list = $('#cmd-list');
  let sel = 0;

  function render(q = '') {
    const rows = SECTIONS.filter(([, label]) => label.includes(q.toLowerCase()));
    list.innerHTML = '';
    rows.forEach(([id, label], i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.textContent = label;
      li.dataset.target = id;
      li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      li.addEventListener('click', () => go(id));
      list.appendChild(li);
    });
    return rows;
  }
  function go(id) {
    close();
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ block: 'start' }); el.querySelector('h2')?.focus?.(); }
  }
  function open() { wrap.hidden = false; sel = 0; input.value = ''; render(); input.focus(); }
  function close() { wrap.hidden = true; }

  input.addEventListener('input', () => { sel = 0; render(input.value); });
  input.addEventListener('keydown', (e) => {
    const rows = $$('li', list);
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, rows.length - 1); render(input.value); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); sel = Math.max(sel - 1, 0); render(input.value); }
    if (e.key === 'Enter')     { e.preventDefault(); const r = rows[sel]; if (r) go(r.dataset.target); }
    if (e.key === 'Escape')    { close(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap.hidden ? open() : close(); }
    if (e.key === 'Escape' && !wrap.hidden) close();
  });
  $('.scrim').addEventListener('click', close);
  $('.kbd-hint').addEventListener('click', open);
})();
