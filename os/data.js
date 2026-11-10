'use strict';
// Content, DOM helpers and the virtual file system. All site copy lives here.
window.OS = { apps: {} };

OS.h = (tag, attrs, ...kids) => {
  const el = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter(k => k != null && k !== false));
  return el;
};

// A sprite symbol name ("folder") or an image path ("icons/x.png").
OS.icon = (name, cls = '') => {
  if (/[./]/.test(name)) return OS.h('img', { class: 'ico ' + cls, src: name, alt: '' });
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', 'ico ' + cls);
  s.setAttribute('viewBox', '0 0 48 48');
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(NS, 'use');
  u.setAttribute('href', '#i-' + name);
  s.append(u);
  return s;
};

OS.coarse = () => matchMedia('(pointer: coarse)').matches;

OS.profile = {
  name: 'Angelo Kodra',
  role: 'Associate Software Engineer at Teladoc Health',
  blurb: 'I build and maintain backend services that support member identity, healthcare benefits, and eligibility. I work with Ruby on Rails, MySQL, Docker, Jenkins, and Kafka, with a focus on reliable APIs, testing, integrations, and developer tooling.',
  facts: [['Focus', 'Backend, APIs, CI/CD'], ['Education', 'B.S. Computer Science, Wayne State University'], ['Based in', 'Metro Detroit']],
  about: [
    'I am a software engineer at Teladoc Health and a Computer Science graduate of Wayne State University. My work is in places where data correctness matters: APIs that answer questions about members and their coverage, the tests that keep those answers right, and the build and CI tooling that lets a team ship changes with confidence.',
    'Before moving into software engineering, I spent years in IT support and device repair, from a high-volume repair bench to enterprise endpoint support. That work taught me to ask the right questions, isolate root causes, and explain fixes clearly. I still rely on those habits when I trace an issue across services.',
    'Outside of work I keep building, including SOLTETHER, a 2D RPG in Unity, and its companion website.'
  ],
  email: 'angkodra@gmail.com',
  links: [
    { label: 'Email', detail: 'angkodra@gmail.com', url: 'mailto:angkodra@gmail.com', icon: 'icons/email.png' },
    { label: 'LinkedIn', detail: 'linkedin.com/in/angelo-kodra-aa08a821b', url: 'https://www.linkedin.com/in/angelo-kodra-aa08a821b', icon: 'icons/linkedin.png' },
    { label: 'GitHub', detail: 'github.com/anxhk7', url: 'https://github.com/anxhk7', icon: 'icons/github.png' },
    { label: 'Classic site', detail: 'The same content on one plain page', url: 'classic.html', icon: 'web' }
  ]
};

OS.skills = [
  { group: 'Languages & frameworks', items: ['Ruby', 'Ruby on Rails', 'Scala', 'SQL', 'Python', 'FastAPI', 'C#/.NET', 'TypeScript', 'React Native', 'C++', 'Unity'] },
  { group: 'Data & messaging', items: ['MySQL', 'PostgreSQL', 'Elasticsearch', 'Redis', 'Kafka', 'Karafka'] },
  { group: 'APIs', items: ['REST/JSON', 'GraphQL', 'Swagger/OpenAPI', 'Postman'] },
  { group: 'Testing, CI & tooling', items: ['RSpec', 'RuboCop', 'Docker', 'Jenkins', 'Git/GitHub', 'Jira', 'Confluence'] },
  { group: 'IT & systems', items: ['Microsoft 365', 'Active Directory', 'Azure', 'Windows', 'macOS'] }
];

OS.jobs = [
  {
    file: 'teladoc_health.txt', title: 'Associate Software Engineer', org: 'Teladoc Health', dates: 'Jul 2026 to Present', place: 'Remote', icon: 'icons/teladoc.png',
    body: [
      'I work on backend services that determine which healthcare programs and benefits members can access based on their eligibility and coverage. These systems help power registration and enrollment experiences across Teladoc Health.',
      "I was selected for the inaugural cohort of Teladoc Health's Early Career Engineering Program, where I contribute to the development of the program for future engineers."
    ],
    bullets: [
      'Develop and maintain Ruby on Rails APIs for member search, identity matching, and benefit and coverage data.',
      'Add RSpec coverage, refine API behavior, and resolve linting issues to keep services reliable and maintainable.',
      'Work on Ruby runtime and container upgrades, Docker-based development environments, and Jenkins pipelines.',
      'Built the initial version of a configurable Jenkins pipeline that automates test data generation and environment setup for QA and integration testing.',
      'Debug Kafka event processing and data integration issues with engineers, QA, and product partners in an Agile team.'
    ],
    tags: ['Ruby on Rails', 'MySQL', 'Kafka', 'Docker', 'Jenkins', 'RSpec']
  },
  {
    file: 'owl_services.txt', title: 'Information Technology Intern', org: 'OWL Services', dates: 'Aug 2025 to May 2026', icon: 'icons/owlservices.png',
    body: ['Supported enterprise users and endpoints in a Windows, Microsoft 365, and Active Directory environment. Troubleshot access, device, application, and integration issues, documented recurring patterns, and escalated with clear technical context.'],
    tags: ['Microsoft 365', 'Active Directory', 'Endpoint support']
  },
  {
    file: 'geek_squad.txt', title: 'Advanced Repair Agent', org: 'Geek Squad', dates: 'Oct 2022 to Sep 2026', icon: 'icons/geeksquad.png',
    body: ['Diagnosed and resolved hardware, operating system, software, and data issues across Windows, macOS, Android, and iOS devices in a high-volume repair environment, with accurate notes and clear customer communication.'],
    tags: ['Hardware repair', 'OS troubleshooting', 'Client support']
  },
  {
    file: 'wayne_state_ta.txt', title: 'Teaching Assistant', org: 'Wayne State', dates: 'Aug 2023 to Aug 2024', icon: 'icons/teaching.png',
    body: ['Supported engineering labs covering Siemens NX, Arduino/C++, circuit behavior, 3D printing workflows, and design fundamentals. Helped students debug code, wiring, and project deliverables.'],
    tags: ['Arduino', 'C++', 'Siemens NX']
  }
];

OS.projects = [
  {
    id: 'speechmatch', name: 'SpeechMatch', meta: 'Senior capstone · Pronunciation assessment mobile app', icon: 'icons/speechmatch.png',
    body: 'React Native mobile app for reading and pronunciation practice. Users select or upload a passage, record themselves, and receive word-level feedback on pronunciation, skipped words, extra words, and timing. I led frontend development and worked across the recording flow, API integration, scoring output, and custom mispronunciation logic built on top of Azure Speech Services.',
    highlights: [
      ['Role', 'Frontend lead', 'Built mobile screens, recording UX, results views, and session feedback flows.'],
      ['Stack', 'React Native + FastAPI', 'Expo, TypeScript, Python/FastAPI, PostgreSQL, and Azure Speech.'],
      ['Focus', 'Scoring logic', 'Word-level feedback, phoneme comparison, and recognition edge cases.']
    ],
    tags: ['React Native', 'Expo', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Azure Speech'],
    links: []
  },
  {
    id: 'soltether', name: 'SOLTETHER', meta: 'Solo game project · Web + Unity', icon: 'icons/unity.png',
    body: 'Solo 2D RPG project with a deployed companion website at soltether.com. I designed and shipped the site end-to-end, including layout, visual direction, custom CSS animation, hosted deployment, DNS setup, and audio/interaction details. The game itself is being built in Unity with C# systems, tile-based room design, and original creative direction.',
    tags: ['HTML/CSS', 'JavaScript', 'GitHub Pages', 'DNS', 'Unity', 'C#'],
    links: [['Visit site', 'https://soltether.com', 'soltether.com.url']]
  },
  {
    id: 'digital-windex', name: 'Digital Windex', meta: 'Windows productivity utility · Team project', icon: 'icons/windows.png',
    body: 'C#/.NET WPF application that helps non-technical users run Windows diagnostics, maintenance, and repair tasks from a simpler interface. I proposed the original concept, helped define the product scope, and contributed to implementation and documentation as part of a student team.',
    tags: ['C#', '.NET', 'WPF', 'Windows', 'UX'],
    links: [['View on GitHub', 'https://github.com/WSU-4110/Digital-Windex', 'github_repo.url']]
  }
];

// ---- Virtual file system (shared by Files and Terminal) ----
(() => {
  const dir = (name, children, extra) => ({ name, type: 'dir', children, ...extra });
  const txt = (name, text, extra) => ({ name, type: 'file', kind: 'txt', text, ...extra });
  const img = (name, src) => ({ name, type: 'file', kind: 'img', src });
  const url = (name, href) => ({ name, type: 'file', kind: 'url', url: href });
  const p = OS.profile;

  const jobText = j => [
    j.title, j.org, j.dates + (j.place ? ' · ' + j.place : ''), '',
    j.body.join('\n\n'),
    j.bullets ? '\n' + j.bullets.map(b => '  * ' + b).join('\n') : '',
    '', 'Tags: ' + j.tags.join(', ')
  ].join('\n');

  const projText = x => [
    x.name, x.meta, '', x.body,
    x.highlights ? '\n' + x.highlights.map(([k, t, d]) => `${k}: ${t}. ${d}`).join('\n') : '',
    '', 'Tags: ' + x.tags.join(', ')
  ].join('\n');

  const root = dir('', [
    dir('About Me', [
      txt('about.txt', [p.name, p.role, '', p.blurb, '', ...p.about.flatMap(t => [t, ''])].join('\n').trim()),
      txt('quick_facts.txt', p.facts.map(([k, v]) => `${k}: ${v}`).join('\n')),
      img('portrait.jpg', 'ak-face.jpeg'),
      txt('.plan', 'Current plan:\n\n  1. Keep the backend services reliable.\n  2. Keep building SOLTETHER.')
    ]),
    dir('Projects', OS.projects.map(x => dir(x.name, [
      txt('readme.txt', projText(x)),
      img('icon.png', x.icon),
      ...x.links.map(([, href, file]) => url(file, href))
    ]))),
    dir('Experience', OS.jobs.map(j => txt(j.file, jobText(j)))),
    dir('Skills', OS.skills.map(g => txt(g.group.toLowerCase().replace(/[^a-z]+/g, '_') + '.txt', g.group + '\n\n' + g.items.map(i => '  * ' + i).join('\n')))),
    dir('Contact', [
      url('email.url', p.links[0].url),
      url('linkedin.url', p.links[1].url),
      url('github.url', p.links[2].url)
    ]),
    dir('Archive', [
      txt('readme.txt', 'The earlier single-page version of this site still lives at classic.html.\nSame content, no boot screen. Open classic_site.url to visit it.'),
      url('classic_site.url', 'classic.html'),
      dir('.attic', [
        txt('readme.txt', 'You turned on hidden files. Good instinct.\n\ncheat_codes.txt is worth a look.'),
        txt('cheat_codes.txt', 'Terminal commands that "help" does not list:\n\n  neofetch          system summary\n  color <name>      change the accent color\n  wallpaper <name>  change the wallpaper\n  sudo <anything>   worth a try\n  xyzzy             an old one\n  rm -rf /          go ahead')
      ])
    ]),
    dir('Recycle Bin', [
      txt('homework_final_FINAL_v3.txt', 'This file was replaced by homework_final_FINAL_v4.txt.\n\nThat one is also in the bin.'),
      txt('free_ringtones.exe.txt', 'Scan complete.\n\n  Ringtones found:     0\n  Toolbars installed: 14')
    ], { hidden: true })
  ]);

  (function link(n) {
    for (const c of n.children || []) {
      c.parent = n;
      c.hidden = c.hidden || c.name.startsWith('.');
      link(c);
    }
  })(root);

  OS.fs = {
    root,
    path(n) { const s = []; for (; n.parent; n = n.parent) s.unshift(n.name); return '/' + s.join('/'); },
    list: (n, all) => n.children.filter(c => all || !c.hidden),
    // Accepts / or \ separators, an optional C: prefix, and any letter case.
    resolve(str, cwd) {
      str = str.trim().replace(/^c:/i, '');
      let n = /^[\\/]/.test(str) ? root : cwd;
      for (const seg of str.split(/[\\/]+/)) {
        if (!seg || seg === '.') continue;
        if (seg === '..') { n = n.parent || n; continue; }
        n = n.type === 'dir' && n.children.find(c => c.name.toLowerCase() === seg.toLowerCase());
        if (!n) return null;
      }
      return n;
    },
    // Visits every visible node below the root.
    walk(fn, n = root) { for (const c of n.children || []) if (!c.hidden) { fn(c); OS.fs.walk(fn, c); } }
  };

  OS.iconFor = n => n.type === 'dir' ? (n.name === 'Recycle Bin' ? 'bin' : 'folder') : n.kind === 'img' ? n.src : n.kind;
  OS.typeOf = n => n.type === 'dir' ? 'File folder' : n.kind === 'txt' ? 'Text document' : n.kind === 'url' ? 'Internet shortcut' : n.name.split('.').pop().toUpperCase() + ' image';
  OS.sizeOf = n => n.kind === 'txt' ? new Blob([n.text]).size + ' bytes' : n.type === 'dir' ? n.children.length + (n.children.length === 1 ? ' item' : ' items') : '';
})();
