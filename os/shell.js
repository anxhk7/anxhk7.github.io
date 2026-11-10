'use strict';
// The shell: settings, boot and login flow, desktop icons, taskbar, Start menu and context menus.
(() => {
  const { h, icon, wm, fs } = OS;
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Settings (saved locally, nothing sensitive) ----
  const DEFAULTS = { wall: 'aurora', accent: 'sky', skip: false, hidden: false };
  OS.walls = { aurora: 'Aurora', meadow: 'Meadow', sunset: 'Sunset', midnight: 'Midnight' };
  OS.accents = { sky: [207, '80%'], leaf: [135, '50%'], sunset: [24, '85%'], grape: [272, '50%'], rose: [338, '65%'], graphite: [210, '8%'] };
  OS.settings = { ...DEFAULTS };
  try { Object.assign(OS.settings, JSON.parse(localStorage.getItem('angelos') || '{}')); } catch (e) { /* storage blocked or corrupt: defaults are fine */ }

  OS.apply = () => {
    const s = OS.settings;
    if (!OS.walls[s.wall]) s.wall = DEFAULTS.wall;
    if (!OS.accents[s.accent]) s.accent = DEFAULTS.accent;
    $('wall').className = 'wp-' + s.wall;
    document.documentElement.style.setProperty('--h', OS.accents[s.accent][0]);
    document.documentElement.style.setProperty('--s', OS.accents[s.accent][1]);
  };
  OS.save = () => {
    try { localStorage.setItem('angelos', JSON.stringify(OS.settings)); } catch (e) { /* still applies for this visit */ }
    OS.apply();
  };
  OS.resetSettings = () => { Object.assign(OS.settings, DEFAULTS); OS.save(); };

  // ---- Popup menus ----
  const ctx = $('ctx');
  const closeMenu = () => { ctx.hidden = true; };
  OS.menu = (x, y, items) => {
    ctx.replaceChildren(...items.map(it => it.sep ? h('hr') : h('button', { role: 'menuitem', text: it.label, onclick: () => { closeMenu(); it.fn(); } })));
    ctx.hidden = false;
    const r = ctx.getBoundingClientRect();
    ctx.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
    ctx.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
    ctx.querySelector('button').focus();
  };
  ctx.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const b = [...ctx.querySelectorAll('button')];
    b[(b.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus();
  });

  // ---- Desktop icons ----
  const shortcuts = [
    { label: 'Computer', icon: 'pc', fn: () => wm.open('explorer') },
    { label: 'About Me', icon: 'ak-face.jpeg', fn: () => wm.open('about') },
    { label: 'Projects', icon: 'code', fn: () => wm.open('projects') },
    { label: 'Terminal', icon: 'term', fn: () => wm.open('terminal') },
    { label: 'Contact', icon: 'mail', fn: () => wm.open('contact') },
    { label: 'Classic Site', icon: 'web', fn: () => OS.go('classic.html') },
    { label: 'Personalize', icon: 'gear', fn: () => wm.open('settings') },
    { label: 'Recycle Bin', icon: 'bin', fn: () => wm.open('explorer', fs.resolve('/Recycle Bin', fs.root)) }
  ];
  function drawIcons() {
    const box = $('icons');
    box.replaceChildren(...shortcuts.map(s => {
      const b = h('button', { class: 'd-icon' }, icon(s.icon, 'lg'), h('span', { text: s.label }));
      const select = () => { box.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); };
      b.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        select();
        OS.menu(e.clientX, e.clientY, [{ label: 'Open', fn: s.fn }]);
      });
      return OS.launcher(b, s.fn, select);
    }));
  }
  $('desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.win, #taskbar, #startmenu')) return;
    e.preventDefault();
    OS.menu(e.clientX, e.clientY, [
      { label: 'Open Terminal', fn: () => wm.open('terminal') },
      { label: 'Browse files', fn: () => wm.open('explorer') },
      { sep: true },
      { label: 'Personalize', fn: () => wm.open('settings') },
      { label: 'System Properties', fn: () => wm.open('about') },
      { sep: true },
      { label: 'View classic site', fn: () => OS.go('classic.html') }
    ]);
  });
  $('icons').addEventListener('pointerdown', e => {
    if (e.target === e.currentTarget) e.currentTarget.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
  });

  // ---- Taskbar ----
  wm.onChange = () => {
    $('tasks').replaceChildren(...wm.list().map(w => {
      const on = wm.active() === w.id && !w.min;
      const toggle = () => on ? wm.minimize(w.id) : wm.restore(w.id);
      return h('button', {
        class: 'task' + (on ? ' on' : ''), title: w.title, 'aria-pressed': on, onclick: toggle,
        oncontextmenu: e => {
          e.preventDefault();
          OS.menu(e.clientX, e.clientY, [
            { label: w.min ? 'Restore' : 'Minimize', fn: () => w.min ? wm.restore(w.id) : wm.minimize(w.id) },
            { label: w.max ? 'Restore size' : 'Maximize', fn: () => { wm.restore(w.id); wm.toggleMax(w.id); } },
            { sep: true },
            { label: 'Close', fn: () => wm.close(w.id) }
          ]);
        }
      }, icon(w.icon), h('span', { text: w.title }));
    }));
  };

  let peeked = [];
  $('peek').addEventListener('click', () => {
    const open = wm.list().filter(w => !w.min);
    if (open.length) { peeked = open.map(w => w.id); open.forEach(w => wm.minimize(w.id)); }
    else { peeked.forEach(id => wm.restore(id)); peeked = []; }
  });

  function tick() {
    const d = new Date();
    $('clock').replaceChildren(
      h('span', { text: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }),
      h('span', { text: d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }) }));
    $('clock').title = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);

  // ---- Start menu ----
  const startBtn = $('start'), menu = $('startmenu');
  const startApps = () => Object.values(OS.apps).filter(a => a.start);
  const entry = (label, ico, fn) => h('button', { onclick: () => { toggleStart(false); fn(); } }, icon(ico, 'md'), h('span', { text: label }));
  const allPrograms = () => startApps().map(a => entry(a.title, a.icon, () => wm.open(a.id)));

  function search(q) {
    q = q.toLowerCase();
    const hits = startApps().filter(a => a.title.toLowerCase().includes(q)).map(a => entry(a.title, a.icon, () => wm.open(a.id)));
    fs.walk(n => { if (n.name.toLowerCase().includes(q)) hits.push(entry(n.name, OS.iconFor(n), () => OS.openNode(n))); });
    return hits.slice(0, 8);
  }

  function buildStart() {
    const list = h('div', { class: 'sm-list' }, allPrograms());
    const box = h('input', {
      class: 'sm-search', type: 'search', placeholder: 'Search programs and files', 'aria-label': 'Search programs and files',
      oninput: () => {
        const q = box.value.trim();
        const hits = q ? search(q) : allPrograms();
        list.replaceChildren(...(hits.length ? hits : [h('p', { class: 'empty', text: 'No items match your search.' })]));
      },
      onkeydown: e => { if (e.key === 'Enter') { const first = list.querySelector('button'); if (first) first.click(); } }
    });
    const place = name => entry(name, 'folder', () => wm.open('explorer', fs.resolve('/' + name, fs.root)));
    const p = OS.profile;
    menu.replaceChildren(
      h('div', { class: 'sm-left' }, list, box),
      h('div', { class: 'sm-right' },
        h('div', { class: 'sm-user' }, h('img', { src: 'ak-face.jpeg', alt: '' }), h('strong', { text: p.name })),
        place('About Me'), place('Projects'), place('Experience'), place('Skills'),
        h('hr'),
        entry('Classic site', 'web', () => OS.go('classic.html')),
        p.links.slice(0, 3).map(l => entry(l.label, l.icon, () => OS.go(l.url))),
        h('div', { class: 'sm-power' },
          h('button', { class: 'btn7', text: 'Log off', onclick: () => { toggleStart(false); wm.closeAll(); stage('login'); } }),
          h('button', { class: 'btn7', text: 'Restart', onclick: () => { toggleStart(false); wm.closeAll(); stage('boot'); } }))));
    return box;
  }
  function toggleStart(show = menu.hidden) {
    menu.hidden = !show;
    startBtn.setAttribute('aria-expanded', show);
    if (show) buildStart().focus();
  }
  startBtn.addEventListener('click', () => toggleStart());

  // Clicking elsewhere or pressing Escape closes any open menu.
  addEventListener('pointerdown', e => {
    if (!ctx.hidden && !ctx.contains(e.target)) closeMenu();
    if (!menu.hidden && !menu.contains(e.target) && !startBtn.contains(e.target)) toggleStart(false);
  }, true);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeMenu();
    if (!menu.hidden) { toggleStart(false); startBtn.focus(); }
  });
  addEventListener('blur', closeMenu);

  // ---- Boot, login, welcome, desktop ----
  const STAGES = ['boot', 'login', 'welcome', 'desktop'];
  let timer, firstVisit = true;
  function stage(name) {
    clearTimeout(timer);
    STAGES.forEach(s => { $(s).hidden = s !== name; });
    document.body.dataset.stage = name;
    if (name === 'boot') timer = setTimeout(() => stage('login'), reduced ? 0 : 2600);
    if (name === 'login') { firstVisit = true; $('login-btn').focus(); }
    if (name === 'welcome') timer = setTimeout(() => stage('desktop'), reduced ? 0 : 1100);
    if (name === 'desktop' && firstVisit) { firstVisit = false; wm.open('about'); }
  }
  $('boot').addEventListener('click', () => stage('login'));
  addEventListener('keydown', e => {
    if (document.body.dataset.stage === 'boot' && !e.ctrlKey && !e.metaKey && !e.altKey) stage('login');
  });
  $('login-btn').addEventListener('click', () => stage('welcome'));
  $('welcome').addEventListener('click', () => stage('desktop'));

  OS.apply();
  drawIcons();
  stage(OS.settings.skip || /[?&]desktop\b/.test(location.search) ? 'desktop' : 'boot');
})();
