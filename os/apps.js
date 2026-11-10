'use strict';
// Applications. To add one, call app({ id, title, icon, render(win, arg) }).
// Flags: single (one window at most), start (listed in the Start menu), w/h (default size).
(() => {
  const { h, icon, fs, wm } = OS;
  const app = def => { OS.apps[def.id] = def; };

  const go = url => /^https?:/.test(url) ? window.open(url, '_blank', 'noopener') : location.assign(url);
  const btn = (label, fn, cls = '') => h('button', { class: 'btn7 ' + cls, text: label, onclick: fn });
  const tags = items => h('ul', { class: 'tags' }, items.map(t => h('li', { text: t })));
  const winPath = n => 'C:' + (fs.path(n).replace(/\//g, '\\'));

  OS.go = go;
  OS.openNode = n => {
    if (n.type === 'dir') return wm.open('explorer', n);
    if (n.kind === 'txt') return wm.open('notepad', n);
    if (n.kind === 'img') return wm.open('viewer', n);
    return go(n.url);
  };

  // Shared behaviour for icon-style buttons: double-click or Enter opens, a tap opens on touch.
  OS.launcher = (el, openFn, selectFn) => {
    el.addEventListener('click', () => OS.coarse() ? openFn() : selectFn && selectFn());
    el.addEventListener('dblclick', () => { if (!OS.coarse()) openFn(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); openFn(); } });
    return el;
  };

  function tabs(w, panes, first) {
    const names = Object.keys(panes);
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const pane = h('div', { class: 'tab-pane', role: 'tabpanel', tabindex: '0' });
    const show = name => {
      if (!panes[name]) name = names[0];
      [...bar.children].forEach(b => b.setAttribute('aria-selected', b.textContent === name));
      pane.replaceChildren(...panes[name]());
      pane.scrollTop = 0;
    };
    names.forEach(n => bar.append(h('button', { role: 'tab', text: n, onclick: () => show(n) })));
    w.body.append(bar, pane);
    show(first);
    return show;
  }

  // ---- Files ----
  app({
    id: 'explorer', title: 'Files', icon: 'folder', w: 740, h: 470, start: true,
    render(w, arg) {
      let hist = [arg || fs.root], i = 0, sel = null;
      const cur = () => hist[i];
      const nav = (label, glyph, fn) => h('button', { class: 'ex-nav', 'aria-label': label, title: label, text: glyph, onclick: fn });
      const back = nav('Back', '←', () => { i--; draw(); });
      const fwd = nav('Forward', '→', () => { i++; draw(); });
      const up = nav('Up one level', '↑', () => goTo(cur().parent));
      const crumbs = h('div', { class: 'crumbs' });
      const hidden = h('input', { type: 'checkbox', onchange: e => { OS.settings.hidden = e.target.checked; OS.save(); draw(); } });
      const side = h('nav', { class: 'ex-side', 'aria-label': 'Folders' });
      const grid = h('div', { class: 'ex-grid' });
      const status = h('div', { class: 'ex-status' });

      function goTo(n) {
        if (!n || n === cur()) return;
        hist = hist.slice(0, i + 1);
        hist.push(n);
        i++;
        draw();
      }
      const act = n => n.type === 'dir' ? goTo(n) : OS.openNode(n);
      function info() {
        const d = cur();
        status.replaceChildren(sel
          ? h('span', {}, icon(OS.iconFor(sel)), `${sel.name}  ·  ${OS.typeOf(sel)}${OS.sizeOf(sel) ? '  ·  ' + OS.sizeOf(sel) : ''}`)
          : h('span', { text: OS.sizeOf({ type: 'dir', children: fs.list(d, OS.settings.hidden) }) }));
      }
      function draw() {
        const d = cur();
        sel = null;
        hidden.checked = OS.settings.hidden;
        w.setTitle(d.parent ? d.name : 'Computer', d.parent ? OS.iconFor(d) : 'pc');
        back.disabled = i === 0;
        fwd.disabled = i === hist.length - 1;
        up.disabled = !d.parent;

        const chain = [];
        for (let n = d; n; n = n.parent) chain.unshift(n);
        crumbs.replaceChildren(...chain.flatMap((n, k) => [
          k ? h('span', { class: 'sep', text: '›', 'aria-hidden': 'true' }) : null,
          h('button', { text: n.parent ? n.name : 'Angelo (C:)', onclick: () => goTo(n) })
        ]).filter(Boolean));

        side.replaceChildren(...[fs.root, ...fs.list(fs.root, OS.settings.hidden)].filter(n => n.type === 'dir').map(n =>
          h('button', { class: chain.includes(n) && (n.parent || chain.length === 1) ? 'on' : '', onclick: () => goTo(n) },
            icon(n.parent ? OS.iconFor(n) : 'pc'), h('span', { text: n.parent ? n.name : 'Computer' }))));

        const items = fs.list(d, OS.settings.hidden);
        grid.replaceChildren(...items.map(n => {
          const b = h('button', { class: 'ex-item' + (n.hidden ? ' dim' : ''), title: n.name }, icon(OS.iconFor(n), 'lg'), h('span', { text: n.name }));
          const select = () => {
            sel = n;
            grid.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
            b.classList.add('sel');
            info();
          };
          b.addEventListener('contextmenu', e => {
            e.preventDefault();
            select();
            OS.menu(e.clientX, e.clientY, [
              { label: 'Open', fn: () => act(n) },
              { label: 'Properties', fn: () => wm.open('props', n) }
            ]);
          });
          return OS.launcher(b, () => act(n), select);
        }));
        if (!items.length) grid.append(h('p', { class: 'empty', text: 'This folder is empty.' }));
        grid.scrollTop = 0;
        info();
      }

      w.body.classList.add('ex');
      w.body.append(
        h('div', { class: 'ex-bar' }, back, fwd, up, crumbs, h('label', { class: 'ex-hidden' }, hidden, 'Hidden files')),
        h('div', { class: 'ex-main' }, side, grid),
        status);
      draw();
    }
  });

  app({
    id: 'notepad', title: 'Notepad', icon: 'txt', w: 560, h: 420,
    render(w, n) {
      w.setTitle(n.name + ' - Notepad');
      w.body.append(h('pre', { class: 'note', tabindex: '0', text: n.text }));
    }
  });

  app({
    id: 'viewer', title: 'Photo Viewer', icon: 'img', w: 460, h: 480,
    render(w, n) {
      w.setTitle(n.name + ' - Photo Viewer');
      w.body.classList.add('viewer');
      w.body.append(h('img', { src: n.src, alt: n.name }));
    }
  });

  app({
    id: 'props', title: 'Properties', icon: 'txt', w: 360, h: 320,
    render(w, n) {
      w.setTitle(n.name + ' Properties', OS.iconFor(n));
      const rows = [['Type', OS.typeOf(n)], ['Location', winPath(n.parent)], [n.type === 'dir' ? 'Contains' : 'Size', OS.sizeOf(n)], ['Target', n.url], ['Attributes', n.hidden ? 'Hidden, read-only' : 'Read-only']];
      w.body.classList.add('pad');
      w.body.append(
        h('div', { class: 'props-head' }, icon(OS.iconFor(n), 'lg'), h('strong', { text: n.name })),
        h('dl', { class: 'kv' }, rows.filter(r => r[1]).flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
        h('div', { class: 'row end' }, btn('Open', () => { OS.openNode(n); w.close(); }), btn('Close', w.close)));
    }
  });

  // ---- Projects ----
  app({
    id: 'projects', title: 'Projects', icon: 'code', w: 760, h: 500, single: true, start: true,
    render(w, id) {
      const list = h('div', { class: 'pj-list' });
      const det = h('article', { class: 'pj-det', tabindex: '0' });
      const show = pid => {
        const p = OS.projects.find(x => x.id === pid) || OS.projects[0];
        [...list.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.id === p.id));
        det.replaceChildren(...[
          h('header', {}, icon(p.icon, 'lg'), h('div', {}, h('h2', { text: p.name }), h('p', { class: 'meta', text: p.meta }))),
          h('p', { text: p.body }),
          p.highlights && h('dl', { class: 'hl' }, p.highlights.map(([k, t, d]) => h('div', {}, h('dt', { text: k }), h('dd', {}, h('strong', { text: t }), d)))),
          tags(p.tags),
          h('div', { class: 'row' },
            p.links.map(([label, url]) => btn(label, () => go(url), 'primary')),
            btn('Open folder', () => wm.open('explorer', fs.resolve('/Projects/' + p.name, fs.root))))
        ].filter(Boolean));
        det.scrollTop = 0;
      };
      OS.projects.forEach(p => list.append(
        h('button', { 'data-id': p.id, onclick: () => show(p.id) }, icon(p.icon, 'md'), h('span', {}, h('strong', { text: p.name }), h('small', { text: p.meta.split(' · ')[0] })))));
      w.body.classList.add('pj');
      w.body.append(list, det);
      w.onArg = show;
      show(id);
    }
  });

  // ---- System Properties (About Me) ----
  app({
    id: 'about', title: 'System Properties', icon: 'pc', w: 680, h: 520, single: true, start: true,
    render(w, tab) {
      const p = OS.profile;
      const kv = rows => h('dl', { class: 'kv' }, rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
      w.body.classList.add('sys');
      w.onArg = tabs(w, {
        General: () => [
          h('div', { class: 'sys-hero' }, icon('logo'), h('div', {}, h('h2', { text: 'AngelOS 7' }), h('p', { text: 'Personal Edition, built by ' + p.name }))),
          h('h3', { text: 'Owner' }),
          h('div', { class: 'sys-owner' }, h('img', { src: 'ak-face.jpeg', alt: 'Portrait of ' + p.name }), kv([['Name', p.name], ['Role', p.role], ...p.facts])),
          h('h3', { text: 'About' }),
          h('p', { text: p.blurb }),
          ...p.about.map(t => h('p', { text: t })),
          h('div', { class: 'row' }, btn('View projects', () => wm.open('projects'), 'primary'), btn('Contact', () => wm.open('contact')), btn('Classic site', () => go('classic.html')))
        ],
        Experience: () => OS.jobs.map(j => h('section', { class: 'job' },
          h('header', {}, icon(j.icon, 'md'), h('div', {}, h('h3', { text: j.title }), h('p', { class: 'meta', text: [j.org, j.dates, j.place].filter(Boolean).join(' · ') }))),
          j.body.map(t => h('p', { text: t })),
          j.bullets && h('ul', { class: 'bullets' }, j.bullets.map(b => h('li', { text: b }))),
          tags(j.tags))),
        Skills: () => OS.skills.map(g => h('section', { class: 'skill' }, h('h3', { text: g.group }), tags(g.items)))
      }, tab || 'General');
    }
  });

  // ---- Contact ----
  app({
    id: 'contact', title: 'Contact', icon: 'mail', w: 440, h: 400, single: true, start: true,
    render(w) {
      const p = OS.profile;
      const copy = btn('Copy address', () => {
        const done = ok => { copy.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(() => { copy.textContent = 'Copy address'; }, 1600); };
        navigator.clipboard ? navigator.clipboard.writeText(p.email).then(() => done(true), () => done(false)) : done(false);
      });
      w.body.classList.add('pad');
      w.body.append(
        h('p', { class: 'lead', text: 'Email is the best way to reach me. I am always happy to talk about backend engineering, developer tooling, or anything on this computer.' }),
        h('div', { class: 'links' }, p.links.map(l =>
          h('a', { href: l.url, target: /^https?:/.test(l.url) ? '_blank' : null, rel: 'noopener' }, icon(l.icon, 'md'), h('span', {}, h('strong', { text: l.label }), h('small', { text: l.detail }))))),
        h('div', { class: 'row' }, copy));
    }
  });

  // ---- Settings ----
  app({
    id: 'settings', title: 'Personalization', icon: 'gear', w: 520, h: 470, single: true, start: true,
    render(w) {
      const s = OS.settings;
      const set = (k, v) => { s[k] = v; OS.save(); draw(); };
      const draw = () => {
        w.body.replaceChildren(
          h('h3', { text: 'Wallpaper' }),
          h('div', { class: 'walls' }, Object.entries(OS.walls).map(([id, name]) =>
            h('button', { 'aria-pressed': s.wall === id, onclick: () => set('wall', id) }, h('i', { class: 'wp-' + id }), name))),
          h('h3', { text: 'Window color' }),
          h('div', { class: 'accents' }, Object.entries(OS.accents).map(([id, [hue, sat]]) =>
            h('button', { 'aria-pressed': s.accent === id, 'aria-label': id, title: id, style: `--c:hsl(${hue},${sat},55%)`, onclick: () => set('accent', id) }))),
          h('h3', { text: 'Startup' }),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.skip, onchange: e => set('skip', e.target.checked) }), 'Skip the boot and login screens next time'),
          h('div', { class: 'row' }, btn('Reset to defaults', () => { OS.resetSettings(); draw(); })));
      };
      w.body.classList.add('pad', 'prefs');
      draw();
    }
  });

  // ---- Terminal ----
  app({
    id: 'terminal', title: 'Terminal', icon: 'term', w: 660, h: 420, start: true,
    render(w) {
      let cwd = fs.root, hi = 0;
      const hist = [], t0 = Date.now(), p = OS.profile;
      const out = h('div', { class: 't-out', role: 'log', 'aria-live': 'polite' });
      const prompt = h('span', { class: 't-prompt' });
      const input = h('input', { class: 't-in', 'aria-label': 'Command', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
      const print = (s = '', cls) => out.append(h('div', { class: cls, text: s }));
      const setPrompt = () => { prompt.textContent = winPath(cwd) + '>'; };
      const missing = a => print(`The system cannot find the path: ${a}`, 't-err');
      const pick = (arg, kind, list, apply) => {
        if (!list[arg]) return print(`Usage: ${kind} <${Object.keys(list).join(' | ')}>`);
        OS.settings[kind === 'color' ? 'accent' : 'wall'] = arg;
        OS.save();
        print(apply + arg + '.');
      };

      const pub = {
        help: () => print([
          'help          this list',
          'about         who this computer belongs to',
          'whoami        who you are',
          'ls [-a]       list the current folder (dir works too)',
          'cd <folder>   change folder (cd .. goes up)',
          'pwd           print the current folder',
          'cat <file>    print a file (type works too)',
          'open <name>   open a file, folder or app in a window',
          'projects      list projects',
          'skills        list skills',
          'experience    list work history',
          'contact       how to reach Angelo',
          'history       commands typed this session',
          'echo, date, clear, exit',
          '',
          'Tab completes names. Up and Down recall commands.'
        ].join('\n')),
        about: () => print(`${p.name}\n${p.role}\n\n${p.blurb}`),
        whoami: () => print(`guest\nYou are visiting ${p.name}'s computer.`),
        ls: (arg, args) => {
          const all = args.some(a => /^[-/]a$/i.test(a));
          const path = args.filter(a => !/^[-/]a$/i.test(a)).join(' ');
          const d = path ? fs.resolve(path, cwd) : cwd;
          if (!d) return missing(path);
          if (d.type !== 'dir') return print(d.name);
          const items = fs.list(d, all);
          items.forEach(n => print(n.type === 'dir' ? n.name + '\\' : n.name, n.type === 'dir' ? 't-dir' : ''));
          if (!items.length) print('(empty)');
        },
        cd: arg => {
          if (!arg) return print(winPath(cwd));
          const d = fs.resolve(arg, cwd);
          if (!d) return missing(arg);
          if (d.type !== 'dir') return print(`${d.name} is a file. Try: cat ${d.name}`, 't-err');
          cwd = d;
        },
        pwd: () => print(winPath(cwd)),
        cat: arg => {
          if (!arg) return print('Usage: cat <file>');
          const n = fs.resolve(arg, cwd);
          if (!n) return missing(arg);
          if (n.type === 'dir') return print(`${n.name} is a folder. Try: cd ${n.name}`, 't-err');
          if (n.kind === 'txt') return print(n.text);
          print(n.kind === 'url' ? `Shortcut to ${n.url}\nTry: open ${n.name}` : `${n.name} is an image. Try: open ${n.name}`);
        },
        open: arg => {
          if (!arg) return print('Usage: open <file | folder | app>');
          // An app name wins over a folder of the same name; "open ./Projects" still reaches the folder.
          const a = Object.values(OS.apps).find(x => x.start && (x.id === arg.toLowerCase() || x.title.toLowerCase() === arg.toLowerCase()));
          if (a) return wm.open(a.id);
          const n = fs.resolve(arg, cwd);
          n ? OS.openNode(n) : missing(arg);
        },
        projects: () => print(OS.projects.map(x => `${x.name}\n  ${x.meta}`).join('\n') + '\n\nMore detail: open projects'),
        skills: () => print(OS.skills.map(g => `${g.group}\n  ${g.items.join(', ')}`).join('\n')),
        experience: () => print(OS.jobs.map(j => `${j.title}, ${j.org}\n  ${j.dates}`).join('\n') + '\n\nMore detail: cd Experience'),
        contact: () => print(p.links.slice(0, 3).map(l => `${l.label.padEnd(10)}${l.url.replace('mailto:', '')}`).join('\n')),
        history: () => print(hist.map((c, k) => `${String(k + 1).padStart(3)}  ${c}`).join('\n')),
        echo: arg => print(arg),
        date: () => print(new Date().toString()),
        clear: () => out.replaceChildren(),
        exit: () => w.close()
      };
      const secret = {
        dir: pub.ls, type: pub.cat, cls: pub.clear,
        neofetch: () => print([
          '    ______       guest@angelos',
          '   (______)      -------------',
          '    .----.       OS:         AngelOS 7 Personal Edition',
          "  .'      '.     Host:       " + location.host,
          ' /          \\    Uptime:     ' + Math.round((Date.now() - t0) / 1000) + 's in this terminal',
          ' |          |    Resolution: ' + innerWidth + 'x' + innerHeight,
          ' \\          /    Wallpaper:  ' + OS.walls[OS.settings.wall],
          "  '.______.'     Owner:      " + p.name
        ].join('\n')),
        color: arg => pick(arg, 'color', OS.accents, 'Window color set to '),
        wallpaper: arg => pick(arg, 'wallpaper', OS.walls, 'Wallpaper set to '),
        sudo: () => print('guest is not in the sudoers file. This incident will be reported.', 't-err'),
        rm: () => print('Access denied. The guest account is read-only, so everything is still here.', 't-err'),
        xyzzy: () => print('Nothing happens.')
      };

      function run(line) {
        print(prompt.textContent + ' ' + line, 't-echo');
        const text = line.trim();
        if (text) {
          hist.push(text);
          const [c, ...args] = text.split(/\s+/);
          const f = pub[c.toLowerCase()] || secret[c.toLowerCase()];
          f ? f(args.join(' '), args) : print(`'${c}' is not recognized as a command. Type "help" for a list.`, 't-err');
        }
        hi = hist.length;
        setPrompt();
      }

      function complete() {
        const v = input.value, sp = v.indexOf(' ');
        let found, fill;
        if (sp < 0) {
          found = Object.keys(pub).filter(k => k.startsWith(v.toLowerCase()));
          fill = k => k + ' ';
        } else {
          const rest = v.slice(sp + 1);
          const cut = Math.max(rest.lastIndexOf('/'), rest.lastIndexOf('\\')) + 1;
          const base = cut ? fs.resolve(rest.slice(0, cut), cwd) : cwd;
          if (!base || base.type !== 'dir') return;
          found = fs.list(base, true).filter(n => n.name.toLowerCase().startsWith(rest.slice(cut).toLowerCase()));
          fill = n => v.slice(0, sp + 1) + rest.slice(0, cut) + n.name + (n.type === 'dir' ? '/' : '');
        }
        if (found.length === 1) input.value = fill(found[0]);
        else if (found.length > 1) { print(found.map(n => n.name || n).join('   ')); w.body.scrollTop = w.body.scrollHeight; }
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          run(input.value);
          input.value = '';
          w.body.scrollTop = w.body.scrollHeight;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          hi = Math.max(0, Math.min(hist.length, hi + (e.key === 'ArrowUp' ? -1 : 1)));
          input.value = hist[hi] || '';
        } else if (e.key === 'Tab' && input.value) {
          // An empty prompt lets Tab leave the terminal, so keyboard users are never trapped.
          e.preventDefault();
          complete();
        }
      });

      w.body.classList.add('term');
      w.body.append(out, h('div', { class: 't-line' }, prompt, input));
      w.body.addEventListener('click', () => { if (!String(getSelection())) input.focus(); });
      print('AngelOS 7 Terminal\nType "help" for commands.\n');
      setPrompt();
      input.focus();
    }
  });
})();
