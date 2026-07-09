/* ============================================================
   Browser OS — Web Desktop Application
   Design premium · multiusuário · sem overlay offline intrusivo
   ============================================================ */

(function() {
'use strict';

// ===== CONFIG =====
const CONFIG = {
  appName: 'Browser OS',
  version: '1.1.0',
  // Usuários padrão (sempre presentes). Usuários cadastrados são adicionados via localStorage.
  defaultUsers: [
    { username: 'admin', password: 'admin', name: 'Administrador', role: 'admin', builtin: true },
    { username: 'user',  password: 'user',  name: 'Usuário',       role: 'user',  builtin: true },
    { username: 'guest', password: '',      name: 'Convidado',      role: 'guest', builtin: true }
  ],
  sessionKey: 'browseros_session',
  usersKey: 'browseros_users',  // usuários cadastrados persistem aqui
  storagePrefix: 'browseros_'
};

// Retorna usuários padrão + cadastrados
function getAllUsers() {
  const custom = JSON.parse(localStorage.getItem(CONFIG.usersKey) || '[]');
  return [...CONFIG.defaultUsers, ...custom];
}

// Salva um novo usuário cadastrado
function saveCustomUser(user) {
  const custom = JSON.parse(localStorage.getItem(CONFIG.usersKey) || '[]');
  custom.push(user);
  localStorage.setItem(CONFIG.usersKey, JSON.stringify(custom));
}

// Verifica se username já existe
function userExists(username) {
  return getAllUsers().some(u => u.username.toLowerCase() === username.toLowerCase());
}

// ===== STATE =====
const state = {
  currentUser: null,
  sessionStart: Date.now(),
  windows: [],
  zIndex: 100,
  intervals: []
};

// ===== DOM HELPERS =====
const $ = (id) => document.getElementById(id);
const app = $('app');
const el = (tag, props = {}, children = []) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  if (typeof props.innerHTML === 'string') e.innerHTML = props.innerHTML;
  if (props.className) e.className = props.className;
  if (props.onClick) e.addEventListener('click', props.onClick);
  if (children) (Array.isArray(children) ? children : [children]).forEach(c => {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
};

// ============================================================
// LOGIN SCREEN (com opção de cadastro)
// ============================================================
function renderLogin() {
  app.innerHTML = '';
  const card = el('div', { className: 'login-card' });
  card.innerHTML = `
    <div class="login-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </div>
    <h1 class="login-title">${CONFIG.appName}</h1>
    <p class="login-subtitle">Sistema Web · Multiusuário</p>

    <form id="login-form" class="login-form">
      <div class="input-group">
        <input type="text" id="username" placeholder=" " autocomplete="username" required autofocus>
        <label>Usuário</label>
      </div>
      <div class="input-group">
        <input type="password" id="password" placeholder=" " autocomplete="current-password" required>
        <label>Senha</label>
      </div>
      <button type="submit" class="btn-primary">Entrar</button>
      <p class="login-hint">Dica: admin / admin &nbsp;·&nbsp; user / user &nbsp;·&nbsp; guest</p>
      <p class="login-error" id="login-error"></p>
      <div class="login-divider"><span>ou</span></div>
      <button type="button" id="show-register-btn" class="btn-link">Criar nova conta</button>
    </form>

    <div class="login-footer">
      ${CONFIG.appName} v${CONFIG.version} &nbsp;·&nbsp; ${navigator.platform}
    </div>
  `;
  const screen = el('div', { className: 'login-screen' }, [card]);
  app.appendChild(screen);

  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = $('username').value.trim();
    const password = $('password').value;
    const user = getAllUsers().find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    const errorEl = $('login-error');
    if (!user) {
      errorEl.textContent = 'Usuário ou senha inválidos';
      return;
    }
    state.currentUser = user;
    localStorage.setItem(CONFIG.sessionKey, JSON.stringify({ username: user.username, start: Date.now() }));
    renderDesktop();
  });

  $('show-register-btn').addEventListener('click', renderRegister);
}

// ============================================================
// REGISTER SCREEN (criar nova conta)
// ============================================================
function renderRegister() {
  app.innerHTML = '';
  const card = el('div', { className: 'login-card' });
  card.innerHTML = `
    <div class="login-logo" style="background: linear-gradient(135deg, #22c55e, #10b981); box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/>
        <line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
    </div>
    <h1 class="login-title" style="background: linear-gradient(135deg, #22c55e, #10b981); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Criar Conta</h1>
    <p class="login-subtitle">Cadastre-se para acessar o sistema</p>

    <form id="register-form" class="login-form">
      <div class="input-group">
        <input type="text" id="reg-name" placeholder=" " required autofocus>
        <label>Nome completo</label>
      </div>
      <div class="input-group">
        <input type="text" id="reg-username" placeholder=" " required>
        <label>Usuário (login)</label>
      </div>
      <div class="input-group">
        <input type="password" id="reg-password" placeholder=" " required minlength="4">
        <label>Senha (mín. 4 caracteres)</label>
      </div>
      <div class="input-group">
        <input type="password" id="reg-password2" placeholder=" " required>
        <label>Confirmar senha</label>
      </div>
      <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #22c55e, #10b981);">Criar conta</button>
      <p class="login-error" id="register-error"></p>
      <div class="login-divider"><span>ou</span></div>
      <button type="button" id="back-to-login-btn" class="btn-link">Voltar para login</button>
    </form>

    <div class="login-footer">
      ${CONFIG.appName} v${CONFIG.version}
    </div>
  `;
  const screen = el('div', { className: 'login-screen' }, [card]);
  app.appendChild(screen);

  $('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('reg-name').value.trim();
    const username = $('reg-username').value.trim();
    const password = $('reg-password').value;
    const password2 = $('reg-password2').value;
    const errorEl = $('register-error');

    if (name.length < 2) { errorEl.textContent = 'Nome muito curto'; return; }
    if (username.length < 3) { errorEl.textContent = 'Usuário deve ter pelo menos 3 caracteres'; return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) { errorEl.textContent = 'Usuário só pode ter letras, números, _, . e -'; return; }
    if (password.length < 4) { errorEl.textContent = 'Senha deve ter pelo menos 4 caracteres'; return; }
    if (password !== password2) { errorEl.textContent = 'As senhas não conferem'; return; }
    if (userExists(username)) { errorEl.textContent = 'Este usuário já existe'; return; }

    // Salva
    const newUser = { username, password, name, role: 'user', builtin: false, created: new Date().toISOString() };
    saveCustomUser(newUser);

    // Login automático
    state.currentUser = newUser;
    localStorage.setItem(CONFIG.sessionKey, JSON.stringify({ username: newUser.username, start: Date.now() }));
    renderDesktop();
  });

  $('back-to-login-btn').addEventListener('click', renderLogin);
}

// ============================================================
// DESKTOP
// ============================================================
function renderDesktop() {
  app.innerHTML = '';
  const desktop = el('div', { className: 'desktop' });

  // Topbar
  const topbar = el('div', { className: 'topbar' });
  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="icon-btn" id="apps-menu-btn" title="Aplicativos">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      </button>
      <div class="topbar-title">
        <div class="logo-mini">B</div>
        <span>${CONFIG.appName}</span>
      </div>
    </div>
    <div class="topbar-center">
      <span id="user-display">${state.currentUser.name}</span>
    </div>
    <div class="topbar-right">
      <div class="clock-display">
        <span class="time" id="clock">--:--</span>
        <span class="date" id="date">--/--/----</span>
      </div>
      <button class="icon-btn" id="logout-btn" title="Sair">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  `;
  desktop.appendChild(topbar);

  // Apps menu (hidden initially)
  const appsMenu = el('div', { className: 'apps-menu hidden', id: 'apps-menu' });
  appsMenu.innerHTML = `
    <input type="text" id="apps-search" placeholder="Buscar aplicativos..." class="apps-search">
    <div class="apps-grid" id="apps-grid"></div>
  `;
  desktop.appendChild(appsMenu);

  // Workspace
  const workspace = el('div', { className: 'workspace', id: 'workspace' });
  workspace.innerHTML = `
    <div class="desktop-icons" id="desktop-icons"></div>
    <div id="windows-container"></div>
  `;
  desktop.appendChild(workspace);

  // Statusbar
  const statusbar = el('div', { className: 'statusbar' });
  statusbar.innerHTML = `
    <span id="conn-status" class="status-ok"><span class="status-dot">●</span>Online</span>
    <span id="session-info">Sessão: ${state.currentUser.username}</span>
    <span style="margin-left:auto" id="uptime">uptime: 00:00:00</span>
  `;
  desktop.appendChild(statusbar);

  app.appendChild(desktop);

  // Bind events
  bindDesktopEvents();
  renderDesktopIcons();
  renderAppsMenu('');
  startClock();
  startUptime();
  startOnlineMonitor();
  // Open welcome
  setTimeout(() => openApp('welcome'), 400);
}

function bindDesktopEvents() {
  $('apps-menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('apps-menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) $('apps-search').focus();
  });
  $('apps-search').addEventListener('input', (e) => renderAppsMenu(e.target.value));
  $('logout-btn').addEventListener('click', logout);
  document.addEventListener('click', (e) => {
    const menu = $('apps-menu');
    if (!menu.classList.contains('hidden') &&
        !menu.contains(e.target) &&
        e.target.id !== 'apps-menu-btn' &&
        !e.target.closest('#apps-menu-btn')) {
      menu.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('apps-menu').classList.add('hidden');
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault(); logout();
    }
  });
}

function logout() {
  if (!confirm('Encerrar sessão?')) return;
  // Clear intervals
  state.intervals.forEach(clearInterval);
  state.intervals = [];
  localStorage.removeItem(CONFIG.sessionKey);
  state.currentUser = null;
  state.windows = [];
  renderLogin();
}

// ============================================================
// CLOCK / UPTIME
// ============================================================
function startClock() {
  const update = () => {
    const now = new Date();
    const t = $('clock'), d = $('date');
    if (t) t.textContent = now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    if (d) d.textContent = now.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
  };
  update();
  state.intervals.push(setInterval(update, 1000));
}

function startUptime() {
  const update = () => {
    const s = Math.floor((Date.now() - state.sessionStart) / 1000);
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sec = String(s%60).padStart(2,'0');
    const u = $('uptime');
    if (u) u.textContent = `uptime: ${h}:${m}:${sec}`;
  };
  update();
  state.intervals.push(setInterval(update, 1000));
}

// ============================================================
// ONLINE MONITOR (não-bloqueante)
// ============================================================
function startOnlineMonitor() {
  const check = () => {
    const online = navigator.onLine;
    const s = $('conn-status');
    if (!s) return;
    if (online) {
      s.className = 'status-ok';
      s.innerHTML = '<span class="status-dot">●</span>Online';
      removeOfflineBanner();
    } else {
      s.className = 'status-err';
      s.innerHTML = '<span class="status-dot">●</span>Offline';
      showOfflineBanner();
    }
  };
  check();
  state.intervals.push(setInterval(check, 5000));
  window.addEventListener('online', check);
  window.addEventListener('offline', check);
}

function showOfflineBanner() {
  if ($('offline-banner')) return;
  const banner = el('div', { id: 'offline-banner', className: 'offline-banner' });
  banner.innerHTML = `
    <div class="spinner"></div>
    <span>Sem conexão · tentando reconectar...</span>
  `;
  app.appendChild(banner);
}

function removeOfflineBanner() {
  const b = $('offline-banner');
  if (b) b.remove();
}

// ============================================================
// APPS REGISTRY
// ============================================================

// Helper: cria app que abre site externo num iframe
function webApp(id, name, icon, color, url, w = 960, h = 620) {
  return {
    name, icon, color, width: w, height: h,
    render: (win) => {
      setTimeout(() => {
        const iframe = win.querySelector('#wa-frame');
        const input = win.querySelector('#wa-url');
        const goBtn = win.querySelector('#wa-go');
        const openBtn = win.querySelector('#wa-open');
        const reloadBtn = win.querySelector('#wa-reload');
        const goUrl = () => {
          let u = input.value.trim();
          if (!u) return;
          if (!/^https?:\/\//.test(u)) {
            u = 'https://' + u;
            input.value = u;
          }
          try { iframe.src = u; } catch(e) {}
        };
        goBtn.addEventListener('click', goUrl);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') goUrl(); });
        openBtn.addEventListener('click', () => { if (input.value) window.open(input.value, '_blank'); });
        reloadBtn.addEventListener('click', () => { iframe.src = iframe.src; });
        // Pré-preencher e carregar
        input.value = url;
        iframe.src = url;
      }, 50);
      return `
        <div class="browser-app">
          <div class="browser-toolbar">
            <button id="wa-reload" class="browser-go" style="background:#64748b;padding:10px 14px" title="Recarregar">↻</button>
            <input id="wa-url" type="text" placeholder="https://exemplo.com" class="browser-input">
            <button id="wa-go" class="browser-go">Ir</button>
            <button id="wa-open" class="browser-go" style="background:#22c55e" title="Abrir em nova aba">↗</button>
          </div>
          <iframe id="wa-frame" class="browser-frame" src="about:blank"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
          <p class="browser-note">Se o site não carregar, clique em ↗ para abrir em nova aba (alguns sites bloqueiam iframe).</p>
        </div>
      `;
    }
  };
}

const APPS = {
  welcome: {
    name: 'Bem-vindo', icon: '👋', color: '#3b82f6',
    width: 540, height: 400,
    render: () => `
      <div class="app-welcome">
        <div class="emoji">👋</div>
        <h2>Bem-vindo ao ${CONFIG.appName}</h2>
        <p>
          Conectado como <strong style="color:#fff">${state.currentUser.name}</strong><br>
          Use o menu de aplicativos (⊞ no topo) para abrir programas.
        </p>
        <p style="color:#64748b;font-size:12px;margin-top:24px">
          ${CONFIG.appName} v${CONFIG.version}<br>
          Sessão iniciada: ${new Date(state.sessionStart).toLocaleString('pt-BR')}
        </p>
      </div>
    `
  },
  browser: {
    name: 'Navegador', icon: '🌐', color: '#22c55e',
    width: 920, height: 600,
    render: (win) => {
      setTimeout(() => {
        const iframe = win.querySelector('#browser-frame');
        const input = win.querySelector('#browser-url');
        const goBtn = win.querySelector('#browser-go');
        const goUrl = () => {
          let url = input.value.trim();
          if (!url) return;
          if (!/^https?:\/\//.test(url)) {
            url = 'https://' + url;
            input.value = url;
          }
          try { iframe.src = url; } catch(e) {}
        };
        goBtn.addEventListener('click', goUrl);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') goUrl(); });
      }, 50);
      return `
        <div class="browser-app">
          <div class="browser-toolbar">
            <input id="browser-url" type="text" placeholder="https://exemplo.com" class="browser-input">
            <button id="browser-go" class="browser-go">Ir</button>
          </div>
          <iframe id="browser-frame" class="browser-frame" src="about:blank"></iframe>
          <p class="browser-note">Nota: alguns sites bloqueiam exibição em iframe por segurança.</p>
        </div>
      `;
    }
  },
  notes: {
    name: 'Notas', icon: '📝', color: '#f59e0b',
    width: 500, height: 420,
    render: (win) => {
      const key = CONFIG.storagePrefix + 'notes_' + state.currentUser.username;
      setTimeout(() => {
        const ta = win.querySelector('#notes-textarea');
        ta.value = localStorage.getItem(key) || '';
        ta.addEventListener('input', () => localStorage.setItem(key, ta.value));
      }, 50);
      return `<textarea id="notes-textarea" class="notes-area" placeholder="Escreva suas notas... (salvo automaticamente)"></textarea>`;
    }
  },
  calculator: {
    name: 'Calculadora', icon: '🔢', color: '#8b5cf6',
    width: 300, height: 400,
    render: (win) => {
      setTimeout(() => {
        const display = win.querySelector('#calc-display');
        let current = '0', prev = null, op = null;
        const update = () => { display.textContent = current; };
        const press = (val) => {
          if (val === 'C') { current = '0'; prev = null; op = null; }
          else if (val === '=') {
            if (op && prev !== null) {
              const a = parseFloat(prev), b = parseFloat(current);
              let r = 0;
              if (op === '+') r = a + b;
              else if (op === '-') r = a - b;
              else if (op === '×') r = a * b;
              else if (op === '÷') r = b === 0 ? 'Erro' : a / b;
              current = String(r); prev = null; op = null;
            }
          }
          else if (['+','-','×','÷'].includes(val)) {
            if (op && prev !== null) press('=');
            prev = current; op = val; current = '0';
          }
          else if (val === '.') { if (!current.includes('.')) current += '.'; }
          else { current = current === '0' ? val : current + val; }
          update();
        };
        win.querySelectorAll('.calc-btn').forEach(btn => btn.addEventListener('click', () => press(btn.dataset.val)));
      }, 50);
      return `
        <div id="calc-display" class="calc-display">0</div>
        <div class="calc-grid">
          <button class="calc-btn calc-btn-cl" data-val="C">C</button>
          <button class="calc-btn" data-val="÷">÷</button>
          <button class="calc-btn" data-val="×">×</button>
          <button class="calc-btn" data-val="-">-</button>
          <button class="calc-btn" data-val="7">7</button>
          <button class="calc-btn" data-val="8">8</button>
          <button class="calc-btn" data-val="9">9</button>
          <button class="calc-btn" data-val="+">+</button>
          <button class="calc-btn" data-val="1">1</button>
          <button class="calc-btn" data-val="2">2</button>
          <button class="calc-btn" data-val="3">3</button>
          <button class="calc-btn calc-btn-eq" data-val="=" style="grid-row:span 3">=</button>
          <button class="calc-btn" data-val="4">4</button>
          <button class="calc-btn" data-val="5">5</button>
          <button class="calc-btn" data-val="6">6</button>
          <button class="calc-btn" data-val="0" style="grid-column:span 2">0</button>
          <button class="calc-btn" data-val=".">.</button>
        </div>
      `;
    }
  },
  terminal: {
    name: 'Terminal', icon: '⌨️', color: '#10b981',
    width: 680, height: 420,
    render: (win) => {
      setTimeout(() => {
        const output = win.querySelector('#term-output');
        const input = win.querySelector('#term-input');
        const prompt = `${state.currentUser.username}@browser-os:~$ `;
        const cmds = {
          help: () => `Comandos: help, whoami, date, echo, clear, about, ls, uptime, whoami`,
          whoami: () => state.currentUser.username,
          date: () => new Date().toString(),
          about: () => `${CONFIG.appName} v${CONFIG.version}\nWeb desktop para terminais burros\n100% client-side, multiusuário`,
          clear: () => { output.innerHTML = ''; return null; },
          ls: () => Object.keys(APPS).map(k => `${k}.app`).join('\n'),
          uptime: () => {
            const s = Math.floor((Date.now() - state.sessionStart)/1000);
            return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`;
          }
        };
        output.innerHTML = `<div style="color:#60a5fa">${CONFIG.appName} v${CONFIG.version} — digite 'help'</div><br>`;
        const exec = () => {
          const cmd = input.value.trim();
          const div = document.createElement('div');
          div.style.color = '#94a3b8';
          div.textContent = prompt + cmd;
          output.appendChild(div);
          if (cmd) {
            const parts = cmd.split(/\s+/);
            let result;
            if (parts[0] === 'echo') result = parts.slice(1).join(' ');
            else if (cmds[parts[0]]) result = cmds[parts[0]]();
            else result = `comando não encontrado: ${parts[0]}`;
            if (result !== null && result !== undefined) {
              const r = document.createElement('div');
              r.style.color = '#22c55e';
              r.style.whiteSpace = 'pre-wrap';
              r.textContent = result;
              output.appendChild(r);
            }
          }
          output.scrollTop = output.scrollHeight;
          input.value = '';
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') exec(); });
        win.querySelector('#term-prompt').textContent = prompt;
        input.focus();
      }, 50);
      return `
        <div id="term-output" class="terminal-output"></div>
        <div class="terminal-input-line">
          <span id="term-prompt" style="color:#22c55e;font-family:monospace;font-size:13px"></span>
          <input id="term-input" class="terminal-input" type="text" autocomplete="off">
        </div>
      `;
    }
  },
  settings: {
    name: 'Sistema', icon: '⚙️', color: '#64748b',
    width: 500, height: 440,
    render: () => {
      const info = {
        'Sistema': CONFIG.appName,
        'Versão': CONFIG.version,
        'Usuário': state.currentUser.name,
        'Permissão': state.currentUser.role,
        'Início da sessão': new Date(state.sessionStart).toLocaleString('pt-BR'),
        'Navegador': navigator.userAgent.split(' ').pop(),
        'Plataforma': navigator.platform,
        'Resolução': `${screen.width}×${screen.height}`,
        'Idioma': navigator.language,
        'Cores': screen.colorDepth + ' bits',
        'Online': navigator.onLine ? 'Sim' : 'Não'
      };
      const rows = Object.entries(info).map(([k,v]) =>
        `<div class="settings-item"><span>${k}</span><span class="settings-value">${v}</span></div>`
      ).join('');
      return `<div class="settings-list">${rows}</div>`;
    }
  },
  clock: {
    name: 'Relógio', icon: '🕐', color: '#ef4444',
    width: 340, height: 220,
    render: (win) => {
      const update = () => {
        const now = new Date();
        const time = now.toLocaleTimeString('pt-BR');
        const date = now.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
        const t = win.querySelector('#clock-time');
        const d = win.querySelector('#clock-date');
        if (t) t.textContent = time;
        if (d) d.textContent = date;
      };
      update();
      win._interval = setInterval(update, 1000);
      state.intervals.push(win._interval);
      return `
        <div class="clock-app">
          <div id="clock-time" class="clock-time">--:--:--</div>
          <div id="clock-date" class="clock-date"></div>
        </div>
      `;
    },
    onClose: (win) => { if (win._interval) clearInterval(win._interval); }
  },

  // ============================================================
  // APPS EXTERNOS (sites em iframe)
  // ============================================================
  youtube: webApp('youtube', 'YouTube', '🎬', '#ff0000', 'https://www.youtube.com/'),
  wikipedia: webApp('wikipedia', 'Wikipédia', '📚', '#000000', 'https://pt.wikipedia.org/'),
  maps: webApp('maps', 'Google Maps', '🗺️', '#34a853', 'https://www.google.com/maps/'),
  gmail: webApp('gmail', 'Gmail', '📧', '#ea4335', 'https://mail.google.com/mail/mu/mp/'),
  chatgpt: webApp('chatgpt', 'ChatGPT', '🤖', '#10a37f', 'https://chat.openai.com/'),
  gemini: webApp('gemini', 'Gemini', '✨', '#4285f4', 'https://gemini.google.com/app'),
  claude: webApp('claude', 'Claude', '🎭', '#d97757', 'https://claude.ai/'),
  perplexity: webApp('perplexity', 'Perplexity', '🔍', '#20808d', 'https://www.perplexity.ai/'),
  translate: webApp('translate', 'Tradutor', '🌐', '#4285f4', 'https://translate.google.com/'),
  weather: webApp('weather', 'Clima', '☀️', '#f59e0b', 'https://wttr.in/'),
  calendar: webApp('calendar', 'Calendário', '📅', '#4285f4', 'https://calendar.google.com/calendar/gpadopt'),
  drive: webApp('drive', 'Google Drive', '💾', '#1fa463', 'https://drive.google.com/'),
  photos: webApp('photos', 'Fotos', '🖼️', '#ea4335', 'https://photos.google.com/'),
  news: webApp('news', 'Notícias', '📰', '#4285f4', 'https://news.google.com/?hl=pt-BR&gl=BR'),
  spotify: webApp('spotify', 'Spotify', '🎵', '#1db954', 'https://open.spotify.com/'),
  radio: webApp('radio', 'Rádio', '📻', '#9333ea', 'https://www.radio-browser.info/'),
  notion: webApp('notion', 'Notion', '📝', '#000000', 'https://www.notion.so/'),
  office: webApp('office', 'Office Online', '📄', '#d83b01', 'https://www.office.com/launch'),
  canva: webApp('canva', 'Canva', '🎨', '#00c4cc', 'https://www.canva.com/'),
  github: webApp('github', 'GitHub', '🐙', '#181717', 'https://github.com/'),
  stackoverflow: webApp('stackoverflow', 'Stack Overflow', '💬', '#f48024', 'https://pt.stackoverflow.com/'),
  reddit: webApp('reddit', 'Reddit', '👽', '#ff4500', 'https://www.reddit.com/'),
  whatsapp: webApp('whatsapp', 'WhatsApp', '💚', '#25d366', 'https://web.whatsapp.com/'),
  telegram: webApp('telegram', 'Telegram', '✈️', '#0088cc', 'https://web.telegram.org/'),
  messenger: webApp('messenger', 'Messenger', '💬', '#0084ff', 'https://www.messenger.com/'),
  netflix: webApp('netflix', 'Netflix', '🍿', '#e50914', 'https://www.netflix.com/'),
  twitch: webApp('twitch', 'Twitch', '🎮', '#9146ff', 'https://www.twitch.tv/'),
  instagram: webApp('instagram', 'Instagram', '📷', '#e1306c', 'https://www.instagram.com/'),
  x: webApp('x', 'X (Twitter)', '🐦', '#000000', 'https://x.com/'),
  linkedin: webApp('linkedin', 'LinkedIn', '💼', '#0a66c2', 'https://www.linkedin.com/'),
  amazon: webApp('amazon', 'Amazon', '📦', '#ff9900', 'https://www.amazon.com.br/'),
  mercadolivre: webApp('mercadolivre', 'Mercado Livre', '🛒', '#ffe600', 'https://www.mercadolivre.com.br/'),
  calculatorweb: webApp('calculatorweb', 'Calculadora Científica', '🔢', '#3b82f6', 'https://www.desmos.com/scientific?lang=pt-BR'),
  paint: webApp('paint', 'Paint', '🖌️', '#ec4899', 'https://jspaint.app/'),
  pdfreader: webApp('pdfreader', 'Leitor PDF', '📕', '#ef4444', 'https://mozilla.github.io/pdf.js/web/viewer.html'),
  markdown: webApp('markdown', 'Editor Markdown', '⬇️', '#64748b', 'https://stackedit.io/app'),
  codesandbox: webApp('codesandbox', 'CodeSandbox', '💻', '#040404', 'https://codesandbox.io/'),
  replit: webApp('replit', 'Replit', '🔁', '#f26207', 'https://replit.com/'),
  tide: webApp('tide', 'Tide (docs)', '🌊', '#0073e6', 'https://tideapp.com/'),
  weather2: webApp('weather2', 'Previsão 7 dias', '🌤️', '#0ea5e9', 'https://www.climatempo.com.br/'),
  bus: webApp('bus', 'Ônibus SP', '🚌', '#dc2626', 'https://www.sptrans.com.br/'),
  bank: webApp('bank', 'Banco do Brasil', '🏦', '#ffcc00', 'https://www.bb.com.br/'),
  nubank: webApp('nubank', 'Nubank', '💜', '#820ad1', 'https://app.nubank.com.br/'),
  corona: webApp('corona', 'COVID Dados', '🦠', '#10b981', 'https://covid.saude.gov.br/'),
  dictionary: webApp('dictionary', 'Dicionário', '📖', '#0ea5e9', 'https://www.dicio.com.br/'),
  cep: webApp('cep', 'Busca CEP', '📮', '#16a34a', 'https://buscacepinter.correios.com.br/'),
  recipes: webApp('recipes', 'Receitas', '🍳', '#f97316', 'https://www.tudogostoso.com.br/'),
  traffic: webApp('traffic', 'Trânsito', '🚦', '#ef4444', 'https://www.google.com/maps/@-23.5489,-46.6388,11z/data=!5m1!1e1')
};

// ============================================================
// WINDOWS MANAGEMENT
// ============================================================
function openApp(appId) {
  const appDef = APPS[appId];
  if (!appDef) return;

  const wins = $('windows-container');
  const offset = state.windows.length * 28;
  const win = el('div', { className: 'window' });
  win.style.width = appDef.width + 'px';
  win.style.height = appDef.height + 'px';
  win.style.left = (80 + offset) + 'px';
  win.style.top = (60 + offset) + 'px';
  win.style.zIndex = ++state.zIndex;
  win.dataset.appId = appId;

  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-icon">${appDef.icon}</span>
      <span class="window-title">${appDef.name}</span>
      <div class="window-controls">
        <button class="window-btn window-btn-min" title="Minimizar"></button>
        <button class="window-btn window-btn-max" title="Maximizar"></button>
        <button class="window-btn window-btn-close" title="Fechar"></button>
      </div>
    </div>
    <div class="window-content">${appDef.render(win) || ''}</div>
  `;

  wins.appendChild(win);
  state.windows.push({ appId, el: win });

  win.querySelector('.window-btn-close').addEventListener('click', () => closeWindow(win));
  win.querySelector('.window-btn-min').addEventListener('click', () => { win.style.display = 'none'; });
  win.querySelector('.window-btn-max').addEventListener('click', () => toggleMaximize(win));
  win.addEventListener('mousedown', () => { win.style.zIndex = ++state.zIndex; });
  makeDraggable(win);

  return win;
}

function closeWindow(win) {
  const appId = win.dataset.appId;
  const appDef = APPS[appId];
  if (appDef && appDef.onClose) appDef.onClose(win);
  win.style.transition = 'opacity 0.15s, transform 0.15s';
  win.style.opacity = '0';
  win.style.transform = 'scale(0.95)';
  setTimeout(() => {
    win.remove();
    state.windows = state.windows.filter(w => w.el !== win);
  }, 150);
}

function toggleMaximize(win) {
  if (win.dataset.maximized === 'true') {
    win.dataset.maximized = 'false';
    win.style.left = win.dataset.prevLeft;
    win.style.top = win.dataset.prevTop;
    win.style.width = win.dataset.prevWidth;
    win.style.height = win.dataset.prevHeight;
  } else {
    win.dataset.maximized = 'true';
    win.dataset.prevLeft = win.style.left;
    win.dataset.prevTop = win.style.top;
    win.dataset.prevWidth = win.style.width;
    win.dataset.prevHeight = win.style.height;
    win.style.left = '0px';
    win.style.top = '0px';
    win.style.width = '100%';
    win.style.height = 'calc(100% - 26px)';
  }
}

function makeDraggable(win) {
  const titlebar = win.querySelector('.window-titlebar');
  let isDragging = false, startX, startY, startLeft, startTop;

  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('window-btn')) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = parseInt(win.style.left);
    startTop = parseInt(win.style.top);
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    win.style.left = (startLeft + e.clientX - startX) + 'px';
    win.style.top = Math.max(0, startTop + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // Touch support
  titlebar.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('window-btn')) return;
    const t = e.touches[0];
    isDragging = true;
    startX = t.clientX; startY = t.clientY;
    startLeft = parseInt(win.style.left);
    startTop = parseInt(win.style.top);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    win.style.left = (startLeft + t.clientX - startX) + 'px';
    win.style.top = Math.max(0, startTop + t.clientY - startY) + 'px';
  }, { passive: true });

  document.addEventListener('touchend', () => { isDragging = false; });
}

// ============================================================
// APPS MENU + DESKTOP ICONS
// ============================================================
function renderAppsMenu(filter = '') {
  const grid = $('apps-grid');
  if (!grid) return;
  const items = Object.entries(APPS).filter(([k, v]) =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase())
  );
  grid.innerHTML = items.map(([k, v]) => `
    <div class="app-item" data-app="${k}">
      <div class="app-icon-large" style="background:${v.color}25;color:${v.color}">${v.icon}</div>
      <div class="app-name">${v.name}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.app-item').forEach(elx => {
    elx.addEventListener('click', () => {
      openApp(elx.dataset.app);
      $('apps-menu').classList.add('hidden');
    });
  });
}

function renderDesktopIcons() {
  const container = $('desktop-icons');
  if (!container) return;
  // Apps principais no desktop + alguns apps externos populares
  const desktopApps = [
    'welcome', 'browser', 'notes', 'calculator', 'terminal', 'settings', 'clock',
    'youtube', 'gmail', 'chatgpt', 'maps', 'wikipedia', 'translate', 'whatsapp',
    'spotify', 'netflix', 'news', 'weather', 'instagram', 'paint'
  ];
  container.innerHTML = desktopApps.map(k => {
    const v = APPS[k];
    return `
      <div class="desktop-icon" data-app="${k}">
        <div class="app-icon-large" style="background:${v.color}25;color:${v.color};width:56px;height:56px">${v.icon}</div>
        <div class="app-name">${v.name}</div>
      </div>
    `;
  }).join('');
  container.querySelectorAll('.desktop-icon').forEach(elx => {
    let lastTap = 0;
    elx.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 400) openApp(elx.dataset.app);
      lastTap = now;
    });
    elx.addEventListener('dblclick', () => openApp(elx.dataset.app));
  });
}

// ============================================================
// INIT
// ============================================================
function init() {
  const saved = localStorage.getItem(CONFIG.sessionKey);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const user = getAllUsers().find(u => u.username.toLowerCase() === data.username.toLowerCase());
      if (user) {
        state.currentUser = user;
        state.sessionStart = data.start || Date.now();
        renderDesktop();
        return;
      }
    } catch(e) {}
  }
  renderLogin();
}

window.addEventListener('beforeunload', (e) => {
  if (state.currentUser) {
    e.preventDefault();
    e.returnValue = '';
  }
});

init();

console.log('%c' + CONFIG.appName, 'color:#3b82f6;font-size:24px;font-weight:bold');
console.log('%cv' + CONFIG.version + ' · 100% client-side · multiusuário', 'color:#94a3b8');

})();
