'use strict';
// Window manager: the one place that creates, stacks, moves and closes windows.
OS.wm = (() => {
  const h = OS.h, MINW = 300, MINH = 200;
  const wins = [];
  let z = 10, seq = 0, activeId = null;

  const layer = () => document.getElementById('windows');
  const mobile = () => matchMedia('(max-width: 700px)').matches;
  const get = id => wins.find(w => w.id === id);
  const changed = () => OS.wm.onChange && OS.wm.onChange();
  const CAP = {
    min: '<svg viewBox="0 0 10 10"><path d="M1 8h8" stroke="currentColor" stroke-width="2"/></svg>',
    max: '<svg viewBox="0 0 10 10"><rect x="1.500" y="1.500" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.500"/></svg>',
    close: '<svg viewBox="0 0 10 10"><path d="M1.500 1.500l7 7M8.500 1.500l-7 7" stroke="currentColor" stroke-width="1.800"/></svg>'
  };

  // Runs an exit animation, then calls done exactly once.
  function animOut(el, cls, done) {
    let fired = false;
    const f = () => { if (!fired) { fired = true; el.classList.remove(cls); done(); } };
    el.classList.add(cls);
    el.addEventListener('animationend', f, { once: true });
    setTimeout(f, 220);
  }

  function open(appId, arg) {
    const app = OS.apps[appId];
    if (app.single) {
      const ex = wins.find(w => w.appId === appId);
      if (ex) { restore(ex.id); if (ex.onArg && arg !== undefined) ex.onArg(arg); return ex; }
    }
    const L = layer().getBoundingClientRect();
    const width = Math.min(app.w || 640, L.width - 16), height = Math.min(app.h || 440, L.height - 16);
    const step = (seq % 6) * 28;
    const left = Math.max(8, Math.min((L.width - width) / 2 - 60 + step, L.width - width - 8));
    const top = Math.max(8, Math.min((L.height - height) / 2 - 50 + step, L.height - height - 8));

    const w = { id: ++seq, appId, title: app.title, icon: app.icon, min: false, max: false };
    const title = h('span', { class: 'win-title' }), icoSlot = h('span', { class: 'win-ico' });
    const cap = (kind, label, fn) => {
      const b = h('button', { class: 'cap cap-' + kind, 'aria-label': label, title: label, onclick: fn });
      b.innerHTML = CAP[kind];
      return b;
    };
    w.body = h('div', { class: 'win-body' });
    w.el = h('section', {
      class: 'win opening', role: 'dialog', tabindex: '-1',
      style: `left:${left}px;top:${top}px;width:${width}px;height:${height}px`
    },
      h('header', { class: 'win-bar', ondblclick: e => { if (!e.target.closest('.cap')) toggleMax(w.id); } },
        icoSlot, title,
        h('div', { class: 'caps' },
          cap('min', 'Minimize', () => minimize(w.id)),
          cap('max', 'Maximize', () => toggleMax(w.id)),
          cap('close', 'Close', () => close(w.id)))),
      w.body,
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => h('div', { class: 'rz rz-' + d, 'data-d': d })));
    w.setTitle = (t, ico) => {
      w.title = t; if (ico) w.icon = ico;
      title.textContent = t;
      w.el.setAttribute('aria-label', t);
      icoSlot.replaceChildren(OS.icon(w.icon));
      changed();
    };
    w.close = () => close(w.id);
    w.el.addEventListener('pointerdown', () => focus(w.id), true);
    w.el.addEventListener('animationend', () => w.el.classList.remove('opening'), { once: true });
    dragAndResize(w);

    wins.push(w);
    layer().append(w.el);
    w.setTitle(app.title, app.icon);
    app.render(w, arg);
    focus(w.id);
    if (!w.el.contains(document.activeElement)) w.el.focus({ preventScroll: true });
    return w;
  }

  function focus(id) {
    const w = get(id);
    if (!w) return;
    w.el.style.zIndex = ++z;
    if (activeId === id) return;
    activeId = id;
    wins.forEach(x => x.el.classList.toggle('active', x.id === id));
    changed();
  }

  function focusTop() {
    const top = wins.filter(w => !w.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
    activeId = null;
    wins.forEach(x => x.el.classList.remove('active'));
    if (top) focus(top.id); else changed();
  }

  function close(id) {
    const i = wins.findIndex(w => w.id === id);
    if (i < 0) return;
    const [w] = wins.splice(i, 1);
    animOut(w.el, 'closing', () => w.el.remove());
    focusTop();
  }

  function minimize(id) {
    const w = get(id);
    if (!w || w.min) return;
    w.min = true;
    animOut(w.el, 'minimizing', () => w.el.classList.toggle('min', w.min));
    focusTop();
  }

  function restore(id) {
    const w = get(id);
    if (!w) return;
    w.min = false;
    w.el.classList.remove('min');
    focus(id);
    if (!w.el.contains(document.activeElement)) w.el.focus({ preventScroll: true });
  }

  function toggleMax(id) {
    const w = get(id);
    if (!w) return;
    w.max = !w.max;
    w.el.classList.toggle('max', w.max);
    const b = w.el.querySelector('.cap-max');
    b.title = w.max ? 'Restore' : 'Maximize';
    b.setAttribute('aria-label', b.title);
  }

  function dragAndResize(w) {
    w.el.addEventListener('pointerdown', e => {
      const rz = e.target.closest('.rz'), bar = e.target.closest('.win-bar');
      if ((!rz && !bar) || e.target.closest('.cap') || w.max || mobile() || e.button) return;
      e.preventDefault();
      const L = layer().getBoundingClientRect(), r = w.el.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, d = rz ? rz.dataset.d : '';
      const o = { l: r.left - L.left, t: r.top - L.top, w: r.width, h: r.height };
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let l = o.l, t = o.t, W = o.w, H = o.h;
        if (!rz) { l += dx; t += dy; }
        if (d.includes('e')) W = Math.max(MINW, o.w + dx);
        if (d.includes('s')) H = Math.max(MINH, o.h + dy);
        if (d.includes('w')) { W = Math.max(MINW, o.w - dx); l = o.l + o.w - W; }
        if (d.includes('n')) { H = Math.max(MINH, Math.min(o.h - dy, o.t + o.h)); t = o.t + o.h - H; }
        // Keep the title bar reachable.
        t = Math.max(0, Math.min(t, L.height - 34));
        l = Math.max(80 - W, Math.min(l, L.width - 80));
        Object.assign(w.el.style, { left: l + 'px', top: t + 'px', width: W + 'px', height: H + 'px' });
      };
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', up);
        document.body.classList.remove('dragging');
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
      document.body.classList.add('dragging');
    });
  }

  // Pull windows back into view when the browser shrinks.
  addEventListener('resize', () => {
    const L = layer().getBoundingClientRect();
    for (const w of wins) {
      const l = parseFloat(w.el.style.left), t = parseFloat(w.el.style.top);
      w.el.style.left = Math.max(80 - w.el.offsetWidth, Math.min(l, L.width - 80)) + 'px';
      w.el.style.top = Math.max(0, Math.min(t, L.height - 34)) + 'px';
    }
  });

  return {
    open, close, focus, minimize, restore, toggleMax,
    list: () => wins.slice(),
    active: () => activeId,
    closeAll: () => wins.slice().forEach(w => close(w.id)),
    onChange: null
  };
})();
