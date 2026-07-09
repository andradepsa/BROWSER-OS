# Browser OS — Web App

Sistema web (desktop no browser) projetado para rodar em terminais burros.
100% client-side, multiusuário, sem servidor — pode hospedar no GitHub Pages
e atender infinitos terminais simultâneos.

## O que é

Uma página web estática (HTML + CSS + JS) que simula um desktop dentro do navegador.
Inclui:

- **Login multiusuário** (admin/admin, user/user, guest)
- **Apps internos**: navegador, notas, calculadora, terminal, relógio, configurações
- **Sistema de janelas** (arrastar, minimizar, maximizar, fechar)
- **PWA offline-first** (funciona sem internet após primeiro carregamento)
- **Persistência por usuário** (notas salvas no localStorage do browser)
- **Design glassmorphism premium** (gradient, blur, animações suaves)
- **Monitor de conexão não-bloqueante** (banner discreto em vez de overlay)

## Estrutura

```
webapp/
├── index.html       ← página principal
├── styles.css       ← estilos (premium glassmorphism)
├── app.js           ← lógica (auth, janelas, apps, monitor)
├── manifest.json    ← PWA manifest
├── sw.js            ← service worker (cache offline)
├── icon.svg         ← ícone com gradient
└── README.md        ← este arquivo
```

## Como hospedar no GitHub Pages

### Passo 1 — Criar repositório

1. Acesse https://github.com/new
2. Nome do repositório: **`BROWSER-OS`** (ou outro nome)
3. Marque "Public"
4. Clique em **Create repository**

### Passo 2 — Subir os arquivos

Opção A (pelo navegador, mais simples):
1. No repositório, clique em **Add file → Upload files**
2. Arraste todos os arquivos desta pasta `webapp/`
3. Commit changes → "Publish"

Opção B (pelo git):
```bash
git clone https://github.com/SEU_USUARIO/BROWSER-OS.git
cd BROWSER-OS
# copie os arquivos de webapp/ para dentro do repo
cp -r /caminho/para/webapp/* .
git add .
git commit -m "Browser OS web app"
git push origin main
```

### Passo 3 — Ativar GitHub Pages

1. No repositório: **Settings → Pages**
2. Em **Source**, escolha **Deploy from a branch**
3. Branch: `main` / Pasta: `/ (root)`
4. Clique em **Save**
5. Aguarde 1-2 minutos

### Passo 4 — A URL fica

```
https://SEU_USUARIO.github.io/BROWSER-OS/
```

Exemplo:
- Se seu usuário é `andradepsa` e o repo é `BROWSER-OS` → `https://andradepsa.github.io/BROWSER-OS/`

## Customizar

### Trocar usuários/senhas

Edite `app.js`, na seção `CONFIG.users`:

```javascript
users: [
  { username: 'admin', password: 'admin', name: 'Administrador', role: 'admin' },
  { username: 'joao',  password: 'minhasenha', name: 'João Silva', role: 'user' },
  { username: 'maria', password: 'outrasenha', name: 'Maria Souza', role: 'user' }
]
```

### Adicionar app próprio

Em `app.js`, dentro de `APPS`, adicione:

```javascript
meuApp: {
  name: 'Meu App', icon: '🚀', color: '#3b82f6',
  width: 600, height: 400,
  render: (win) => `<h1>Olá ${state.currentUser.name}!</h1>`
}
```

Ele aparece automaticamente no menu e no desktop.

### Trocar cores/tema

Edite as variáveis CSS em `styles.css`:

```css
:root {
  --bg-primary: #0a0e27;
  --accent: #3b82f6;
  --accent-2: #8b5cf6;
  --accent-3: #ec4899;
}
```

## Testar localmente

```bash
cd webapp
python3 -m http.server 8000
# Abra http://localhost:8000
```

## Licença

MIT — use livremente, inclusive comercialmente.
