/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal as TerminalIcon,
  Globe,
  FileText,
  Calculator as CalcIcon,
  Settings as SettingsIcon,
  Clock as ClockIcon,
  Sparkles,
  Monitor,
  LogOut,
  Search,
  Maximize2,
  Minimize2,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Send,
  ChevronRight,
  Palette,
  User,
  Shield,
  Info,
  HelpCircle,
  Hash,
  Laptop
} from 'lucide-react';

// ============================================================
// TYPES & CONTEXT
// ============================================================

interface User {
  username: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
  zIndex: number;
}

interface AppDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  render: (props: {
    windowId: string;
    currentUser: User;
    openApp: (appId: string) => void;
    closeWindow: (winId: string) => void;
  }) => React.ReactNode;
}

// Predefined wallpapers/background gradients
const WALLPAPERS = [
  { id: 'deep-cosmos', name: 'Cosmic Slate', css: 'radial-gradient(ellipse at top, #1e2548 0%, #0a0e27 65%)' },
  { id: 'midnight-aura', name: 'Midnight Aura', css: 'radial-gradient(circle at center, #111827 0%, #030712 100%)' },
  { id: 'cyber-sunset', name: 'Cyber Sunset', css: 'linear-gradient(135deg, #3b0764 0%, #0f172a 100%)' },
  { id: 'emerald-grid', name: 'Emerald Vault', css: 'radial-gradient(ellipse at center, #022c22 0%, #090d16 100%)' },
  { id: 'solar-flare', name: 'Solar Obsidian', css: 'linear-gradient(135deg, #431407 0%, #0b0f19 100%)' }
];

export default function App() {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionStart, setSessionStart] = useState<number>(Date.now());
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [zIndexCounter, setZIndexCounter] = useState<number>(100);
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState<boolean>(false);
  const [appsSearch, setAppsSearch] = useState<string>('');
  
  // Connection state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showOfflineOverlay, setShowOfflineOverlay] = useState<boolean>(!navigator.onLine);
  const [offlineRetryCountdown, setOfflineRetryCountdown] = useState<number>(5);

  // Customization
  const [wallpaper, setWallpaper] = useState<string>(() => {
    return localStorage.getItem('terminalos_wallpaper') || 'deep-cosmos';
  });

  // Login inputs
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // System metrics (dynamically tracking viewport)
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Dragging state
  const [draggedWindow, setDraggedWindow] = useState<{
    id: string;
    startX: number;
    startY: number;
    startWindowX: number;
    startWindowY: number;
  } | null>(null);

  // ============================================================
  // EFFECTS & INITIALIZATION
  // ============================================================

  // Track viewport size on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineOverlay(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineOverlay(true);
      setOfflineRetryCountdown(5);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline retry counter effect
  useEffect(() => {
    if (showOfflineOverlay && !isOnline) {
      const interval = setInterval(() => {
        setOfflineRetryCountdown(prev => {
          if (prev <= 1) {
            // Attempt auto-reconnect test
            if (navigator.onLine) {
              setIsOnline(true);
              setShowOfflineOverlay(false);
              return 5;
            }
            return 5; // Reset
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showOfflineOverlay, isOnline]);

  // Check persistent session on load
  useEffect(() => {
    const savedSession = localStorage.getItem('terminalos_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        const usersList: User[] = [
          { username: 'admin', name: 'Administrador', role: 'admin' },
          { username: 'user', name: 'Usuário Padrão', role: 'user' },
          { username: 'guest', name: 'Convidado Especial', role: 'guest' }
        ];
        const matched = usersList.find(u => u.username === sessionData.username);
        if (matched) {
          setCurrentUser(matched);
          setSessionStart(sessionData.start || Date.now());
          // Open welcome app by default
          setTimeout(() => {
            triggerOpenApp('welcome');
          }, 300);
        }
      } catch (e) {
        localStorage.removeItem('terminalos_session');
      }
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + L to Logout
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLogout();
      }
      // Escape closes apps menu
      if (e.key === 'Escape') {
        setIsAppsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Handle Dragging calculations
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedWindow) return;
      const deltaX = e.clientX - draggedWindow.startX;
      const deltaY = e.clientY - draggedWindow.startY;

      setWindows(prev =>
        prev.map(win => {
          if (win.id === draggedWindow.id) {
            // Constraint: do not let window drag its title bar completely under topbar
            const newX = draggedWindow.startWindowX + deltaX;
            const newY = Math.max(0, draggedWindow.startWindowY + deltaY);
            return { ...win, x: newX, y: newY };
          }
          return win;
        })
      );
    };

    const handleMouseUp = () => {
      setDraggedWindow(null);
    };

    if (draggedWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedWindow]);

  // Touch Dragging support
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!draggedWindow || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - draggedWindow.startX;
      const deltaY = touch.clientY - draggedWindow.startY;

      setWindows(prev =>
        prev.map(win => {
          if (win.id === draggedWindow.id) {
            const newX = draggedWindow.startWindowX + deltaX;
            const newY = Math.max(0, draggedWindow.startWindowY + deltaY);
            return { ...win, x: newX, y: newY };
          }
          return win;
        })
      );
    };

    const handleTouchEnd = () => {
      setDraggedWindow(null);
    };

    if (draggedWindow) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedWindow]);

  // ============================================================
  // LOGIN FLOW
  // ============================================================
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUser = usernameInput.trim().toLowerCase();
    const pass = passwordInput;

    const credentials: Record<string, { name: string; pass: string; role: 'admin' | 'user' | 'guest' }> = {
      admin: { name: 'Administrador', pass: 'admin', role: 'admin' },
      user: { name: 'Usuário Padrão', pass: 'user', role: 'user' },
      guest: { name: 'Convidado Especial', pass: '', role: 'guest' }
    };

    const matched = credentials[trimmedUser];
    if (!matched) {
      setLoginError('Usuário não cadastrado');
      return;
    }

    // Guest account doesn't need password, others match
    if (matched.role !== 'guest' && matched.pass !== pass) {
      setLoginError('Senha incorreta para este usuário');
      return;
    }

    const matchedUser: User = {
      username: trimmedUser,
      name: matched.name,
      role: matched.role
    };

    const now = Date.now();
    setCurrentUser(matchedUser);
    setSessionStart(now);
    localStorage.setItem(
      'terminalos_session',
      JSON.stringify({ username: matchedUser.username, start: now })
    );

    // Reset login inputs
    setUsernameInput('');
    setPasswordInput('');

    // Open onboarding welcome app
    setTimeout(() => {
      triggerOpenApp('welcome');
    }, 300);
  };

  const fillQuickLogin = (username: string) => {
    setUsernameInput(username);
    setPasswordInput(username === 'guest' ? '' : username);
    setLoginError('');
  };

  const handleLogout = () => {
    if (window.confirm('Encerrar sessão e retornar à tela de login?')) {
      localStorage.removeItem('terminalos_session');
      setCurrentUser(null);
      setWindows([]);
      setActiveWindowId(null);
      setIsAppsMenuOpen(false);
    }
  };

  // ============================================================
  // WINDOW MANAGEMENT
  // ============================================================
  const triggerOpenApp = (appId: string) => {
    const appDef = APPS_REGISTRY.find(a => a.id === appId);
    if (!appDef) return;

    // Check if app window already open, if so restore and focus it
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      setWindows(prev =>
        prev.map(w => (w.id === existing.id ? { ...w, isMinimized: false } : w))
      );
      focusWindow(existing.id);
      setIsAppsMenuOpen(false);
      return;
    }

    // Set positions with slight staggering offset
    const activeWindowsCount = windows.filter(w => !w.isMinimized).length;
    const offset = activeWindowsCount * 28;
    
    // Grid alignment parameters
    const initialX = Math.min(100 + offset, viewportSize.width - appDef.defaultWidth - 40);
    const initialY = Math.min(80 + offset, viewportSize.height - appDef.defaultHeight - 80);

    const nextZ = zIndexCounter + 1;
    setZIndexCounter(nextZ);

    const newWindow: WindowInstance = {
      id: `win-${appId}-${Date.now()}`,
      appId: appId,
      title: appDef.name,
      icon: appDef.icon,
      x: Math.max(20, initialX),
      y: Math.max(20, initialY),
      width: appDef.defaultWidth,
      height: appDef.defaultHeight,
      isMaximized: false,
      isMinimized: false,
      zIndex: nextZ
    };

    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsAppsMenuOpen(false);
  };

  const closeWindow = (winId: string) => {
    setWindows(prev => prev.filter(w => w.id !== winId));
    if (activeWindowId === winId) {
      setActiveWindowId(null);
    }
  };

  const minimizeWindow = (winId: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === winId ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === winId) {
      setActiveWindowId(null);
    }
  };

  const toggleMaximizeWindow = (winId: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === winId ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    focusWindow(winId);
  };

  const focusWindow = (winId: string) => {
    const nextZ = zIndexCounter + 1;
    setZIndexCounter(nextZ);
    setWindows(prev =>
      prev.map(w => (w.id === winId ? { ...w, zIndex: nextZ, isMinimized: false } : w))
    );
    setActiveWindowId(winId);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, win: WindowInstance) => {
    if (win.isMaximized) return;
    focusWindow(win.id);

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setDraggedWindow({
      id: win.id,
      startX: clientX,
      startY: clientY,
      startWindowX: win.x,
      startWindowY: win.y
    });
  };

  // Uptime calculation
  const sessionUptimeString = useMemo(() => {
    const totalSeconds = Math.floor((currentTime.getTime() - sessionStart) / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, [currentTime, sessionStart]);

  const activeWallpaperObj = useMemo(() => {
    return WALLPAPERS.find(w => w.id === wallpaper) || WALLPAPERS[0];
  }, [wallpaper]);

  // ============================================================
  // BUILT-IN APPLICATIONS DEFINITIONS
  // ============================================================

  const APPS_REGISTRY: AppDefinition[] = [
    {
      id: 'welcome',
      name: 'Bem-vindo',
      icon: <Sparkles className="w-5 h-5" />,
      emoji: '👋',
      color: '#3b82f6',
      defaultWidth: 540,
      defaultHeight: 440,
      render: ({ currentUser, openApp }) => (
        <div className="flex flex-col items-center justify-between h-full p-4 text-center select-text">
          <div className="my-auto space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 text-blue-400 rounded-full animate-pulse">
              <Sparkles className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Bem-vindo ao Terminal OS!
            </h2>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed mx-auto">
              Você está autenticado na sessão privada como{' '}
              <strong className="text-blue-400 font-semibold">{currentUser.name}</strong> ({currentUser.role}). 
              Explore o sistema de janelas e experimente as ferramentas do desktop.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
            <button
              onClick={() => openApp('terminal')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600 rounded-lg text-xs text-white transition font-mono"
            >
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              Executar Terminal
            </button>
            <button
              onClick={() => openApp('notes')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600 rounded-lg text-xs text-white transition font-mono"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Bloco de Notas
            </button>
            <button
              onClick={() => openApp('browser')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600 rounded-lg text-xs text-white transition font-mono"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              Navegador Web
            </button>
            <button
              onClick={() => openApp('settings')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600 rounded-lg text-xs text-white transition font-mono"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              Configurar Sistema
            </button>
          </div>

          <div className="text-[10px] text-slate-500 mt-6 font-mono">
            Terminal OS v1.0.0 · Ambientes estáticos e stateless
          </div>
        </div>
      )
    },
    {
      id: 'browser',
      name: 'Navegador',
      icon: <Globe className="w-5 h-5" />,
      emoji: '🌐',
      color: '#22c55e',
      defaultWidth: 800,
      defaultHeight: 520,
      render: () => {
        const [urlInput, setUrlInput] = useState('https://www.wikipedia.org');
        const [currentUrl, setCurrentUrl] = useState('https://www.wikipedia.org');

        const navigateTo = (e?: React.FormEvent) => {
          if (e) e.preventDefault();
          let formatted = urlInput.trim();
          if (!formatted) return;
          if (!/^https?:\/\//i.test(formatted)) {
            formatted = `https://${formatted}`;
          }
          setUrlInput(formatted);
          setCurrentUrl(formatted);
        };

        return (
          <div className="flex flex-col h-full gap-3">
            <form onSubmit={navigateTo} className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Insira um endereço URL (ex: wikipedia.org)"
                className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-white outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium rounded-lg transition"
              >
                Navegar
              </button>
            </form>
            <div className="flex-1 bg-white rounded-lg overflow-hidden relative">
              <iframe
                src={currentUrl}
                title="Browser Viewport"
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Aviso: Determinados sites (como Google, YouTube) bloqueiam carregamento interno (iFrame) por segurança via diretiva X-Frame-Options.
            </p>
          </div>
        );
      }
    },
    {
      id: 'notes',
      name: 'Notas',
      icon: <FileText className="w-5 h-5" />,
      emoji: '📝',
      color: '#eab308',
      defaultWidth: 500,
      defaultHeight: 400,
      render: ({ currentUser }) => {
        const storageKey = `terminalos_notes_${currentUser.username}`;
        const [noteContent, setNoteContent] = useState(() => {
          return localStorage.getItem(storageKey) || '';
        });
        const [saveStatus, setSaveStatus] = useState<'Salvo' | 'Salvando...'>('Salvo');

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          const val = e.target.value;
          setNoteContent(val);
          setSaveStatus('Salvando...');
          localStorage.setItem(storageKey, val);
          setTimeout(() => {
            setSaveStatus('Salvo');
          }, 600);
        };

        return (
          <div className="flex flex-col h-full gap-3 font-mono">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Notas de: {currentUser.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${saveStatus === 'Salvo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400 animate-pulse'}`}>
                {saveStatus}
              </span>
            </div>
            <textarea
              value={noteContent}
              onChange={handleChange}
              placeholder="Digite suas anotações aqui... (O conteúdo é salvo automaticamente por usuário)"
              className="flex-1 p-3 bg-slate-950/40 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-200 outline-none resize-none leading-relaxed"
            />
          </div>
        );
      }
    },
    {
      id: 'calculator',
      name: 'Calculadora',
      icon: <CalcIcon className="w-5 h-5" />,
      emoji: '🔢',
      color: '#a855f7',
      defaultWidth: 320,
      defaultHeight: 460,
      render: () => {
        const [display, setDisplay] = useState('0');
        const [equation, setEquation] = useState('');
        const [shouldReset, setShouldReset] = useState(false);

        const handleNum = (num: string) => {
          if (display === '0' || shouldReset) {
            setDisplay(num);
            setShouldReset(false);
          } else {
            setDisplay(prev => prev + num);
          }
        };

        const handleOp = (op: string) => {
          setEquation(display + ' ' + op + ' ');
          setShouldReset(true);
        };

        const handleClear = () => {
          setDisplay('0');
          setEquation('');
          setShouldReset(false);
        };

        const handleEquals = () => {
          if (!equation) return;
          try {
            const finalExpression = equation + display;
            // Clean values for safe execution
            const cleaned = finalExpression.replace(/×/g, '*').replace(/÷/g, '/');
            // Safe mathematical calculation using JS evaluator
            // eslint-disable-next-line no-eval
            const result = eval(cleaned);
            setDisplay(String(Number(result.toFixed(8)))); // Limit float precision
            setEquation('');
            setShouldReset(true);
          } catch (e) {
            setDisplay('Erro');
            setEquation('');
            setShouldReset(true);
          }
        };

        const handleBackspace = () => {
          if (display.length <= 1) {
            setDisplay('0');
          } else {
            setDisplay(prev => prev.slice(0, -1));
          }
        };

        return (
          <div className="flex flex-col h-full bg-slate-950 p-2 rounded-lg font-mono">
            <div className="flex-1 flex flex-col justify-end p-4 mb-3 bg-slate-900 rounded border border-slate-800 text-right select-all">
              <div className="text-xs text-slate-500 h-5 overflow-hidden">{equation}</div>
              <div className="text-3xl text-white font-bold tracking-tight overflow-x-auto whitespace-nowrap">
                {display}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleClear} className="p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-lg font-bold transition">C</button>
              <button onClick={handleBackspace} className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-lg font-bold transition">⌫</button>
              <button onClick={() => handleOp('÷')} className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg font-bold transition">÷</button>
              <button onClick={() => handleOp('×')} className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg font-bold transition">×</button>

              <button onClick={() => handleNum('7')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">7</button>
              <button onClick={() => handleNum('8')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">8</button>
              <button onClick={() => handleNum('9')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">9</button>
              <button onClick={() => handleOp('-')} className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg font-bold transition">-</button>

              <button onClick={() => handleNum('4')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">4</button>
              <button onClick={() => handleNum('5')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">5</button>
              <button onClick={() => handleNum('6')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">6</button>
              <button onClick={() => handleOp('+')} className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg font-bold transition">+</button>

              <div className="grid grid-cols-3 col-span-3 gap-2">
                <button onClick={() => handleNum('1')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">1</button>
                <button onClick={() => handleNum('2')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">2</button>
                <button onClick={() => handleNum('3')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">3</button>
                <button onClick={() => handleNum('0')} className="p-4 col-span-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">0</button>
                <button onClick={() => handleNum('.')} className="p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-lg font-bold transition">.</button>
              </div>

              <button onClick={handleEquals} className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-lg font-bold transition flex items-center justify-center">=</button>
            </div>
          </div>
        );
      }
    },
    {
      id: 'terminal',
      name: 'Terminal',
      icon: <TerminalIcon className="w-5 h-5" />,
      emoji: '⌨️',
      color: '#10b981',
      defaultWidth: 680,
      defaultHeight: 440,
      render: ({ currentUser, openApp }) => {
        const [lines, setLines] = useState<string[]>([
          'Terminal OS [Versão 1.0.0]',
          'Copyright (c) 2026. Todos os direitos reservados.',
          'Digite "help" para ver os comandos disponíveis.',
          ''
        ]);
        const [inputVal, setInputVal] = useState('');
        const outputEndRef = useRef<HTMLDivElement>(null);

        // Auto-scroll to bottom of output log
        useEffect(() => {
          outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [lines]);

        const execCommand = (e: React.FormEvent) => {
          e.preventDefault();
          const cmd = inputVal.trim();
          if (!cmd) return;

          const parts = cmd.split(/\s+/);
          const baseCmd = parts[0].toLowerCase();
          const args = parts.slice(1).join(' ');

          const newLines = [...lines, `guest@terminal-os:~$ ${cmd}`];

          switch (baseCmd) {
            case 'help':
              newLines.push(
                'Comandos Disponíveis:',
                '  help            - Exibe esta guia de ajuda.',
                '  whoami          - Retorna os dados do usuário atual.',
                '  date            - Retorna a data e hora do sistema.',
                '  echo [text]     - Imprime os argumentos especificados.',
                '  clear           - Limpa todo o histórico do terminal.',
                '  ls              - Lista aplicativos instalados.',
                '  open [app]      - Abre o aplicativo desejado (ex: open notes).',
                '  uptime          - Exibe a duração da sessão ativa.',
                '  system          - Exibe especificações virtuais do processador.',
                '  matrix          - Simula o efeito sweep do sistema.',
                '  joke            - Conta uma piada técnica.'
              );
              break;
            case 'whoami':
              newLines.push(`${currentUser.name} (${currentUser.role})`);
              break;
            case 'date':
              newLines.push(new Date().toString());
              break;
            case 'echo':
              newLines.push(args || ' ');
              break;
            case 'clear':
              setLines([]);
              setInputVal('');
              return;
            case 'ls':
              newLines.push(
                'welcome.app',
                'browser.app',
                'notes.app',
                'calculator.app',
                'terminal.app',
                'settings.app',
                'clock.app'
              );
              break;
            case 'open':
              const targetApp = args.trim().toLowerCase();
              if (['welcome', 'browser', 'notes', 'calculator', 'terminal', 'settings', 'clock'].includes(targetApp)) {
                openApp(targetApp);
                newLines.push(`Iniciando ${targetApp}.app...`);
              } else {
                newLines.push(`Erro: Aplicativo "${targetApp}" não localizado. Use "ls" para listar.`);
              }
              break;
            case 'uptime':
              const totalSec = Math.floor((Date.now() - sessionStart) / 1000);
              const hrs = Math.floor(totalSec / 3600);
              const mins = Math.floor((totalSec % 3600) / 60);
              const secs = totalSec % 60;
              newLines.push(`Uptime da Sessão: ${hrs}h ${mins}m ${secs}s`);
              break;
            case 'system':
              newLines.push(
                `OS: TerminalOS (React-SPA Edition)`,
                `CPU: Processador Virtual Octa-Core v3.2GHz`,
                `Memory: 16 GB DDR5 RAM`,
                `Local Storage API: Habilitado (Disponível)`,
                `Navegador: ${navigator.userAgent.slice(0, 50)}...`
              );
              break;
            case 'matrix':
              newLines.push(
                'CARREGANDO MATRIX DIGITAL RAIN...',
                '101110010110010101010111010011010',
                '010101110010100110010111001010011',
                '001101011100101001101101011011100',
                'SISTEMA RE-ESTABELECIDO COM SUCESSO.'
              );
              break;
            case 'joke':
              const jokes = [
                'Por que o desenvolvedor faliu? Porque ele gastou todo o seu cache.',
                'O que o HTML disse para o CSS? "Gosto das suas regras."',
                'Quantos programadores são necessários para trocar uma lâmpada? Nenhum, isso é um problema de hardware.',
                'O que é um loop infinito? Ver "joke" no Terminal OS.'
              ];
              newLines.push(jokes[Math.floor(Math.random() * jokes.length)]);
              break;
            default:
              newLines.push(`Comando não encontrado: "${baseCmd}". Digite "help" para ver opções.`);
          }

          setLines(newLines);
          setInputVal('');
        };

        return (
          <div className="flex flex-col h-full bg-[#030712] rounded-lg p-3 font-mono text-emerald-400 select-text">
            <div className="flex-1 overflow-y-auto space-y-1 text-xs pr-1">
              {lines.map((l, idx) => (
                <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                  {l}
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>
            
            <form onSubmit={execCommand} className="flex items-center gap-1.5 mt-3 border-t border-emerald-950 pt-2 text-xs">
              <span className="text-emerald-500 font-bold shrink-0">guest@terminal-os:~$</span>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                className="flex-1 bg-transparent border-none text-emerald-300 outline-none p-0 focus:ring-0 font-mono caret-emerald-400"
                autoFocus
                placeholder="Insira um comando..."
              />
              <button type="submit" className="text-emerald-600 hover:text-emerald-400 transition p-1">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        );
      }
    },
    {
      id: 'settings',
      name: 'Sistema',
      icon: <SettingsIcon className="w-5 h-5" />,
      emoji: '⚙️',
      color: '#64748b',
      defaultWidth: 500,
      defaultHeight: 460,
      render: ({ currentUser }) => (
        <div className="flex flex-col h-full gap-4 select-text">
          {/* Wallpaper picker */}
          <div className="space-y-2 bg-slate-900/60 p-3.5 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Palette className="w-4 h-4 text-sky-400" />
              <span>Personalizar Wallpaper</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {WALLPAPERS.map(wall => (
                <button
                  key={wall.id}
                  onClick={() => {
                    setWallpaper(wall.id);
                    localStorage.setItem('terminalos_wallpaper', wall.id);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-medium border text-left transition ${
                    wallpaper === wall.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/10 shrink-0"
                    style={{ background: wall.css }}
                  />
                  <span className="truncate">{wall.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User account details */}
          <div className="space-y-2 bg-slate-900/60 p-3.5 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Credenciais da Conta</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                <div className="text-slate-500 text-[10px]">Identificador</div>
                <div className="text-slate-200 font-mono mt-0.5">{currentUser.username}</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                <div className="text-slate-500 text-[10px]">Função</div>
                <div className="text-slate-200 font-mono mt-0.5 capitalize">{currentUser.role}</div>
              </div>
              <div className="col-span-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-slate-200 font-medium">Permissões de Segurança</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    {currentUser.role === 'admin' 
                      ? 'Nível Root. Acesso completo liberado para as funções de terminal e visualizadores de iframe.' 
                      : 'Nível Standard. Limitações padrão do navegador aplicadas.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="space-y-2 bg-slate-900/60 p-3.5 border border-slate-800/80 rounded-xl flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Informações da Máquina</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">Sistema Operacional</span>
                <span className="text-white">TerminalOS (Web-SPA Client)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">Vite / React Runtime</span>
                <span className="text-emerald-400">Ativo</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">Resolução do Monitor</span>
                <span className="text-white">{viewportSize.width} × {viewportSize.height}px</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">Armazenamento Local</span>
                <span className="text-blue-400">Disponível</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">Sessão Iniciada</span>
                <span className="text-white">{new Date(sessionStart).toLocaleTimeString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'clock',
      name: 'Relógio',
      icon: <ClockIcon className="w-5 h-5" />,
      emoji: '🕐',
      color: '#ef4444',
      defaultWidth: 380,
      defaultHeight: 220,
      render: () => {
        const timeStr = currentTime.toLocaleTimeString('pt-BR');
        const dateStr = currentTime.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center select-text font-mono">
            <div className="text-5xl font-bold text-sky-400 tracking-wider drop-shadow-[0_4px_12px_rgba(56,189,248,0.15)]">
              {timeStr}
            </div>
            <div className="text-xs text-slate-400 mt-4 capitalize font-semibold tracking-wide">
              {dateStr}
            </div>
            <div className="text-[9px] text-slate-600 mt-2">
              Sincronizado via Time Server Local (Browser clock)
            </div>
          </div>
        );
      }
    }
  ];

  // Apps Menu list filters search input
  const filteredApps = useMemo(() => {
    return APPS_REGISTRY.filter(app =>
      app.name.toLowerCase().includes(appsSearch.toLowerCase())
    );
  }, [appsSearch]);

  // ============================================================
  // RENDERING COMPONENT
  // ============================================================

  // Render Login state if no user
  if (!currentUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-radial from-[#131838] to-[#0a0e27] p-4 select-none">
        <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-600" />
          
          <div className="flex flex-col items-center text-center">
            {/* Monitor SVG Emblem */}
            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <Laptop className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Terminal OS
            </h1>
            <p className="text-xs text-slate-400 mb-8">
              Sistema Web Multiusuário · Estático &amp; Rápido
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold font-mono text-slate-400">Usuário</label>
              <input
                type="text"
                placeholder="Ex: admin, user, guest"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl text-sm text-slate-100 outline-none font-mono placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold font-mono text-slate-400">Senha</label>
              <input
                type="password"
                placeholder="Sua senha de acesso"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl text-sm text-slate-100 outline-none font-mono placeholder:text-slate-600"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-500 font-medium font-mono text-center">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-sm font-semibold text-white rounded-xl shadow-lg transition active:scale-[0.99] cursor-pointer"
            >
              Iniciar Sessão
            </button>
          </form>

          {/* Quick Login Badge Selectors */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block text-center mb-3">
              Escolher conta rápida
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => fillQuickLogin('admin')}
                className="px-2 py-1.5 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono transition"
              >
                admin
              </button>
              <button
                onClick={() => fillQuickLogin('user')}
                className="px-2 py-1.5 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono transition"
              >
                user
              </button>
              <button
                onClick={() => fillQuickLogin('guest')}
                className="px-2 py-1.5 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono transition"
              >
                guest
              </button>
            </div>
            <p className="text-[9px] text-slate-600 text-center mt-3 leading-normal font-mono">
              Nota: admin e user utilizam o próprio username como senha. guest entra sem senha.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Main View
  return (
    <div
      id="desktop-workspace"
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        background: activeWallpaperObj.css,
        transition: 'background 0.5s ease'
      }}
    >
      {/* ===================== TOPBAR / TASKBAR ===================== */}
      <div className="h-11 bg-slate-950/70 border-b border-white/5 backdrop-blur-md flex items-center justify-between px-3 z-50">
        <div className="flex items-center gap-1.5">
          {/* Main Apps Start Menu Trigger */}
          <button
            onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs font-semibold ${
              isAppsMenuOpen
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Monitor className="w-4 h-4 shrink-0" />
            <span>Aplicativos</span>
          </button>
          
          <span className="text-[10px] text-slate-600 font-bold tracking-widest font-mono select-none uppercase hidden sm:inline ml-2 border-l border-white/10 pl-3">
            Terminal OS v1.0
          </span>
        </div>

        {/* Current Active User Status Display */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[11px] text-slate-200 font-mono font-medium leading-none">
            {currentUser.name}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-bold bg-white/10 text-slate-300 px-1.5 py-0.5 rounded leading-none">
            {currentUser.role}
          </span>
        </div>

        {/* Status Area & Controls */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-white font-mono font-bold leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[9px] text-slate-400 font-medium font-mono leading-none mt-1">
              {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
            title="Sair da Conta (Ctrl+Alt+L)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================== FLOATING APPLICATIONS MENU ===================== */}
      {isAppsMenuOpen && (
        <div className="absolute top-[48px] left-3 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-[99] flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar aplicativos..."
              value={appsSearch}
              onChange={e => setAppsSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredApps.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-4 font-mono">
                Nenhum aplicativo localizado.
              </p>
            ) : (
              filteredApps.map(app => (
                <button
                  key={app.id}
                  onClick={() => triggerOpenApp(app.id)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl text-left transition select-none group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-inner shrink-0"
                    style={{ background: `${app.color}15`, color: app.color }}
                  >
                    {app.emoji}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {app.id}.app
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== WORKSPACE STAGE ===================== */}
      <div className="flex-1 relative overflow-hidden" onClick={() => setIsAppsMenuOpen(false)}>
        {/* Desktop Shortcuts */}
        <div className="absolute inset-4 grid grid-flow-row grid-cols-[repeat(auto-fill,78px)] grid-rows-[repeat(auto-fill,88px)] gap-x-1.5 gap-y-3 pointer-events-none">
          {APPS_REGISTRY.map(app => (
            <button
              key={app.id}
              onDoubleClick={() => triggerOpenApp(app.id)}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl pointer-events-auto hover:bg-blue-500/10 active:bg-blue-500/20 text-center group cursor-pointer border border-transparent hover:border-blue-500/20 transition-all duration-100"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg shrink-0 border border-white/5 transition-all duration-100 group-hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${app.color}25, ${app.color}08)` }}
              >
                {app.emoji}
              </div>
              <span className="text-[11px] text-slate-300 font-medium tracking-tight mt-1 truncate w-full group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-sans">
                {app.name}
              </span>
            </button>
          ))}
        </div>

        {/* Windows Rendering Container */}
        {windows.map(win => {
          const appDef = APPS_REGISTRY.find(a => a.id === win.appId);
          if (!appDef) return null;

          const isFocused = activeWindowId === win.id;

          const winStyle: React.CSSProperties = win.isMaximized
            ? {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: win.zIndex,
                display: win.isMinimized ? 'none' : 'flex'
              }
            : {
                position: 'absolute',
                left: win.x,
                top: win.y,
                width: win.width,
                height: win.height,
                zIndex: win.zIndex,
                display: win.isMinimized ? 'none' : 'flex'
              };

          return (
            <div
              key={win.id}
              className={`flex flex-col bg-slate-900/95 border rounded-xl overflow-hidden shadow-2xl transition-all duration-75 select-none ${
                isFocused
                  ? 'border-white/15 ring-1 ring-blue-500/30'
                  : 'border-white/5 opacity-90 shadow-lg'
              }`}
              style={winStyle}
              onMouseDown={() => focusWindow(win.id)}
              onTouchStart={() => focusWindow(win.id)}
            >
              {/* Window Header Titlebar */}
              <div
                onMouseDown={e => startDrag(e, win)}
                onTouchStart={e => startDrag(e, win)}
                className="h-10 bg-slate-950/60 border-b border-white/5 flex items-center justify-between px-3 cursor-move shrink-0"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-base leading-none shrink-0">{appDef.emoji}</span>
                  <span className="font-semibold text-slate-300 tracking-wide">
                    {win.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      minimizeWindow(win.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                    title="Minimizar"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMaximizeWindow(win.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                    title={win.isMaximized ? 'Restaurar' : 'Maximizar'}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeWindow(win.id);
                    }}
                    className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition"
                    title="Fechar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Window Content Container */}
              <div className="flex-1 overflow-auto p-4 bg-slate-950/20 text-slate-200">
                {appDef.render({
                  windowId: win.id,
                  currentUser: currentUser,
                  openApp: triggerOpenApp,
                  closeWindow: closeWindow
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================== TASKBAR (CENTERED ACTIVE WINDOWS) ===================== */}
      {windows.length > 0 && (
        <div className="h-12 bg-slate-950/40 border-t border-white/5 backdrop-blur-md flex items-center justify-center gap-2 px-4 z-40">
          <div className="flex items-center gap-1.5 max-w-full overflow-x-auto py-1">
            {windows.map(win => {
              const isFocused = activeWindowId === win.id && !win.isMinimized;
              const appDef = APPS_REGISTRY.find(a => a.id === win.appId);
              
              return (
                <button
                  key={win.id}
                  onClick={() => {
                    if (win.isMinimized) {
                      focusWindow(win.id);
                    } else if (activeWindowId === win.id) {
                      minimizeWindow(win.id);
                    } else {
                      focusWindow(win.id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border text-xs font-medium font-mono select-none transition ${
                    isFocused
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm shrink-0">{appDef?.emoji}</span>
                  <span className="truncate max-w-[100px]">{win.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== BOTTOM STATUSBAR ===================== */}
      <div className="h-6 bg-slate-950 border-t border-white/5 flex items-center justify-between px-3 text-[10px] font-mono text-slate-500 z-50">
        {/* Connection status with check icon */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <span className="text-emerald-500 flex items-center gap-1">
              <Wifi className="w-3 h-3 shrink-0" />
              <span>● Online</span>
            </span>
          ) : (
            <span className="text-rose-500 flex items-center gap-1">
              <WifiOff className="w-3 h-3 shrink-0 animate-pulse" />
              <span>● Offline</span>
            </span>
          )}
        </div>

        {/* Current active application label or general status */}
        <div className="truncate hidden sm:block">
          {activeWindowId
            ? `Ativo: ${windows.find(w => w.id === activeWindowId)?.title || ''}`
            : 'Sessão ociosa'}
        </div>

        {/* Dynamic Uptime since session login */}
        <div>{sessionUptimeString ? `uptime: ${sessionUptimeString}` : '--:--:--'}</div>
      </div>

      {/* ===================== CONNECTION LOST FULL SCREEN BLOCKER ===================== */}
      {showOfflineOverlay && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-[9999]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 text-rose-500 rounded-full animate-bounce">
              <WifiOff className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Sem Conexão de Rede</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Terminal OS perdeu comunicação com o servidor de rede. Tentando restabelecer acesso automaticamente...
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
              <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
              <span>Próxima tentativa em {offlineRetryCountdown}s</span>
            </div>

            <button
              onClick={() => {
                if (navigator.onLine) {
                  setIsOnline(true);
                  setShowOfflineOverlay(false);
                } else {
                  setOfflineRetryCountdown(5);
                  alert('Não foi possível se reconectar. Verifique sua conexão de rede local.');
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 hover:text-white rounded-lg border border-slate-700 transition"
            >
              Forçar Reconexão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
