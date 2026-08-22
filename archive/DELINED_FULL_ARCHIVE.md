# DELINED — FULL RECREATION ARCHIVE

Complete source dump for the Delined creative-journal site. Every file needed
to rebuild the app on any React + FastAPI + MongoDB host is included below,
in the order you should create them.

---

## PROJECT AT A GLANCE

- **Concept:** Password-gated personal creative journal styled as a retro 90s
  handheld console ("Delined") sitting on a doodled notebook desk.
- **Stack:** React 19 + React Router 7 + TailwindCSS + Shadcn/ui components +
  lucide-react + sonner + axios · FastAPI + Motor (async MongoDB) + bcrypt +
  PyJWT · Emergent Object Storage · Web Audio API (synth SFX, no audio files).
- **Fonts (Google):** Inter (body) · VT323 (CRT/mono) · Caveat · Patrick Hand ·
  Permanent Marker.
- **Two roles:** Operator (admin) and Drifter (viewer). Password gate accepts
  two different passwords and routes accordingly.

## DIRECTORY LAYOUT

```
/app
├─ backend/
│  ├─ .env               <-- see "ENV VARS" section
│  ├─ requirements.txt
│  └─ server.py          (single-file FastAPI app + all routes)
└─ frontend/
   ├─ .env               <-- REACT_APP_BACKEND_URL only
   ├─ package.json
   ├─ craco.config.js
   ├─ postcss.config.js
   ├─ tailwind.config.js
   ├─ public/index.html
   └─ src/
      ├─ index.js  index.css  App.js
      ├─ context/          (AuthContext, ThemeContext)
      ├─ lib/              (sfx.js, utils.js)
      ├─ components/       (BackButton, LightSwitch, SignOutButton,
      │                     StarField, ProtectedImage, UploadField,
      │                     AdminQuickAdd, EditContentDialog,
      │                     notebook/NotebookShell.jsx, ui/…)
      └─ pages/            (PasswordGate, Disclaimer, Hub, About, Contact,
                             Drawings, Writings, Videos, SearchResults,
                             NotFound, AdminLogin, AdminPanel)
```

## ROUTES

| Path              | Component        | Access                                          |
| ----------------- | ---------------- | ----------------------------------------------- |
| `/`               | PasswordGate     | Public — retro terminal + password prompt       |
| `/disclaimer`     | Disclaimer       | After site-unlocked cookie                      |
| `/home`           | Hub              | Handheld device main menu + global search       |
| `/drawings`       | Drawings         | Notebook page — index + lightbox + inline edit  |
| `/writings`       | Writings         | Notebook page — long-form articles              |
| `/videos`         | Videos           | Notebook page — grid + player + inline edit     |
| `/about`          | About            | Notebook page — bio + socials + content warn    |
| `/contact`        | Contact          | Message board (public form + approved wall)     |
| `/search`         | SearchResults    | Cross-content search (title / #tag / content)   |
| `/admin/login`    | AdminLogin       | Legacy admin login form                         |
| `/admin`          | AdminPanel       | Full CMS + Site Images + Site Texts + Maint.    |
| `*`               | NotFound         | Retro-device 404 ("I AM ERROR")                 |

## ENV VARS

**`/backend/.env`** (single quotes on the `$`-containing values are important):

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="delined"
JWT_SECRET="change-me-in-prod"
CORS_ORIGINS="*"
ADMIN_EMAIL="delinedreferal0@gmail.com"
ADMIN_PASSWORD='U9d0wNL3FTm4in!$'
SITE_PASSWORD='$T4r7newS4V3'
APP_NAME="delined"
EMERGENT_LLM_KEY=""
MESSAGE_EMAIL="delinedmessagedrafts@gmail.com"
EMAIL_FROM="delined <onboarding@resend.dev>"
RESEND_API_KEY=""
```

**`/frontend/.env`**:

```
REACT_APP_BACKEND_URL=https://your-host.tld
```

## STARTUP FLOW

1. Boot terminal (`/`) types out lines, then prompts for password.
2. `POST /api/site/verify-password`:
   - Admin password → returns `{ ok, role:'admin', token, user }` → auto-signed
     in as Operator, navigates to `/disclaimer`.
   - Visitor password → returns `{ ok, role:'drifter' }` → drifter, navigates
     to `/disclaimer`.
   - Wrong → 401, red flicker.
3. Disclaimer page shows long copy + mascot "I Understand" button image.
4. Hub `/home` — CRT with 4 menu tiles (Drawings/Writings/Videos/Multiplayer),
   D-pad + A/B keyboard nav, color-shell selector, global search box, admin
   badge if signed in.

## KEY FEATURES

- **Two-password gate**: admin & drifter, both single-step.
- **Retro handheld UI**: mauve shell (default) + 4 alternate shells (pink /
  blue / mint / yellow), persisted in localStorage.
- **Notebook aesthetic**: paper background w/ notebook rules, sticky notes,
  washi-tape tabs, tilted polaroids, ribbon bookmark w/ mascot.
- **Content types**: drawings, writings, videos, messages — full CRUD via
  REST + partial-update PUTs. Admin edit is available both from the admin
  panel AND inline on the public pages when signed in.
- **Master admin panel** (`/admin`) controls:
  - Site Images (about photo, hub background, disclaimer button, ribbon logo)
  - Site Text Content (about page, disclaimer page, contact random-questions)
  - Maintenance → purge sample content (removes only known template rows)
  - Messages (approve / edit / delete)
  - Drawings / Writings / Videos (add / edit / delete)
- **Tagging + search**: every content type has `tags[]`. Search is available
  per page AND globally at `/search?q=…` and on the Hub itself. Query syntax:
  plain word (matches title/content/description), `#tag` (matches that tag
  exactly), multiple `#tags` = AND.
- **Web Audio SFX** (no files): boot chime, click blip, select tone, mute
  toggle persisted.
- **Backup safety**: `seed_sample_content()` is now a no-op; deleted samples
  never re-appear. Endpoint `POST /api/admin/purge-samples` cleans any
  leftover sample rows without touching real content.

## BACKEND API (all prefixed `/api`)

| Method | Path                        | Auth   | Purpose                                    |
| ------ | --------------------------- | ------ | ------------------------------------------ |
| POST   | `/site/verify-password`     | Public | Two-password gate; issues JWT if admin     |
| POST   | `/auth/login`               | Public | Admin login by email+password              |
| GET    | `/auth/me`                  | JWT    | Whoami                                     |
| POST   | `/auth/logout`              | Public | Client-side                                |
| GET    | `/drawings`                 | Public | List                                       |
| POST   | `/drawings`                 | Admin  | Create                                     |
| PUT    | `/drawings/{id}`            | Admin  | Partial update                             |
| DELETE | `/drawings/{id}`            | Admin  | Delete                                     |
| … (same set for /writings, /videos, /messages) …             |        |                                            |
| PATCH  | `/messages/{id}/approve`    | Admin  | Approve pending message                    |
| POST   | `/upload`                   | Admin  | Multipart → Emergent object storage        |
| GET    | `/files/{path:path}`        | Public | Serve uploaded file                        |
| GET/PUT| `/settings/images`          | Public/Admin | Master image map                    |
| GET/PUT| `/settings/texts`           | Public/Admin | About / Disclaimer / Contact copy   |
| GET/PUT| `/settings/about`           | Public/Admin | Backwards-compat, artist image only |
| POST   | `/admin/purge-samples`      | Admin  | One-shot cleanup of known template rows    |

## MONGODB COLLECTIONS

- `users`: `{ id, email, password_hash, name, role:'admin', created_at }`
- `drawings`: `{ id, title, date, image_path, tags[], description, created_at }`
- `writings`: `{ id, title, date, content, tags[], created_at }`
- `videos`: `{ id, title, date, video_path?, external_url?, thumbnail_path?, tags[], description, created_at }`
- `messages`: `{ id, name, email, website, found_via, sender_descriptor, message, approved, created_at }`
- `files`: metadata for uploads
- `settings`: `{ key:'images'|'texts', … }`

## LOCAL SETUP

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# fill in .env values
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# frontend
cd frontend
yarn install
yarn start   # dev
yarn build   # prod
```

MongoDB must be running locally (or point `MONGO_URL` at Atlas). All uploaded
files go to Emergent object storage — swap the small `put_object()` helper in
`server.py` with S3 / R2 / Cloudinary for a different provider.

---

## SOURCE FILES

Every file below is in the order I recommend creating them.

---

This document contains every source file needed to reproduce the site.
See the top-level README section for setup instructions.

---

## `/frontend/package.json`

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^5.0.1",
    "@radix-ui/react-accordion": "^1.2.8",
    "@radix-ui/react-alert-dialog": "^1.1.11",
    "@radix-ui/react-aspect-ratio": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.7",
    "@radix-ui/react-checkbox": "^1.2.3",
    "@radix-ui/react-collapsible": "^1.1.8",
    "@radix-ui/react-context-menu": "^2.2.12",
    "@radix-ui/react-dialog": "^1.1.11",
    "@radix-ui/react-dropdown-menu": "^2.1.12",
    "@radix-ui/react-hover-card": "^1.1.11",
    "@radix-ui/react-label": "^2.1.4",
    "@radix-ui/react-menubar": "^1.1.12",
    "@radix-ui/react-navigation-menu": "^1.2.10",
    "@radix-ui/react-popover": "^1.1.11",
    "@radix-ui/react-progress": "^1.1.4",
    "@radix-ui/react-radio-group": "^1.3.4",
    "@radix-ui/react-scroll-area": "^1.2.6",
    "@radix-ui/react-select": "^2.2.2",
    "@radix-ui/react-separator": "^1.1.4",
    "@radix-ui/react-slider": "^1.3.2",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.2.2",
    "@radix-ui/react-tabs": "^1.1.9",
    "@radix-ui/react-toast": "^1.2.11",
    "@radix-ui/react-toggle": "^1.1.6",
    "@radix-ui/react-toggle-group": "^1.1.7",
    "@radix-ui/react-tooltip": "^1.2.4",
    "axios": "^1.8.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cra-template": "1.2.0",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.507.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-day-picker": "8.10.1",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.56.2",
    "react-resizable-panels": "^3.0.1",
    "react-router-dom": "^7.5.1",
    "react-scripts": "5.0.1",
    "recharts": "^3.6.0",
    "sonner": "^2.0.3",
    "tailwind-merge": "^3.2.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "^3.24.4"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "@craco/craco": "^7.1.0",
    "@emergentbase/visual-edits": "https://assets.emergent.sh/npm/emergentbase-visual-edits-1.0.8.tgz",
    "@eslint/js": "9.23.0",
    "autoprefixer": "^10.4.20",
    "eslint": "9.23.0",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.4",
    "eslint-plugin-react-hooks": "5.2.0",
    "globals": "15.15.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17"
  },
  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
}

```

---

## `/frontend/craco.config.js`

```js
// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;

```

---

## `/frontend/postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

---

## `/frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## `/frontend/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#fdfbf7" />
    <meta name="description" content="dysthymic — a forgotten emotional journaling handheld console." />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&family=VT323&family=Caveat:wght@400;700&display=swap"
      rel="stylesheet"
    />

    <title>delined</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>

```

---

## `/frontend/src/index.js`

```js
import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

---

## `/frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ====================================================
   :ROOT — Original cream lined-notebook palette
   (applies everywhere EXCEPT inside .password-gate)
   ==================================================== */
:root {
  --bg-color: #fffaef;
  --bg-deep: #e8dcc0;
  --line-color: #d6e6fb;
  --margin-color: #ff8aa1;
  --ink-color: #1c1c22;
  --ink-soft: #5a5f66;
  --sticky-bg: #fff196;
  --sticky-alt: #ffbe7d;
  --sticky-mint: #b9ecc3;
  --sticky-sky: #c2ddf6;
  --sticky-coral: #ffb1b1;
  --tape: rgba(255, 255, 255, 0.65);
  --shadow: rgba(20, 20, 25, 0.18);
  /* Retro device (handheld) palette */
  --dev-shell: #c9aabc;
  --dev-shell-dark: #8d6c80;
  --dev-shell-light: #ebd6e1;
  --dev-bezel: #1a141a;
  --crt-bg: #2a1e10;
  --crt-fg: #f7d678;
  --crt-fg-dim: #d4a14a;
  --crt-scan: rgba(247, 214, 120, 0.08);
  --crt-glow: rgba(247, 214, 120, 0.55);
  --neon-glow: none;
  --neon-text: none;
}

/* ====================================================
   Shadcn neutral defaults (kept; not used directly)
   ==================================================== */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-color);
    color: var(--ink-color);
    -webkit-font-smoothing: antialiased;
  }
  body::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.025) 0px,
      rgba(0, 0, 0, 0.025) 1px,
      transparent 1px,
      transparent 3px
    );
    z-index: 100;
    mix-blend-mode: multiply;
    opacity: 0.55;
  }
}

/* ---------- Fonts utility ---------- */
.font-hand   { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.font-pixel  { font-family: 'VT323', monospace; letter-spacing: 0.04em; }
.font-marker { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; }

/* ---------- Paper / notebook (cream lined) ---------- */
.paper {
  background-color: var(--bg-color);
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 31px,
      var(--line-color) 31px,
      var(--line-color) 32px
    );
}
.paper::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
  opacity: 0.6;
}
.paper-margin { position: relative; }
.paper-margin::after {
  content: "";
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--margin-color);
  opacity: 0.35;
  pointer-events: none;
}

/* Spiral & three-hole punch removed in redesign (left intentionally unused) */
.spiral, .holes { display: none !important; }

/* ---------- Sticky note (paper) ---------- */
.sticky {
  background: var(--sticky-bg);
  position: relative;
  padding: 16px 18px 22px 18px;
  box-shadow: 2px 4px 8px var(--shadow), inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  clip-path: polygon(
    0% 0%, 6% 1%, 14% 0%, 22% 1.5%, 32% 0%, 44% 1%, 56% 0%, 68% 1.5%, 80% 0%, 92% 1%, 100% 0%,
    100% 94%, 96% 97%, 90% 95%, 82% 98%, 74% 95%, 66% 99%, 56% 96%, 48% 99%, 38% 96%, 28% 99%, 18% 96%, 10% 99%, 4% 96%, 0% 98%
  );
}
.sticky-alt { background: var(--sticky-alt); }
.sticky-yellow { background: var(--sticky-bg) !important; }
.sticky-peach  { background: var(--sticky-alt) !important; }
.sticky-mint   { background: var(--sticky-mint) !important; }
.sticky-sky    { background: var(--sticky-sky) !important; }
.sticky-coral  { background: var(--sticky-coral) !important; }

.tape {
  position: absolute;
  background: var(--tape);
  border: 1px dashed rgba(0, 0, 0, 0.08);
  width: 56px;
  height: 18px;
  top: -10px;
  left: 50%;
  transform: translateX(-50%) rotate(-3deg);
  box-shadow: 0 1px 3px var(--shadow);
}
.tape-tl { left: -10px; top: -8px; transform: rotate(-22deg); }
.tape-tr { left: auto; right: -10px; top: -8px; transform: rotate(22deg); }

/* ---------- PicoChat UI (paper version — sharp drop-shadow) ---------- */
.pico-window {
  border: 2px solid var(--ink-color);
  background: var(--bg-color);
  border-radius: 6px;
  box-shadow: 3px 3px 0 var(--ink-color);
  position: relative;
}
.pico-titlebar {
  background: var(--ink-color);
  color: var(--bg-color);
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  letter-spacing: 0.08em;
  padding: 2px 10px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pico-btn {
  border: 2px solid var(--ink-color);
  background: var(--bg-color);
  color: var(--ink-color);
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  padding: 4px 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  box-shadow: 2px 2px 0 var(--ink-color);
  cursor: pointer;
  transition: transform 90ms ease, box-shadow 90ms ease, background 120ms ease;
}
.pico-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink-color); }
.pico-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--ink-color); }

.pico-input {
  border: 2px solid var(--ink-color);
  background: var(--bg-color);
  color: var(--ink-color);
  font-family: 'Kalam', cursive;
  padding: 6px 10px;
  outline: none;
  width: 100%;
}
.pico-input::placeholder { color: var(--ink-soft); opacity: 0.8; }
.pico-input:focus { box-shadow: 2px 2px 0 var(--ink-color); }

/* sketchy underline */
.sketch-underline {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 8'%3E%3Cpath d='M2 5 Q 30 1 60 5 T 120 5 T 198 5' stroke='%232c3032' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 100% 8px;
  padding-bottom: 8px;
}

/* page corner fold */
.page-corner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, transparent 50%, var(--bg-deep) 50%);
  cursor: pointer;
  transition: width 120ms ease, height 120ms ease;
}
.page-corner:hover { width: 76px; height: 76px; }
.page-corner::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 100% 100%, var(--shadow) 0, transparent 60%);
  pointer-events: none;
}

/* ribbon bookmark (paper) */
.ribbon {
  position: fixed;
  top: 56px;
  left: 38px;
  width: 32px;
  height: 116px;
  background: var(--margin-color);
  z-index: 55;
  box-shadow: 2px 2px 0 var(--ink-color);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
  cursor: pointer;
  transition: height 180ms ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
  gap: 4px;
}
.ribbon:hover { height: 132px; }
.ribbon-label {
  color: var(--bg-color);
  font-family: 'VT323', monospace;
  font-size: 1rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ribbon-mascot {
  width: 18px;
  height: auto;
  display: block;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.25));
  margin-top: 2px;
}

/* ---------- Sticky-pad (perforated bottom — used on hub) ---------- */
.sticky-pad {
  background: var(--sticky-bg);
  position: relative;
  box-shadow: 4px 8px 14px var(--shadow), inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  transform: rotate(var(--tilt, 0deg));
  transition: transform 200ms ease, box-shadow 200ms ease;
  clip-path: polygon(
    0 0, 100% 0,
    100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0 92%
  );
}
.sticky-pad:hover {
  transform: rotate(var(--tilt, 0deg)) translateY(-3px);
  box-shadow: 4px 12px 22px var(--shadow);
}

/* tilt utility */
.tilt-l { transform: rotate(-1.5deg); }
.tilt-r { transform: rotate(1.6deg); }
.tilt-l2 { transform: rotate(-2.4deg); }
.tilt-r2 { transform: rotate(2.4deg); }

::selection {
  background: var(--margin-color);

/* ====================================================
   FULL-SCREEN CRT FRAME (sub-pages wrap their content
   in a giant retro monitor — notebook lives inside)
   ==================================================== */
.crt-stage {
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(ellipse at 50% 30%, #261d28 0%, #15101a 60%, #07060a 100%);
  padding: 22px;
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
}
.crt-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.05;
  mix-blend-mode: overlay;
}

.crt-monitor {
  flex: 1;
  position: relative;
  background: linear-gradient(180deg, #1a141a 0%, #0d090d 100%);
  border-radius: 22px;
  padding: 14px;
  box-shadow:
    0 30px 60px -20px rgba(0, 0, 0, 0.7),
    inset 0 2px 0 rgba(255, 255, 255, 0.05),
    inset 0 -2px 6px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}
.crt-monitor::before {
  content: "";
  position: absolute;
  inset: 8px;
  pointer-events: none;
  background:
    radial-gradient(circle at 0 0, rgba(255,255,255,0.08) 2.5px, transparent 3px),
    radial-gradient(circle at 100% 0, rgba(255,255,255,0.08) 2.5px, transparent 3px),
    radial-gradient(circle at 0 100%, rgba(255,255,255,0.08) 2.5px, transparent 3px),
    radial-gradient(circle at 100% 100%, rgba(255,255,255,0.08) 2.5px, transparent 3px);
  background-size: 6px 6px;
  background-position: 0 0, 100% 0, 0 100%, 100% 100%;
  background-repeat: no-repeat;
}

.crt-monitor-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'VT323', monospace;
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(247, 214, 120, 0.8);
  padding: 4px 14px 10px;
}
.crt-monitor-statusbar .led {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 9999px;
  background: #80ff80;
  margin-right: 6px;
  box-shadow: 0 0 6px #80ff80;
}

.crt-monitor-glass {
  position: relative;
  flex: 1;
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-color);
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.35),
    inset 0 0 6px rgba(247, 214, 120, 0.18);
}
.crt-monitor-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.05) 0px,
    rgba(0, 0, 0, 0.05) 1px,
    transparent 1px,
    transparent 3px
  );
}
.crt-monitor-glass::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 31;
  background:
    radial-gradient(ellipse at center, transparent 70%, rgba(0, 0, 0, 0.35) 100%);
}
.crt-monitor-glass > * { position: relative; z-index: 1; }

.sound-toggle {
  position: absolute;
  top: 10px;
  left: 14px;
  z-index: 40;
  font-family: 'VT323', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
  color: rgba(247, 214, 120, 0.85);
  border: 1px solid rgba(247, 214, 120, 0.35);
  cursor: pointer;
}
.sound-toggle:hover { color: var(--crt-fg); background: rgba(0, 0, 0, 0.6); }

@media (max-width: 640px) {
  .crt-stage { padding: 8px; }
  .crt-monitor { padding: 8px; border-radius: 14px; }
  .crt-monitor-statusbar { font-size: 0.75rem; padding: 2px 8px 6px; }
}

  color: var(--bg-color);
}

@keyframes wobble {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
.wobble { animation: wobble 4s ease-in-out infinite; }

/* erased graphite placeholder */
.graphite-eraser {
  background: linear-gradient(135deg, rgba(140, 140, 140, 0.35), rgba(180, 180, 180, 0.15));
  filter: blur(0.4px);
  position: relative;
}
.graphite-eraser::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(35deg, rgba(60, 60, 60, 0.18) 0px, rgba(60, 60, 60, 0.18) 1px, transparent 1px, transparent 5px),
    repeating-linear-gradient(-25deg, rgba(60, 60, 60, 0.12) 0px, rgba(60, 60, 60, 0.12) 1px, transparent 1px, transparent 7px);
  mix-blend-mode: multiply;
  opacity: 0.7;
}

/* light switch (default paper look — used inside .password-gate, gets neon overrides there) */
.light-switch {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  border: 2px solid var(--ink-color);
  background: var(--sticky-bg);
  box-shadow: 3px 3px 0 var(--ink-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'VT323', monospace;
  font-size: 1.0rem;
  color: var(--ink-color);
  z-index: 60;
  transition: transform 150ms ease;
  letter-spacing: 0.04em;
}
.light-switch:hover { transform: rotate(-8deg) scale(1.05); }
.light-switch:active { transform: scale(0.94); }

/* lightbox */
.lightbox-bg {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 25, 0.78);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* scrollbar */
.notebook-scroll::-webkit-scrollbar { width: 10px; }
.notebook-scroll::-webkit-scrollbar-track { background: transparent; }
.notebook-scroll::-webkit-scrollbar-thumb {
  background: var(--ink-soft);
  border-radius: 9999px;
  border: 2px solid var(--bg-color);
}

/* ====================================================
   STAR FIELD (used on password page)
   ==================================================== */
@keyframes star-fall {
  0%   { transform: translate3d(0, -10vh, 0); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate3d(0, 110vh, 0); opacity: 0; }
}
@keyframes star-twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1.1); }
}
.star-field { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.star-field .shoot {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100px;
  background: linear-gradient(180deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 200, 255, 0.6) 40%,
    rgba(180, 120, 255, 1) 80%,
    rgba(255, 255, 255, 1) 100%);
  border-radius: 9999px;
  filter: drop-shadow(0 0 6px rgba(180, 120, 255, 0.9))
          drop-shadow(0 0 14px rgba(120, 80, 255, 0.6));
  animation: star-fall linear infinite;
}
.star-field .shoot::after {
  content: "";
  position: absolute;
  bottom: -6px;
  left: -4px;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: #fff;
  box-shadow:
    0 0 8px 2px rgba(255, 220, 255, 0.95),
    0 0 18px 4px rgba(180, 120, 255, 0.7),
    0 0 28px 8px rgba(120, 80, 255, 0.45);
}
.star-field .dot {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(200, 170, 255, 0.9);
  animation: star-twinkle ease-in-out infinite;
}

/* ====================================================
   PASSWORD GATE — Neon Cyber overrides (scoped)
   The .password-gate wrapper class scopes the neon
   palette + glow styling to ONLY the password page.
   ==================================================== */
.password-gate.theme-cyber-magenta {
  --bg-color: #0a0510;
  --bg-deep: #050208;
  --line-color: #ff2bd6;
  --margin-color: #ff0066;
  --ink-color: #fde8ff;
  --ink-soft: #d49ce0;
  --sticky-bg: #1e0420;
  --sticky-alt: #2d0834;
  --tape: rgba(255, 43, 214, 0.18);
  --shadow: rgba(255, 0, 128, 0.45);
  --neon-glow: 0 0 6px var(--line-color), 0 0 14px var(--line-color), 0 0 26px var(--margin-color);
  --neon-text: 0 0 4px var(--line-color), 0 0 10px rgba(255, 43, 214, 0.55);
}
.password-gate.theme-cyber-cyan {
  --bg-color: #02080c;
  --bg-deep: #010406;
  --line-color: #00f0ff;
  --margin-color: #0099ff;
  --ink-color: #dafdff;
  --ink-soft: #79c7d3;
  --sticky-bg: #03242e;
  --sticky-alt: #053442;
  --tape: rgba(0, 240, 255, 0.18);
  --shadow: rgba(0, 200, 255, 0.45);
  --neon-glow: 0 0 6px var(--line-color), 0 0 14px var(--line-color), 0 0 26px var(--margin-color);
  --neon-text: 0 0 4px var(--line-color), 0 0 10px rgba(0, 240, 255, 0.55);
}
.password-gate.theme-cyber-lime {
  --bg-color: #04090a;
  --bg-deep: #020505;
  --line-color: #39ff14;
  --margin-color: #00ff88;
  --ink-color: #dafce4;
  --ink-soft: #7adc9a;
  --sticky-bg: #042c18;
  --sticky-alt: #053f22;
  --tape: rgba(57, 255, 20, 0.18);
  --shadow: rgba(0, 255, 136, 0.45);
  --neon-glow: 0 0 6px var(--line-color), 0 0 14px var(--line-color), 0 0 26px var(--margin-color);
  --neon-text: 0 0 4px var(--line-color), 0 0 10px rgba(57, 255, 20, 0.55);
}
.password-gate.theme-cyber-violet {
  --bg-color: #08041a;
  --bg-deep: #04020e;
  --line-color: #b14cff;
  --margin-color: #7a00ff;
  --ink-color: #ecdcff;
  --ink-soft: #b095d2;
  --sticky-bg: #1c0830;
  --sticky-alt: #2a0d44;
  --tape: rgba(177, 76, 255, 0.18);
  --shadow: rgba(122, 0, 255, 0.45);
  --neon-glow: 0 0 6px var(--line-color), 0 0 14px var(--line-color), 0 0 26px var(--margin-color);
  --neon-text: 0 0 4px var(--line-color), 0 0 10px rgba(177, 76, 255, 0.55);
}

/* Neon glow style overrides — scoped to password gate only */
.password-gate .sticky {
  box-shadow:
    0 0 0 1px var(--line-color),
    0 0 12px var(--shadow),
    0 0 28px var(--shadow),
    inset 0 0 16px rgba(0, 0, 0, 0.35);
}
.password-gate .pico-btn {
  background: transparent;
  color: var(--ink-color);
  border-color: var(--line-color);
  box-shadow: 0 0 0 1px var(--line-color), 0 0 10px var(--shadow);
  text-shadow: var(--neon-text);
}
.password-gate .pico-btn:hover {
  background: var(--line-color);
  color: var(--bg-color);
  text-shadow: none;
  box-shadow: 0 0 0 1px var(--line-color), 0 0 18px var(--line-color), 0 0 32px var(--margin-color);
}
.password-gate .pico-input {
  border-color: var(--line-color);
  background: rgba(0, 0, 0, 0.35);
  color: var(--ink-color);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4), 0 0 6px var(--shadow);
}
.password-gate .pico-input:focus {
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4), 0 0 12px var(--line-color);
}
.password-gate .font-marker { text-shadow: var(--neon-text); }
.password-gate .light-switch {
  border-color: var(--line-color);
  background: var(--bg-color);
  color: var(--line-color);
  box-shadow: 0 0 10px var(--line-color), 0 0 22px var(--margin-color);
  text-shadow: var(--neon-text);
}
.password-gate .light-switch:hover {
  transform: rotate(-12deg) scale(1.08);
  box-shadow: 0 0 14px var(--line-color), 0 0 32px var(--margin-color), 0 0 50px var(--margin-color);
}


/* ====================================================
   RETRO HANDHELD DEVICE (Homepage hub)
   ==================================================== */
@keyframes crt-flicker {
  0%, 100% { opacity: 1; }
  47%      { opacity: 0.98; }
  48%      { opacity: 0.92; }
  49%      { opacity: 0.99; }
}
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes power-pulse {
  0%, 100% { box-shadow: 0 0 4px #80ff80, 0 0 10px rgba(120, 255, 120, 0.5); }
  50%      { box-shadow: 0 0 8px #80ff80, 0 0 18px rgba(120, 255, 120, 0.8); }
}
@keyframes screen-on {
  0%   { transform: scale(0.02, 0.001); opacity: 0; filter: brightness(2.5); }
  20%  { transform: scale(1, 0.004); opacity: 0.6; filter: brightness(2.5); }
  35%  { transform: scale(1, 1); opacity: 1; filter: brightness(2.5); }
  60%  { filter: brightness(1.1); }
  100% { filter: brightness(1); }
}
@keyframes static-noise {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-2%, 1%); }
  40%  { transform: translate(1%, -2%); }
  60%  { transform: translate(-1%, 2%); }
  80%  { transform: translate(2%, -1%); }
  100% { transform: translate(0, 0); }
}

.retro-stage {
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg-color);
  background-image:
    url("https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/df20ee9o_15187.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.retro-stage::before {
  /* warm paper tint + soft vignette so the device still pops */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(180deg, rgba(255, 250, 239, 0.18), rgba(255, 250, 239, 0.22));
  mix-blend-mode: multiply;
}
.retro-stage::after {
  /* subtle paper grain overlay */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.08;
  mix-blend-mode: overlay;
}

/* ---------- Hand-drawn doodles scattered behind the device ---------- */
.doodle-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}
.doodle {
  position: absolute;
  color: var(--ink-soft);
  opacity: 0.55;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.02));
  transform-origin: center;
  animation: doodle-bob 7s ease-in-out infinite;
}
.doodle svg { display: block; width: 100%; height: 100%; }
.doodle.tint-rose  { color: #c75d7a; opacity: 0.5; }
.doodle.tint-ink   { color: #1c1c22; opacity: 0.45; }
.doodle.tint-mint  { color: #5a8c6b; opacity: 0.5; }
.doodle.tint-blue  { color: #4d6e9a; opacity: 0.5; }
.doodle.tint-amber { color: #b07a1f; opacity: 0.55; }
@keyframes doodle-bob {
  0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); }
  50%      { transform: translate(0, -4px) rotate(calc(var(--r, 0deg) + 1.5deg)); }
}
.doodle-word {
  position: absolute;
  pointer-events: none;
  font-family: 'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive;
  color: var(--ink-soft);
  opacity: 0.42;
  letter-spacing: 0.02em;
  transform-origin: center;
}
.doodle-word.tint-rose { color: #c75d7a; opacity: 0.5; }
.doodle-word.tint-blue { color: #4d6e9a; opacity: 0.5; }

.device {
  width: min(680px, 95vw);
  background: linear-gradient(180deg, var(--dev-shell-light) 0%, var(--dev-shell) 35%, var(--dev-shell-dark) 100%);
  border-radius: 24px 24px 36px 36px;
  padding: 26px 28px 36px;
  position: relative;
  box-shadow:
    0 30px 60px -20px rgba(0, 0, 0, 0.7),
    inset 0 2px 0 rgba(255, 255, 255, 0.45),
    inset 0 -6px 16px rgba(0, 0, 0, 0.18);
  transition: background 350ms ease;
}

/* ---- Device shell color variants ---- */
.device[data-shell="mauve"]     { --dev-shell-light:#ebd6e1; --dev-shell:#c9aabc; --dev-shell-dark:#8d6c80; }
.device[data-shell="magenta"]   { --dev-shell-light:#ffcfe6; --dev-shell:#ff5fb0; --dev-shell-dark:#9c1a6a; }
.device[data-shell="cyan"]      { --dev-shell-light:#cdf5ff; --dev-shell:#46c8e0; --dev-shell-dark:#176880; }
.device[data-shell="turquoise"] { --dev-shell-light:#c9f3e1; --dev-shell:#3ec9a0; --dev-shell-dark:#0e6e54; }
.device[data-shell="navy"]      { --dev-shell-light:#aab5d2; --dev-shell:#2f3e6c; --dev-shell-dark:#121a36; }
.device[data-shell="olive"]     { --dev-shell-light:#e1deb3; --dev-shell:#a8a062; --dev-shell-dark:#534f24; }
.device::before {
  /* speckled plastic */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  opacity: 0.18;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'VT323', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--dev-shell-dark);
  margin-bottom: 12px;
}
.power-led {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: #80ff80;
  margin-right: 6px;
  animation: power-pulse 2.2s ease-in-out infinite;
}

.screen-bezel {
  background: linear-gradient(180deg, #0a070a 0%, #1a141a 100%);
  border-radius: 14px;
  padding: 18px;
  box-shadow:
    inset 0 4px 14px rgba(0, 0, 0, 0.7),
    inset 0 -2px 6px rgba(255, 255, 255, 0.04);
  position: relative;
}
.screen-bezel::after {
  /* tiny screws in corners */
  content: "";
  position: absolute;
  inset: 6px;
  pointer-events: none;
  background:
    radial-gradient(circle at 0 0, #2a1a2a 2.5px, transparent 3px),
    radial-gradient(circle at 100% 0, #2a1a2a 2.5px, transparent 3px),
    radial-gradient(circle at 0 100%, #2a1a2a 2.5px, transparent 3px),
    radial-gradient(circle at 100% 100%, #2a1a2a 2.5px, transparent 3px);
  background-size: 6px 6px;
  background-position: 0 0, 100% 0, 0 100%, 100% 100%;
  background-repeat: no-repeat;
}

.crt-screen {
  position: relative;
  background: var(--crt-bg);
  border-radius: 8px;
  padding: 18px;
  min-height: 380px;
  overflow: hidden;
  color: var(--crt-fg);
  font-family: 'VT323', monospace;
  text-shadow: 0 0 4px var(--crt-glow);
  box-shadow:
    inset 0 0 50px rgba(0, 0, 0, 0.65),
    inset 0 0 8px var(--crt-glow);
  transform-origin: center;
  animation: screen-on 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both, crt-flicker 5s infinite;
}
.crt-screen::before {
  /* scanlines */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    var(--crt-scan) 0px,
    var(--crt-scan) 1px,
    transparent 1px,
    transparent 3px
  );
  z-index: 2;
}
.crt-screen::after {
  /* vignette + curvature glow */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
  z-index: 3;
}
.crt-noise {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  opacity: 0.18;
  animation: static-noise 250ms steps(6, end) infinite;
  z-index: 1;
}

.crt-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  letter-spacing: 0.18em;
  color: var(--crt-fg-dim);
  text-transform: uppercase;
  border-bottom: 1px solid rgba(247, 214, 120, 0.25);
  padding-bottom: 6px;
  margin-bottom: 14px;
  position: relative;
  z-index: 4;
}
.crt-title {
  text-align: center;
  font-size: 1.65rem;
  letter-spacing: 0.32em;
  margin: 6px 0 18px;
  position: relative;
  z-index: 4;
}
.crt-blink {
  display: inline-block;
  animation: blink 1s steps(2, end) infinite;
}
.crt-grid {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.crt-card {
  position: relative;
  background: rgba(247, 214, 120, 0.05);
  border: 2px solid var(--crt-fg-dim);
  padding: 12px 14px 14px;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
  text-decoration: none;
  color: var(--crt-fg);
}
.crt-card::before {
  /* pixel-stepped corner accents */
  content: "";
  position: absolute;
  inset: -4px;
  pointer-events: none;
  background:
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) top    left  / 8px 2px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) top    left  / 2px 8px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) top    right / 8px 2px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) top    right / 2px 8px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) bottom left  / 8px 2px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) bottom left  / 2px 8px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) bottom right / 8px 2px no-repeat,
    linear-gradient(var(--crt-fg-dim), var(--crt-fg-dim)) bottom right / 2px 8px no-repeat;
  opacity: 0;
  transition: opacity 140ms ease;
}
.crt-card:hover, .crt-card:focus-visible {
  transform: translateY(-2px);
  background: rgba(247, 214, 120, 0.14);
  box-shadow: 0 0 0 1px var(--crt-fg) inset, 0 0 16px var(--crt-glow);
  outline: none;
}
.crt-card:hover::before, .crt-card:focus-visible::before { opacity: 1; }
.crt-card:active { transform: translateY(0); }

.crt-card .label {
  font-size: 1.4rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.crt-card .sub {
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--crt-fg-dim);
  margin-top: 2px;
}
.crt-card .arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  font-size: 1.1rem;
}
.crt-card:hover .arrow { opacity: 1; transform: translateY(-50%) translateX(3px); }
.crt-footer {
  position: relative;
  z-index: 4;
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  font-size: 0.92rem;
  letter-spacing: 0.18em;
  color: var(--crt-fg-dim);
  text-transform: uppercase;
}

/* Controls (D-pad and buttons) */
.controls {
  margin-top: 22px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}
.dpad {
  width: 84px;
  height: 84px;
  position: relative;
}
.dpad button {
  position: absolute;
  background: linear-gradient(180deg, #2b202b 0%, #1a121a 100%);
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 4px rgba(0,0,0,0.4);
  border: 0;
  padding: 0;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.55);
  font-family: 'VT323', monospace;
  font-size: 0.9rem;
  transition: transform 80ms ease, box-shadow 80ms ease, color 120ms ease;
}
.dpad button:hover { color: rgba(255, 255, 255, 0.9); }
.dpad button:active { transform: translateY(1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.4); }
.dpad .up    { top: 0;      left: 28px;  width: 28px; height: 30px; border-radius: 4px 4px 0 0; }
.dpad .down  { bottom: 0;   left: 28px;  width: 28px; height: 30px; border-radius: 0 0 4px 4px; }
.dpad .left  { left: 0;     top: 28px;   width: 30px; height: 28px; border-radius: 4px 0 0 4px; }
.dpad .right { right: 0;    top: 28px;   width: 30px; height: 28px; border-radius: 0 4px 4px 0; }
.dpad .center {
  left: 28px; top: 28px; width: 28px; height: 28px;
  background: #1a121a;
  border-radius: 2px;
  cursor: default;
}

.start-select {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}
.pill-btn {
  background: linear-gradient(180deg, #6b5260 0%, #463240 100%);
  color: var(--dev-shell-light);
  font-family: 'VT323', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 2px 3px rgba(0, 0, 0, 0.3);
  border: 0;
}

.ab-buttons {
  display: grid;
  grid-template-columns: auto auto;
  gap: 12px;
  align-items: center;
  transform: rotate(-22deg);
  padding-top: 4px;
}
.ab-button {
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background: linear-gradient(180deg, #f4b3c4 0%, #c2778c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'VT323', monospace;
  font-size: 1.4rem;
  color: #2b1722;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -2px 0 rgba(0, 0, 0, 0.18),
    0 3px 5px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  text-decoration: none;
  transition: transform 90ms ease, box-shadow 90ms ease;
}
.ab-button:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3); }
.ab-button .ringlabel {
  position: absolute;
  margin-top: 56px;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  color: var(--dev-shell-dark);
  text-shadow: none;
}

/* ---- Color strips under the A/B buttons ---- */
/* ---- Color strips moved into their own row below the controls ---- */
.color-strips-row {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.color-strips-row .label {
  font-family: 'VT323', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dev-shell-dark);
}
.color-strips {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  width: 220px;
  margin: 0;
}
.color-strip {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  border: 0;
  padding: 0;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 1px 2px rgba(0, 0, 0, 0.35);
  transition: transform 90ms ease, box-shadow 120ms ease, height 120ms ease;
}
.color-strip:hover  { transform: translateY(-1px); height: 8px; }
.color-strip[aria-pressed="true"] {
  height: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 0 0 2px rgba(0, 0, 0, 0.45), 0 0 12px currentColor;
}
.color-strip-mauve     { background: #c9aabc; color: #c9aabc; }
.color-strip-magenta   { background: #ff5fb0; color: #ff5fb0; }
.color-strip-cyan      { background: #46c8e0; color: #46c8e0; }
.color-strip-turquoise { background: #3ec9a0; color: #3ec9a0; }
.color-strip-navy      { background: #2f3e6c; color: #2f3e6c; }
.color-strip-olive     { background: #a8a062; color: #a8a062; }

/* Speaker grill removed in v2 of the device — kept the rule for safety */
.speaker-grill { display: none !important; }

/* Mobile */
@media (max-width: 640px) {
  .device { padding: 18px 18px 26px; border-radius: 18px 18px 26px 26px; }
  .crt-screen { min-height: 320px; padding: 14px; }
  .crt-title { font-size: 1.3rem; letter-spacing: 0.25em; }
  .crt-card .label { font-size: 1.1rem; }
  .controls { grid-template-columns: 1fr; gap: 10px; justify-items: center; }
  .ab-buttons { transform: rotate(0); }
}

/* Back-to-menu pill (subpages) */
.back-pill {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 55;
  font-family: 'VT323', monospace;
  font-size: 0.9rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 6px 12px;
  background: var(--bg-color);
  color: var(--ink-color);
  border: 2px solid var(--ink-color);
  border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink-color);
  text-decoration: none;
  transition: transform 90ms ease, box-shadow 90ms ease;
}
.back-pill:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink-color); }
.back-pill:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--ink-color); }

```

---

## `/frontend/src/App.js`

```js
import React, { useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import "./App.css";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import PasswordGate from "./pages/PasswordGate";
import Disclaimer from "./pages/Disclaimer";
import Hub from "./pages/Hub";
import Drawings from "./pages/Drawings";
import Writings from "./pages/Writings";
import Videos from "./pages/Videos";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import SearchResults from "./pages/SearchResults";

import { RibbonBookmark } from "./components/notebook/NotebookShell";
import BackButton from "./components/BackButton";
import SignOutButton from "./components/SignOutButton";

const RequireSiteAccess = ({ children, needDisclaimer = true }) => {
  const { siteUnlocked, disclaimerAccepted } = useAuth();
  const location = useLocation();
  if (!siteUnlocked) return <Navigate to="/" replace state={{ from: location }} />;
  if (needDisclaimer && !disclaimerAccepted) return <Navigate to="/disclaimer" replace />;
  return children;
};

const Layout = () => {
  // disable global right-click for art protection
  useEffect(() => {
    const onCtx = (e) => {
      const t = e.target;
      if (t && (t.tagName === "IMG" || t.tagName === "VIDEO")) e.preventDefault();
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  const { siteUnlocked, disclaimerAccepted } = useAuth();
  const { pathname } = useLocation();
  const onAuthScreens = pathname === "/" || pathname === "/disclaimer";
  const onHub = pathname === "/home";
  const showSignOut = siteUnlocked && disclaimerAccepted && !onAuthScreens && !onHub;

  return (
    <>
      <RibbonBookmark />
      <BackButton />
      {showSignOut && <SignOutButton variant="pill" />}
    </>
  );
};

function AppShell() {
  const toastOptions = useMemo(() => ({ className: "font-hand" }), []);
  return (
    <BrowserRouter>
      <Layout />
      <Routes>
        <Route path="/" element={<PasswordGate />} />
        <Route path="/disclaimer" element={
          <RequireSiteAccess needDisclaimer={false}><Disclaimer /></RequireSiteAccess>
        } />
        <Route path="/home" element={<RequireSiteAccess><Hub /></RequireSiteAccess>} />
        <Route path="/drawings" element={<RequireSiteAccess><Drawings /></RequireSiteAccess>} />
        <Route path="/writings" element={<RequireSiteAccess><Writings /></RequireSiteAccess>} />
        <Route path="/videos" element={<RequireSiteAccess><Videos /></RequireSiteAccess>} />
        <Route path="/about" element={<RequireSiteAccess><About /></RequireSiteAccess>} />
        <Route path="/contact" element={<RequireSiteAccess><Contact /></RequireSiteAccess>} />
        <Route path="/search" element={<RequireSiteAccess><SearchResults /></RequireSiteAccess>} />
        <Route path="/admin/login" element={<RequireSiteAccess><AdminLogin /></RequireSiteAccess>} />
        <Route path="/admin" element={<RequireSiteAccess><AdminPanel /></RequireSiteAccess>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="bottom-center" toastOptions={toastOptions} />
    </BrowserRouter>
  );
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;

```

---

## `/frontend/src/context/AuthContext.jsx`

```jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // site password gate
  const [siteUnlocked, setSiteUnlocked] = useState(() => sessionStorage.getItem("site-unlocked") === "1");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => sessionStorage.getItem("disclaimer-accepted") === "1");

  // admin auth
  const [token, setToken] = useState(() => localStorage.getItem("admin-token") || null);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (!token) { setAdmin(null); return; }
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setAdmin(r.data))
      .catch(() => { setToken(null); localStorage.removeItem("admin-token"); });
  }, [token]);

  const verifySitePassword = async (password) => {
    const { data } = await axios.post(`${API}/site/verify-password`, { password });
    sessionStorage.setItem("site-unlocked", "1");
    setSiteUnlocked(true);
    // If the password matched the admin's, the backend issues a JWT in the
    // same call — store it so the user enters as the operator without a
    // second login step.
    if (data && data.token) {
      localStorage.setItem("admin-token", data.token);
      setToken(data.token);
      if (data.user) setAdmin(data.user);
    }
    return data;
  };

  const acceptDisclaimer = () => {
    sessionStorage.setItem("disclaimer-accepted", "1");
    setDisclaimerAccepted(true);
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("admin-token", data.token);
    setToken(data.token);
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("admin-token");
    setToken(null);
    setAdmin(null);
  };

  // Full sign-out: clears the site password gate, disclaimer flag, and
  // any admin session. Sends user back to the boot/password screen.
  const signOut = () => {
    localStorage.removeItem("admin-token");
    sessionStorage.removeItem("site-unlocked");
    sessionStorage.removeItem("disclaimer-accepted");
    setToken(null);
    setAdmin(null);
    setSiteUnlocked(false);
    setDisclaimerAccepted(false);
  };

  return (
    <AuthContext.Provider value={useMemo(() => ({
      siteUnlocked, verifySitePassword,
      disclaimerAccepted, acceptDisclaimer,
      token, admin, login, logout, signOut, API,
    }), [siteUnlocked, disclaimerAccepted, token, admin])}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

```

---

## `/frontend/src/context/ThemeContext.jsx`

```jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const THEMES = ["theme-cyber-magenta", "theme-cyber-cyan", "theme-cyber-lime", "theme-cyber-violet"];
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("journal-theme");
    if (saved && THEMES.includes(saved)) return saved;
    return "theme-cyber-magenta";
  });

  const cycleTheme = () => {
    const i = THEMES.indexOf(theme);
    const next = THEMES[(i + 1) % THEMES.length];
    setTheme(next);
    localStorage.setItem("journal-theme", next);
  };

  return (
    <ThemeContext.Provider value={useMemo(() => ({ theme, setTheme, cycleTheme, themes: THEMES }), [theme])}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

```

---

## `/frontend/src/lib/sfx.js`

```js
// Tiny synth-tone SFX layer using the Web Audio API. No audio files.
// Browsers block audio until a user gesture — we resume the context on the
// first interaction. Calls before that will fail silently.

let ctx = null;
let muted = false;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
};

export const unlockAudio = () => {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
};

export const setMuted = (m) => { muted = !!m; };
export const isMuted = () => muted;

const tone = (freq, duration = 0.08, type = "square", gainPeak = 0.06) => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
  } catch (e) {
    // Audio nodes can fail when the page is hidden or context is suspended.
    // Logged at warn level so the page does not crash but the failure is visible.
    if (typeof console !== "undefined") console.warn("sfx tone failed:", e);
  }
};

export const blip = () => tone(880, 0.05, "square", 0.05);
export const click = () => tone(440, 0.07, "square", 0.06);
export const select = () => {
  tone(660, 0.06, "square", 0.06);
  setTimeout(() => tone(990, 0.08, "square", 0.05), 60);
};
export const boot = () => {
  // Arpeggio: C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.06), i * 110));
};

```

---

## `/frontend/src/lib/utils.js`

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

```

---

## `/frontend/src/components/BackButton.jsx`

```jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Small retro pill in the upper-right of every page that returns to /home.
 * Hidden on the password gate, disclaimer, and the home page itself.
 */
const BackButton = () => {
  const { pathname } = useLocation();
  if (pathname === "/" || pathname === "/disclaimer" || pathname === "/home") return null;
  return (
    <Link to="/home" className="back-pill" data-testid="back-to-menu-pill">
      ◁ menu
    </Link>
  );
};

export default BackButton;

```

---

## `/frontend/src/components/LightSwitch.jsx`

```jsx
import React from "react";
import { useTheme } from "../context/ThemeContext";

const SHORT = {
  "theme-cyber-magenta": "MGNT",
  "theme-cyber-cyan": "CYAN",
  "theme-cyber-lime": "LIME",
  "theme-cyber-violet": "VLET",
};

const LightSwitch = () => {
  const { theme, cycleTheme } = useTheme();
  return (
    <button
      onClick={cycleTheme}
      className="light-switch"
      data-testid="theme-light-switch"
      aria-label="cycle color scheme"
      title={`scheme: ${theme.replace("theme-cyber-", "")}`}
    >
      {SHORT[theme] || "⏻"}
    </button>
  );
};

export default LightSwitch;

```

---

## `/frontend/src/components/SignOutButton.jsx`

```jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as sfx from "../lib/sfx";

/**
 * Power off / sign out button.
 * Clears the site password gate, disclaimer flag, and any admin session,
 * then sends the user back to the boot/password screen.
 *
 * `variant`:
 *   - "device" — for the device header on the hub
 *   - "pill"   — for the upper-right corner on sub-pages
 */
const SignOutButton = ({ variant = "pill" }) => {
  const { signOut, admin } = useAuth();
  const navigate = useNavigate();

  const handle = () => {
    sfx.click();
    signOut();
    navigate("/");
  };

  if (variant === "device") {
    return (
      <button
        type="button"
        onClick={handle}
        className="pill-btn"
        data-testid="device-power-off-btn"
        title={admin ? "sign out (operator)" : "power off"}
        style={{ marginLeft: 8 }}
      >
        ⏻ power off
      </button>
    );
  }

  // pill variant — sits to the LEFT of the back-to-menu pill (top-right corner)
  return (
    <button
      type="button"
      onClick={handle}
      className="back-pill"
      data-testid="signout-pill"
      style={{ right: 110 }}
      title={admin ? "sign out (operator)" : "power off"}
    >
      ⏻ {admin ? "sign out" : "power off"}
    </button>
  );
};

export default SignOutButton;

```

---

## `/frontend/src/components/StarField.jsx`

```jsx
import React, { useMemo } from "react";

// Procedurally generated neon shooting stars + twinkle dots.
// Self-contained — drop inside any positioned container.
const StarField = ({ shootingCount = 14, dotCount = 60 }) => {
  const shooting = useMemo(() => {
    return Array.from({ length: shootingCount }).map((_, i) => {
      const left = Math.random() * 130; // % — start can go off the right edge so trail crosses screen
      const delay = Math.random() * 6;
      const duration = 3 + Math.random() * 5;
      const height = 60 + Math.random() * 120;
      return { id: `s-${i}`, left, delay, duration, height };
    });
  }, [shootingCount]);

  const dots = useMemo(() => {
    return Array.from({ length: dotCount }).map((_, i) => {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const delay = Math.random() * 4;
      const duration = 2 + Math.random() * 4;
      const size = 1 + Math.random() * 2;
      return { id: `d-${i}`, top, left, delay, duration, size };
    });
  }, [dotCount]);

  return (
    <div className="star-field" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className="dot"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
      {shooting.map((s) => (
        <span
          key={s.id}
          className="shoot"
          style={{
            left: `${s.left}%`,
            height: `${s.height}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default StarField;

```

---

## `/frontend/src/components/ProtectedImage.jsx`

```jsx
import React from "react";

// Resolves a stored image_path:
// - If it's an http(s) URL, return as-is.
// - Otherwise treat it as a storage_path served via /api/files/{path}.
export const resolveMediaUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${process.env.REACT_APP_BACKEND_URL}/api/files/${path}`;
};

const ProtectedImage = ({ src, alt = "", className = "", style }) => {
  return (
    <img
      src={resolveMediaUrl(src)}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // prevent middle/right click triggers
        if (e.button === 2) e.preventDefault();
      }}
    />
  );
};

export default ProtectedImage;

```

---

## `/frontend/src/components/UploadField.jsx`

```jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/*
 * Small file-upload button used by the admin UI. Wraps POST /api/upload.
 * onUploaded is called with the returned storage_path so the parent can put
 * it into form state.
 */
const UploadField = ({ label, onUploaded, accept, testId }) => {
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("delined-admin-token") || localStorage.getItem("admin-token");
    if (!token) { toast("not signed in"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/upload`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      onUploaded(data.storage_path);
      toast(`uploaded ${file.name}`);
    } catch {
      toast("upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <label className="pico-btn cursor-pointer inline-block" data-testid={testId}>
      {busy ? "uploading..." : label}
      <input type="file" className="hidden" accept={accept} onChange={onPick} />
    </label>
  );
};

export default UploadField;

```

---

## `/frontend/src/components/AdminQuickAdd.jsx`

```jsx
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdminQuickAdd
 * Renders nothing for visitors. For an authenticated admin, renders a small
 * sticky-styled "+ add new" button that toggles an inline form for the given
 * content type (drawing | writing | video).
 *
 * On successful submit it calls onAdded() so the parent page can refresh.
 */
const AdminQuickAdd = ({ type, onAdded }) => {
  const { admin, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Shared form fields (only the relevant ones are rendered per type)
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [thumbPath, setThumbPath] = useState("");

  if (!admin || !token) return null;

  const reset = () => {
    setTitle(""); setDate(""); setTags(""); setDescription("");
    setImagePath(""); setContent(""); setExternalUrl(""); setVideoPath(""); setThumbPath("");
  };

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  const uploadFile = async (file, setter) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setter(data.storage_path);
      toast(`uploaded: ${file.name}`);
    } catch (err) {
      toast("upload failed");
    } finally {
      setUploading(false);
    }
  };

  const todayStr = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  };

  const submit = async (e) => {
    e?.preventDefault();
    const tagArr = tags.split(",").map(s => s.trim()).filter(Boolean);
    const finalDate = date || todayStr();
    try {
      setBusy(true);
      if (type === "drawing") {
        if (!title || !imagePath) { toast("title and image required"); return; }
        await api.post("/drawings", { title, date: finalDate, image_path: imagePath, tags: tagArr, description });
      } else if (type === "writing") {
        if (!title || !content) { toast("title and content required"); return; }
        await api.post("/writings", { title, date: finalDate, content, tags: tagArr });
      } else if (type === "video") {
        if (!title || (!externalUrl && !videoPath)) { toast("title and either upload or url required"); return; }
        await api.post("/videos", {
          title, date: finalDate,
          external_url: externalUrl || null,
          video_path: videoPath || null,
          thumbnail_path: thumbPath || null,
          tags: tagArr,
          description,
        });
      }
      toast("added ✓");
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast("could not save");
    } finally {
      setBusy(false);
    }
  };

  const FileUpload = ({ label, accept, onPath, testId }) => (
    <label className="pico-btn cursor-pointer inline-block" data-testid={testId}>
      {uploading ? "uploading..." : label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => uploadFile(e.target.files?.[0], onPath)}
      />
    </label>
  );

  return (
    <div className="mb-4" data-testid={`admin-quick-add-${type}`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="pico-btn"
          data-testid={`admin-quick-add-open-${type}`}
          title="admin only"
        >
          + add {type}
        </button>
      ) : (
        <div className="sticky-pad sticky-coral p-5" style={{ "--tilt": "-0.5deg" }} data-testid={`admin-quick-add-form-${type}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-pixel uppercase tracking-widest text-sm text-[var(--ink-color)]">
              ✎ quick add — {type}
            </span>
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="font-pixel uppercase tracking-widest text-sm hover:underline"
              data-testid={`admin-quick-add-close-${type}`}
            >
              [×]
            </button>
          </div>

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="pico-input font-hand"
              placeholder="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid={`quick-${type}-title`}
            />
            <input
              className="pico-input font-hand"
              placeholder={`date — defaults to ${todayStr()}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid={`quick-${type}-date`}
            />
            <input
              className="pico-input font-hand md:col-span-2"
              placeholder="tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              data-testid={`quick-${type}-tags`}
            />

            {type === "drawing" && (
              <>
                <input
                  className="pico-input font-hand md:col-span-2"
                  placeholder="image url or upload below"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  data-testid={`quick-${type}-image`}
                />
                <textarea
                  className="pico-input font-hand md:col-span-2 min-h-[60px]"
                  placeholder="description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid={`quick-${type}-desc`}
                />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <FileUpload label="upload image" accept="image/*" onPath={setImagePath} testId={`quick-${type}-upload`} />
                </div>
              </>
            )}

            {type === "writing" && (
              <textarea
                className="pico-input font-hand md:col-span-2 min-h-[140px]"
                placeholder="write your thoughts here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                data-testid={`quick-${type}-content`}
              />
            )}

            {type === "video" && (
              <>
                <input
                  className="pico-input font-hand md:col-span-2"
                  placeholder="external embed url (YouTube/Vimeo) — leave empty if uploading"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  data-testid={`quick-${type}-url`}
                />
                <input
                  className="pico-input font-hand"
                  placeholder="uploaded video path (auto-filled)"
                  value={videoPath}
                  onChange={(e) => setVideoPath(e.target.value)}
                  data-testid={`quick-${type}-path`}
                />
                <input
                  className="pico-input font-hand"
                  placeholder="thumbnail url or path"
                  value={thumbPath}
                  onChange={(e) => setThumbPath(e.target.value)}
                  data-testid={`quick-${type}-thumb`}
                />
                <textarea
                  className="pico-input font-hand md:col-span-2 min-h-[60px]"
                  placeholder="description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid={`quick-${type}-desc`}
                />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <FileUpload label="upload video" accept="video/*" onPath={setVideoPath} testId={`quick-${type}-upload`} />
                  <FileUpload label="upload thumb" accept="image/*" onPath={setThumbPath} testId={`quick-${type}-thumb-upload`} />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex items-center gap-2 mt-2">
              <button
                type="submit"
                className="pico-btn"
                disabled={busy}
                data-testid={`quick-${type}-submit`}
              >
                {busy ? "saving..." : `save ${type}`}
              </button>
              <span className="font-pixel uppercase tracking-widest text-xs text-[var(--ink-soft)]">
                admin only ✦ visible to everyone after save
              </span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminQuickAdd;

```

---

## `/frontend/src/components/EditContentDialog.jsx`

```jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { resolveMediaUrl } from "./ProtectedImage";
import UploadField from "./UploadField";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/*
 * Reusable edit modal for admin-only in-place editing of a drawing / writing /
 * video / message. Fields shown per `type`:
 *   drawing: title, date, image_path (URL or upload), tags, description
 *   writing: title, date, content, tags
 *   video:   title, date, external_url, video_path (URL or upload),
 *            thumbnail_path (URL or upload), tags, description
 *   message: name, email, message, approved
 */
const EditContentDialog = ({ type, item, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      title: item.title || "",
      date: item.date || "",
      image_path: item.image_path || "",
      video_path: item.video_path || "",
      external_url: item.external_url || "",
      thumbnail_path: item.thumbnail_path || "",
      content: item.content || "",
      description: item.description || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      name: item.name || "",
      email: item.email || "",
      message: item.message || "",
      approved: item.approved,
    });
  }, [item]);

  if (!item) return null;

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const token = localStorage.getItem("delined-admin-token") || localStorage.getItem("admin-token");
    if (!token) { toast("not signed in"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    const tagsArr = (form.tags || "")
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    let payload = {};
    if (type === "drawing") {
      payload = {
        title: form.title, date: form.date,
        image_path: form.image_path, description: form.description,
        tags: tagsArr,
      };
    } else if (type === "writing") {
      payload = {
        title: form.title, date: form.date,
        content: form.content, tags: tagsArr,
      };
    } else if (type === "video") {
      payload = {
        title: form.title, date: form.date,
        external_url: form.external_url || null,
        video_path: form.video_path || null,
        thumbnail_path: form.thumbnail_path || null,
        description: form.description, tags: tagsArr,
      };
    } else if (type === "message") {
      payload = {
        name: form.name, email: form.email, message: form.message,
        approved: form.approved,
      };
    }

    setSaving(true);
    try {
      const url = `${API}/${type === "drawing" ? "drawings" : type === "writing" ? "writings" : type === "video" ? "videos" : "messages"}/${item.id}`;
      const { data } = await axios.put(url, payload, { headers });
      toast(`${type} updated`);
      onSaved && onSaved(data);
      onClose && onClose();
    } catch (e) {
      toast(e?.response?.data?.detail || "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="lightbox-bg"
      data-testid={`edit-${type}-dialog`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div className="pico-window w-full max-w-2xl">
        <div className="pico-titlebar">
          <span>edit {type}</span>
          <button className="font-pixel" onClick={onClose} data-testid={`edit-${type}-close`}>[X]</button>
        </div>
        <div className="p-4 bg-[var(--bg-color)] max-h-[70vh] overflow-y-auto space-y-3">
          {(type === "drawing" || type === "writing" || type === "video") && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">title</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-title`}
                  value={form.title || ""}
                  onChange={(e) => setField("title", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">date</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-date`}
                  placeholder="MM/DD/YYYY"
                  value={form.date || ""}
                  onChange={(e) => setField("date", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">tags (comma separated, without #)</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-tags`}
                  placeholder="sketch, portrait, ink"
                  value={form.tags || ""}
                  onChange={(e) => setField("tags", e.target.value)} />
              </label>
            </>
          )}

          {type === "drawing" && (
            <>
              <div className="flex gap-3 items-start">
                <div className="w-28 h-28 bg-[var(--bg-deep)] flex items-center justify-center overflow-hidden border">
                  {form.image_path ? (
                    <img src={resolveMediaUrl(form.image_path)} alt="" className="max-w-full max-h-full object-contain" />
                  ) : <span className="font-pixel text-xs text-[var(--ink-soft)]">no image</span>}
                </div>
                <div className="flex-1">
                  <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">image URL / storage path</span>
                  <input className="pico-input font-hand w-full" data-testid={`edit-${type}-image`}
                    value={form.image_path || ""}
                    onChange={(e) => setField("image_path", e.target.value)} />
                  <div className="mt-2">
                    <UploadField label="upload new image" accept="image/*" testId={`edit-${type}-image-upload`}
                      onUploaded={(p) => setField("image_path", p)} />
                  </div>
                </div>
              </div>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">description</span>
                <textarea className="pico-textarea font-hand w-full" rows={2} data-testid={`edit-${type}-description`}
                  value={form.description || ""}
                  onChange={(e) => setField("description", e.target.value)} />
              </label>
            </>
          )}

          {type === "writing" && (
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content</span>
              <textarea className="pico-textarea font-hand w-full" rows={10} data-testid={`edit-${type}-content`}
                value={form.content || ""}
                onChange={(e) => setField("content", e.target.value)} />
            </label>
          )}

          {type === "video" && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">
                  external url (youtube/vimeo/tiktok embed) — leave empty if uploading a file
                </span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-externalurl`}
                  value={form.external_url || ""}
                  onChange={(e) => setField("external_url", e.target.value)} />
              </label>
              <div className="flex gap-3 items-start">
                <div className="w-28 h-20 bg-[var(--bg-deep)] flex items-center justify-center overflow-hidden border">
                  {form.thumbnail_path ? (
                    <img src={resolveMediaUrl(form.thumbnail_path)} alt="" className="max-w-full max-h-full object-contain" />
                  ) : <span className="font-pixel text-[10px] text-[var(--ink-soft)]">no thumb</span>}
                </div>
                <div className="flex-1">
                  <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">thumbnail url / storage path</span>
                  <input className="pico-input font-hand w-full" data-testid={`edit-${type}-thumb`}
                    value={form.thumbnail_path || ""}
                    onChange={(e) => setField("thumbnail_path", e.target.value)} />
                  <div className="mt-2">
                    <UploadField label="upload new thumb" accept="image/*" testId={`edit-${type}-thumb-upload`}
                      onUploaded={(p) => setField("thumbnail_path", p)} />
                  </div>
                </div>
              </div>
              <div>
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">video file (upload new to swap)</span>
                <div className="flex gap-2 items-center mt-1">
                  <input className="pico-input font-hand flex-1" data-testid={`edit-${type}-videopath`}
                    value={form.video_path || ""}
                    onChange={(e) => setField("video_path", e.target.value)} />
                  <UploadField label="upload video" accept="video/*" testId={`edit-${type}-video-upload`}
                    onUploaded={(p) => setField("video_path", p)} />
                </div>
              </div>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">description</span>
                <textarea className="pico-textarea font-hand w-full" rows={2} data-testid={`edit-${type}-description`}
                  value={form.description || ""}
                  onChange={(e) => setField("description", e.target.value)} />
              </label>
            </>
          )}

          {type === "message" && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">from name</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-name`}
                  value={form.name || ""}
                  onChange={(e) => setField("name", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">email</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-email`}
                  value={form.email || ""}
                  onChange={(e) => setField("email", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">message</span>
                <textarea className="pico-textarea font-hand w-full" rows={5} data-testid={`edit-${type}-message`}
                  value={form.message || ""}
                  onChange={(e) => setField("message", e.target.value)} />
              </label>
              <label className="flex items-center gap-2 font-hand">
                <input type="checkbox" checked={!!form.approved}
                  onChange={(e) => setField("approved", e.target.checked)}
                  data-testid={`edit-${type}-approved`} />
                approved (publicly visible on the message board)
              </label>
            </>
          )}
        </div>

        <div className="border-t-2 border-[var(--ink-color)] bg-[var(--bg-deep)] p-2 flex justify-end gap-2">
          <button className="pico-btn" onClick={onClose} data-testid={`edit-${type}-cancel`}>cancel</button>
          <button className="pico-btn" onClick={save} disabled={saving} data-testid={`edit-${type}-save`}>
            {saving ? "saving..." : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditContentDialog;

```

---

## `/frontend/src/components/notebook/NotebookShell.jsx`

```jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FALLBACK_BOOKMARK =
  "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/twxxbarm_Untitled_Artwork.PNG";

export const RibbonBookmark = () => {
  const location = useLocation();
  const [logo, setLogo] = useState(FALLBACK_BOOKMARK);

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/settings/images`).then((r) => {
      if (alive && r.data?.about_bookmark_path) setLogo(r.data.about_bookmark_path);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (location.pathname === "/" || location.pathname === "/disclaimer" || location.pathname === "/home") return null;
  return (
    <Link to="/about" className="ribbon" data-testid="ribbon-bookmark-link" aria-label="About">
      <span className="ribbon-label">about</span>
      <img
        src={resolveMediaUrl(logo)}
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="ribbon-mascot"
        data-testid="ribbon-mascot-img"
      />
    </Link>
  );
};

export const NotebookFrame = ({ children, leftPage, rightPage, single = false }) => {
  // Sub-pages render inside a full-screen CRT monitor with the notebook on the screen.
  return (
    <div className="crt-stage" data-testid="page-crt-stage">
      <div className="crt-monitor">
        <div className="crt-monitor-statusbar">
          <span><span className="led" /> delined</span>
          <PageOperatorBadge />
        </div>
        <div className="crt-monitor-glass">
          <div className="w-full h-full overflow-auto notebook-scroll">
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div
                className={`grid ${single ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} bg-[var(--bg-color)] relative`}
                style={{ minHeight: "78vh", boxShadow: "0 30px 60px -20px var(--shadow), 0 0 0 1px rgba(0,0,0,0.06)" }}
              >
                {single ? (
                  <div className="paper paper-margin relative overflow-hidden">
                    <div className="relative z-10 p-8 md:p-12 min-h-[78vh]">{children}</div>
                  </div>
                ) : (
                  <>
                    <div className="paper paper-margin relative overflow-hidden">
                      <div className="relative z-10 p-6 md:p-10 min-h-[78vh]">{leftPage}</div>
                    </div>
                    <div className="paper relative overflow-hidden">
                      <div className="relative z-10 p-6 md:p-10 min-h-[78vh]">{rightPage}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small admin/visitor indicator shown in the CRT monitor statusbar
const PageOperatorBadge = () => {
  const { admin } = useAuth();
  return admin ? (
    <span data-testid="page-operator-badge" style={{ color: "#9aff9a" }}>
      ◆ operator online
    </span>
  ) : (
    <span style={{ color: "rgba(247, 214, 120, 0.75)" }}>◇ drifter mode</span>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  if (location.pathname === "/" || location.pathname === "/disclaimer" || location.pathname === "/home") return null;

  const items = [
    { to: "/home", label: "home" },
    { to: "/drawings", label: "doodles" },
    { to: "/writings", label: "writings" },
    { to: "/videos", label: "videos" },
    { to: "/contact", label: "contact" },
  ];

  return (
    <div className="w-full px-4 pt-6">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
        {items.map((it, idx) => (
          <Link
            key={it.to}
            to={it.to}
            data-testid={`nav-${it.label}-link`}
            className={`pico-btn ${idx % 2 === 0 ? "tilt-l" : "tilt-r"}`}
          >
            {it.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {admin ? (
            <>
              <Link to="/admin" className="pico-btn tilt-r" data-testid="nav-admin-link">admin</Link>
              <button onClick={() => { logout(); navigate("/home"); }} className="pico-btn" data-testid="nav-logout-btn">
                logout
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="pico-btn tilt-l" data-testid="nav-admin-login-link">admin</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export const PageCorner = ({ onClick, label = "next" }) => (
  <div
    className="page-corner"
    onClick={onClick}
    role="button"
    data-testid="page-corner-btn"
    title={label}
    aria-label={label}
  />
);

export const StickyNote = ({ children, color = "default", tilt = "tilt-l", onClick, dataTestId, withTape = true }) => (
  <div
    className={`sticky ${color === "alt" ? "sticky-alt" : ""} ${tilt} cursor-pointer select-none`}
    onClick={onClick}
    data-testid={dataTestId}
  >
    {withTape && <span className="tape" />}
    {children}
  </div>
);

export const PicoWindow = ({ title, children, footer }) => (
  <div className="pico-window">
    <div className="pico-titlebar">
      <span>{title}</span>
      <span>♥</span>
    </div>
    <div className="p-4">{children}</div>
    {footer && <div className="border-t-2 border-[var(--ink-color)] p-2 bg-[var(--bg-deep)]">{footer}</div>}
  </div>
);

```

---

## `/frontend/src/pages/PasswordGate.jsx`

```jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LightSwitch from "../components/LightSwitch";
import * as sfx from "../lib/sfx";

const BOOT_LINES = [
  "delined os v1.0  ..............  ok",
  "© memory check  ................  ok",
  "© rom integrity  ...............  ok",
  "© palette load  ................  ok",
  "© cartridge: notebook//draft.7  .  found",
  "© night shaders  ...............  ok",
  "© initializing interface  ......  ready",
];

const PasswordGate = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootIndex, setBootIndex] = useState(0); // how many boot lines have appeared
  const { verifySitePassword } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Boot sequence
  useEffect(() => {
    sfx.unlockAudio();
    sfx.boot();
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setBootIndex(i);
      if (i < BOOT_LINES.length) sfx.blip();
      if (i >= BOOT_LINES.length) {
        clearInterval(id);
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    }, 240);
    return () => clearInterval(id);
  }, []);

  const bootDone = bootIndex >= BOOT_LINES.length;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifySitePassword(password);
      sfx.select();
      setSuccess(true);
      setTimeout(() => navigate("/disclaimer"), 700);
    } catch {
      setError("access denied — key invalid");
      sfx.click();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`password-gate ${theme} min-h-screen w-full relative overflow-hidden`}
      style={{ background: "#04030a" }}
    >
      {/* CRT scanlines + vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      {/* Subtle static noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
      />

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-6">
        <div
          className="w-full max-w-2xl rounded-md p-6 md:p-10"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            border: "1px solid var(--line-color)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.6), 0 0 22px var(--shadow), 0 0 60px var(--shadow)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between font-pixel uppercase tracking-widest mb-6"
            style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}
          >
            <span style={{ color: "var(--line-color)" }}>
              ▣ delined os
            </span>
            <span>boot sequence</span>
          </div>

          {/* Boot log */}
          <div
            className="font-pixel text-sm md:text-base leading-relaxed"
            style={{
              color: "var(--ink-color)",
              minHeight: 200,
              textShadow: "var(--neon-text)",
            }}
          >
            {BOOT_LINES.slice(0, bootIndex).map((line, idx) => (
              <div key={idx} style={{ opacity: 0.9 }}>
                <span style={{ color: "var(--line-color)" }}>›</span> {line}
              </div>
            ))}
            {!bootDone && (
              <div style={{ color: "var(--line-color)" }}>
                <span style={{ color: "var(--line-color)" }}>›</span> ...
                <span className="crt-blink">▮</span>
              </div>
            )}
            {bootDone && !success && (
              <>
                <div style={{ marginTop: 14, color: "var(--line-color)" }}>
                  ────────────────────────────────────────
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ color: "var(--line-color)" }}>››</span>{" "}
                  insert key to continue<span className="crt-blink">_</span>
                </div>
              </>
            )}
            {success && (
              <div style={{ marginTop: 18, color: "#9aff9a", textShadow: "0 0 6px #9aff9a" }}>
                ›› access granted — loading…
              </div>
            )}
          </div>

          {/* Password input */}
          {bootDone && !success && (
            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="boot-form">
              <input
                ref={inputRef}
                type="password"
                className="pico-input font-pixel text-lg"
                placeholder="● ● ● ●"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="site-password-input"
                style={{ letterSpacing: "0.3em" }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="pico-btn"
                  data-testid="site-password-submit-btn"
                >
                  {loading ? "▮▮▮" : "press start ▸"}
                </button>
                <span
                  className="font-pixel uppercase tracking-widest text-xs"
                  style={{ color: "var(--ink-soft)" }}
                >
                  enter as drifter
                </span>
                {error && (
                  <span
                    className="font-pixel uppercase tracking-widest text-xs"
                    style={{ color: "#ff7a7a", textShadow: "0 0 6px #ff7a7a" }}
                    data-testid="site-password-error"
                  >
                    ✕ {error}
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Footer hint */}
          <div
            className="mt-8 flex items-center justify-between font-pixel uppercase tracking-widest"
            style={{ color: "var(--ink-soft)", fontSize: "0.75rem" }}
          >
            <span>hold ◐ to recolor the boot</span>
            <span>v1.0 ░░ © delined</span>
          </div>
        </div>
      </div>

      <LightSwitch />
    </div>
  );
};

export default PasswordGate;

```

---

## `/frontend/src/pages/Disclaimer.jsx`

```jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resolveMediaUrl } from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FALLBACK_BTN =
  "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/43b6fv8r_Untitled%20design%20%281%29.png";

const DEFAULT_TEXT = {
  heading: "Disclaimer",
  body_paragraphs: [
    "That this site is simply meant to be a personal creative art/writing/media sandbox and overall gallery for its owner.",
    "Consider it another random personal blog on this World Wide Web — with its true meanings and worth being defined only by the one who owns it and likewise decided to share it.",
    "As such — the content within can and WILL change based on the owner's collective whims and focus regarding their interests. Life changes — so does a persons attention and focus on occasion. Whatever you see here isn't meant to be restricted by your own views and interpretations. Or anyone else's.",
    "So while the owner cannot physically stop you from viewing this blog, nor can they force how you think or tell you what to do after you browse the contents within — try to remember that this blog may hold things not suitable for you…or an audience that is younger or more sensitive.",
  ],
  aka_line: "a.k.a…",
  warning_lines: [
    "Warning: This blog is 18+. Viewer Discretion is Advised",
    "This blog, isn't a babysitter.",
  ],
  ps_note: "P.S. — If and when you see any spelling or grammar errors, pretend this is an actual notebook. And remember human error is a thing that applies here. Along with sleep deprivation. Thanks.",
};

const Disclaimer = () => {
  const navigate = useNavigate();
  const { acceptDisclaimer } = useAuth();
  const [btnImg, setBtnImg] = useState(FALLBACK_BTN);
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axios.get(`${API}/settings/images`).catch(() => null),
      axios.get(`${API}/settings/texts`).catch(() => null),
    ]).then(([imgRes, txtRes]) => {
      if (!alive) return;
      if (imgRes?.data?.disclaimer_button_path) setBtnImg(imgRes.data.disclaimer_button_path);
      if (txtRes?.data?.disclaimer) setText({ ...DEFAULT_TEXT, ...txtRes.data.disclaimer });
    });
    return () => { alive = false; };
  }, []);

  const handleEnter = () => {
    acceptDisclaimer();
    navigate("/home");
  };

  return (
    <div className="min-h-screen w-full py-12 px-4 relative" style={{ background: "var(--bg-deep)" }}>
      <div className="mx-auto max-w-3xl bg-[var(--bg-color)] paper paper-margin relative overflow-hidden shadow-2xl">
        <div className="relative z-10 p-8 md:p-14">
          <h1 className="font-marker text-6xl md:text-7xl text-[var(--ink-color)] leading-none mb-8 italic">
            {text.heading}
          </h1>

          <div className="space-y-4 font-hand text-lg md:text-xl text-[var(--ink-color)] leading-relaxed">
            {(text.body_paragraphs || []).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
            {text.aka_line ? (
              <p className="italic">{text.aka_line}</p>
            ) : null}
            {(text.warning_lines || []).map((w, i) => (
              <p key={`w-${i}`} className="font-bold text-center">{w}</p>
            ))}
            {text.ps_note ? (
              <p className="italic text-[var(--ink-soft)] text-base md:text-lg mt-6 whitespace-pre-line">
                {text.ps_note}
              </p>
            ) : null}
          </div>

          <div className="mt-16 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleEnter}
              data-testid="disclaimer-accept-btn"
              aria-label="I Understand — enter the menu"
              className="block hover:scale-[1.03] active:scale-95 transition-transform duration-150"
            >
              <img
                src={resolveMediaUrl(btnImg)}
                alt="I Understand — enter the menu"
                style={{ height: "auto", width: "auto", maxWidth: "min(420px, 90%)", display: "block" }}
                className="select-none mx-auto"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                data-testid="disclaimer-souvenir-img"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;

```

---

## `/frontend/src/pages/Hub.jsx`

```jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignOutButton from "../components/SignOutButton";
import { resolveMediaUrl } from "../components/ProtectedImage";
import * as sfx from "../lib/sfx";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MENU = [
  { to: "/drawings", label: "Drawings", sub: "doodles & multimedia" },
  { to: "/writings", label: "Writings", sub: "musings & notices" },
  { to: "/videos",   label: "Videos",   sub: "shorts & timelapses" },
  { to: "/contact",  label: "Multiplayer",  sub: "leave a transmission" },
];

const SHELL_COLORS = [
  { id: "mauve",     name: "mauve" },
  { id: "magenta",   name: "magenta" },
  { id: "cyan",      name: "cyan" },
  { id: "turquoise", name: "turquoise" },
  { id: "navy",      name: "navy" },
  { id: "olive",     name: "olive" },
];

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const Hub = () => {
  const navigate = useNavigate();
  const clock = useClock();
  const { admin } = useAuth();
  const [cursor, setCursor] = useState(0);
  const [booting, setBooting] = useState(true);
  const [shell, setShell] = useState(() => localStorage.getItem("device-shell") || "mauve");
  const [muted, setMutedState] = useState(() => localStorage.getItem("device-muted") === "1");
  const [bgImage, setBgImage] = useState("");
  const [hubQuery, setHubQuery] = useState("");

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/settings/images`).then((r) => {
      if (alive && r.data?.hub_background_path) setBgImage(r.data.hub_background_path);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => { localStorage.setItem("device-shell", shell); }, [shell]);
  useEffect(() => {
    sfx.setMuted(muted);
    localStorage.setItem("device-muted", muted ? "1" : "0");
  }, [muted]);

  useEffect(() => {
    const t1 = setTimeout(() => { sfx.unlockAudio(); sfx.boot(); }, 320);
    const t2 = setTimeout(() => setBooting(false), 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onFirst = () => { sfx.unlockAudio(); };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  const moveCursor = (delta) => {
    setCursor((c) => {
      sfx.blip();
      return (c + delta + MENU.length) % MENU.length;
    });
  };
  const dpadUp    = () => moveCursor(-2);
  const dpadDown  = () => moveCursor(2);
  const dpadLeft  = () => moveCursor(-1);
  const dpadRight = () => moveCursor(1);
  const enter = () => { sfx.select(); navigate(MENU[cursor].to); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown")  { e.preventDefault(); dpadDown(); }
      else if (e.key === "ArrowUp")    { e.preventDefault(); dpadUp(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); dpadRight(); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); dpadLeft(); }
      else if (e.key === "Enter")      { e.preventDefault(); enter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [cursor]);

  return (
    <div
      className="retro-stage"
      data-testid="hub-device-stage"
      style={bgImage ? { backgroundImage: `url(${resolveMediaUrl(bgImage)})` } : undefined}
    >
      <div className="device" data-shell={shell} data-testid="device-shell" role="region" aria-label="delined handheld console" style={{ position: "relative", zIndex: 2 }}>
        {/* Header strip */}
        <div className="device-header">
          <span><span className="power-led" />power on</span>
          <button
            type="button"
            onClick={() => setMutedState((m) => !m)}
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: "0.85rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: 999,
              background: "transparent",
              color: "inherit",
              border: "1px solid currentColor",
              cursor: "pointer",
            }}
            data-testid="device-sound-toggle"
            aria-label="toggle sound"
            title={muted ? "sound off" : "sound on"}
          >
            ♪ {muted ? "off" : "on"}
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>delined — v1.0</span>
            <SignOutButton variant="device" />
          </span>
        </div>

        {/* Screen */}
        <div className="screen-bezel">
          <div className="crt-screen" data-testid="crt-screen">
            <div className="crt-noise" />

            <div className="crt-statusbar">
              <span>
                {admin ? (
                  <span data-testid="operator-badge" style={{ color: "#9aff9a" }}>◉ operator</span>
                ) : (
                  <span>◉ drifter</span>
                )}
              </span>
              <span>{clock}</span>
            </div>

            <div className="crt-title">
              ▒ delined<span className="crt-blink">_</span>
            </div>

            {booting ? (
              <div style={{ position: "relative", zIndex: 4, textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "1.1rem", letterSpacing: "0.18em" }}>booting…</div>
                <div style={{ marginTop: 14, color: "var(--crt-fg-dim)" }}>
                  loading channels ░░░░░░░░░░
                </div>
              </div>
            ) : (
              <>
                <div className="crt-grid">
                  {MENU.map((m, i) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      data-testid={`hub-nav-${m.label.toLowerCase()}-link`}
                      className="crt-card"
                      onMouseEnter={() => { if (cursor !== i) sfx.blip(); setCursor(i); }}
                      onFocus={() => setCursor(i)}
                      onClick={() => sfx.select()}
                      style={cursor === i ? {
                        background: "rgba(247, 214, 120, 0.14)",
                        boxShadow: "0 0 0 1px var(--crt-fg) inset, 0 0 16px var(--crt-glow)",
                    } : undefined}
                  >
                    <div className="label">
                      {cursor === i ? "▸ " : "  "}{m.label}
                    </div>
                    <div className="sub">{m.sub}</div>
                    <span className="arrow">▶</span>
                  </Link>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = (hubQuery || "").trim();
                    if (!q) return;
                    sfx.select();
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                  }}
                  style={{ position: "relative", zIndex: 4, marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span style={{ fontFamily: "'VT323', monospace", color: "var(--crt-fg-dim)" }}>search ▸</span>
                  <input
                    value={hubQuery}
                    onChange={(e) => setHubQuery(e.target.value)}
                    placeholder="title · #tag · text"
                    data-testid="hub-search-input"
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.35)",
                      color: "var(--crt-fg)",
                      border: "1px solid var(--crt-fg-dim)",
                      padding: "5px 10px",
                      fontFamily: "'VT323', monospace",
                      fontSize: "1rem",
                      outline: "none",
                      borderRadius: 4,
                    }}
                  />
                  <button
                    type="submit"
                    data-testid="hub-search-submit"
                    style={{
                      background: "transparent",
                      color: "var(--crt-fg)",
                      border: "1px solid var(--crt-fg)",
                      padding: "4px 12px",
                      fontFamily: "'VT323', monospace",
                      cursor: "pointer",
                      borderRadius: 4,
                    }}
                  >
                    go
                  </button>
                </form>
              </>
            )}

            <div className="crt-footer">
              <span>↕ select</span>
              <span>↵ enter</span>
            </div>
          </div>
        </div>

        {/* Controls row — D-pad / Start-Select / A-B */}
        <div className="controls">
          <div className="dpad" aria-label="d-pad">
            <button type="button" className="up"    onClick={dpadUp}    data-testid="dpad-up"    aria-label="up">▲</button>
            <button type="button" className="down"  onClick={dpadDown}  data-testid="dpad-down"  aria-label="down">▼</button>
            <button type="button" className="left"  onClick={dpadLeft}  data-testid="dpad-left"  aria-label="left">◀</button>
            <button type="button" className="right" onClick={dpadRight} data-testid="dpad-right" aria-label="right">▶</button>
            <span className="center" aria-hidden="true" />
          </div>

          <div className="start-select">
            <Link to="/about" className="pill-btn" data-testid="device-select-btn" onClick={() => sfx.click()}>select • origin</Link>
            <button type="button" className="pill-btn" data-testid="device-start-btn" onClick={enter}>
              start ▸
            </button>
          </div>

          <div className="ab-buttons" aria-hidden="false">
            <Link to="/contact"     className="ab-button" data-testid="device-a-btn" title="multiplayer"    onClick={() => sfx.click()}>A</Link>
            <Link to="/admin/login" className="ab-button" data-testid="device-b-btn" title="operator"    onClick={() => sfx.click()}>B</Link>
          </div>
        </div>

        {/* Color picker — its own row below controls */}
        <div className="color-strips-row">
          <span className="label">shell color</span>
          <div className="color-strips" role="radiogroup" aria-label="device color">
            {SHELL_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-pressed={shell === c.id}
                aria-label={c.name}
                title={c.name}
                className={`color-strip color-strip-${c.id}`}
                data-testid={`device-color-${c.id}`}
                onClick={() => { setShell(c.id); sfx.click(); }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hub;

```

---

## `/frontend/src/pages/About.jsx`

```jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { NotebookFrame } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FALLBACK_ARTIST_IMG =
  "https://images.pexels.com/photos/29861519/pexels-photo-29861519.jpeg?auto=compress&cs=tinysrgb&w=900";

const SOCIALS = ["instagram", "twitter", "tiktok", "youtube", "tumblr"];

const DEFAULT_TEXT = {
  section_label: "whoami",
  heading: "a strange diary keeper",
  bio_paragraphs: [
    "hi. i draw, write, and film small things. this site is a collected mess of those things — a sandbox more than a gallery.",
    "most entries are made in margins, on receipts, between classes, after sleep. i'd rather show the doodle than the polished version.",
    "if you'd like to leave a note, the contact page has a message board. messages are read before being shown.",
  ],
  signature: "— The author",
  socials_label: "other notebooks",
  content_warning_label: "content warning",
  content_warning_text:
    "Asking questions while someone is drawing may be distracting. Especially if the questions are consistent, repetitive, and are more critical than inquisitive.",
};

const About = () => {
  const [artistImg, setArtistImg] = useState(FALLBACK_ARTIST_IMG);
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axios.get(`${API}/settings/about`).catch(() => null),
      axios.get(`${API}/settings/texts`).catch(() => null),
    ]).then(([imgRes, txtRes]) => {
      if (!alive) return;
      if (imgRes?.data?.artist_image_path) setArtistImg(imgRes.data.artist_image_path);
      if (txtRes?.data?.about) setText({ ...DEFAULT_TEXT, ...txtRes.data.about });
    });
    return () => { alive = false; };
  }, []);

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">about</h2>
      <div className="relative bg-[var(--bg-color)] p-3 inline-block tilt-l shadow-lg" style={{ boxShadow: "3px 6px 14px var(--shadow)" }}>
        <span className="tape tape-tl" />
        <span className="tape tape-tr" />
        <ProtectedImage
          src={artistImg}
          alt="artist"
          className="w-72 h-80 object-cover"
        />
      </div>

      <div className="mt-6 sticky tilt-r2 inline-block p-3">
        <span className="tape" />
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {text.content_warning_label}
        </div>
        <p className="font-hand text-[var(--ink-color)] text-base mt-1 max-w-sm whitespace-pre-line">
          {text.content_warning_text}
        </p>
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
        {text.section_label}
      </div>
      <h3 className="font-marker text-4xl text-[var(--ink-color)] mb-4">{text.heading}</h3>

      <div className="font-hand text-lg text-[var(--ink-color)] leading-relaxed space-y-3">
        {(text.bio_paragraphs || []).map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
        {text.signature ? (
          <p className="italic text-[var(--ink-soft)]">{text.signature}</p>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)] mb-2">
          {text.socials_label}
        </div>
        <div className="flex flex-wrap gap-3">
          {SOCIALS.map((label, idx) => (
            <span
              key={label}
              data-testid={`social-${label}-link`}
              className={`pico-btn ${idx % 2 === 0 ? "tilt-l" : "tilt-r"} pointer-events-none relative`}
              title="error"
            >
              <span className="relative">
                <span className="graphite-eraser absolute -inset-1 rounded-sm" aria-hidden />
                <span className="relative opacity-60">error</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default About;

```

---

## `/frontend/src/pages/Contact.jsx`

```jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NotebookFrame, StickyNote } from "../components/notebook/NotebookShell";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_RANDOM_QUESTIONS = [
  "If you were a sticky note, what color would you be and what would you say?",
  "What's the weirdest dream you remember and never told anyone about?",
  "If your handwriting had a personality, how would you describe it?",
  "What's a song you'd play on loop while doodling at 3am?",
  "If this blog were a room, what one object would you leave in it?",
  "What's an opinion you hold that you secretly think no one else does?",
  "Describe yourself using only three random objects from your desk.",
  "What's the last small thing that made you genuinely smile?",
  "If you could leave one footnote in someone else's diary, what would it say?",
  "What's the smell of your favorite memory?",
  "If your week had a soundtrack title, what would it be?",
  "What's a secret hobby you'd start if no one was watching?",
];

const Contact = () => {
  const [messages, setMessages] = useState([]);
  const [questionPool, setQuestionPool] = useState(DEFAULT_RANDOM_QUESTIONS);
  const randomQuestion = useMemo(
    () => questionPool[Math.floor(Math.random() * questionPool.length)],
    [questionPool]
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "",
    found_via: "",
    sender_descriptor: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadMessages = () => axios.get(`${API}/messages`).then((r) => setMessages(r.data));

  useEffect(() => {
    loadMessages();
    axios.get(`${API}/settings/texts`).then((r) => {
      const pool = r.data?.contact?.random_questions;
      if (Array.isArray(pool) && pool.length > 0) setQuestionPool(pool);
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast("please fill name, email, and message.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/messages`, form);
      toast("note slipped under the door. it will appear once approved.");
      setForm({ name: "", email: "", website: "", found_via: "", sender_descriptor: "", message: "" });
    } catch (err) {
      toast("could not send. try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">message board</h2>
      <p className="font-hand text-[var(--ink-soft)] mb-5">
        notes that have been read and pinned. ✎
      </p>
      <div className="notebook-scroll overflow-y-auto pr-2 space-y-4" style={{ maxHeight: "65vh" }}>
        {messages.length === 0 && (
          <p className="font-hand text-[var(--ink-soft)]">no notes pinned yet.</p>
        )}
        {messages.map((m, idx) => (
          <StickyNote
            key={m.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 3 === 0 ? "alt" : "default"}
            withTape
            dataTestId={`message-${m.id}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-marker text-xl text-[var(--ink-color)]">{m.name}</span>
              <span className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">
                {new Date(m.created_at).toLocaleDateString()}
              </span>
            </div>
            {m.sender_descriptor && (
              <div className="font-hand italic text-[var(--ink-soft)] text-xs mb-1">
                a map to: {m.sender_descriptor}
              </div>
            )}
            <p className="font-hand text-[var(--ink-color)] text-base whitespace-pre-wrap">{m.message}</p>
          </StickyNote>
        ))}
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r mb-2">slip a note</h3>
      <p className="font-hand text-[var(--ink-soft)] mb-4 text-sm">
        all messages are read before being pinned.
      </p>
      <form onSubmit={submit} className="space-y-3" data-testid="contact-form">
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">name *</label>
          <input
            className="pico-input font-hand"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="contact-name-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">email *</label>
          <input
            type="email"
            className="pico-input font-hand"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="contact-email-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">website / socials</label>
          <input
            className="pico-input font-hand"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            data-testid="contact-website-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
            how did you come across this site?
          </label>
          <input
            className="pico-input font-hand"
            value={form.found_via}
            onChange={(e) => setForm({ ...form, found_via: e.target.value })}
            data-testid="contact-found-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
            a random question
          </label>
          <div
            className="font-hand italic text-[var(--ink-soft)] text-sm mb-1"
            data-testid="contact-random-question"
          >
            "{randomQuestion}"
          </div>
          <input
            className="pico-input font-hand"
            placeholder="…?"
            value={form.sender_descriptor}
            onChange={(e) => setForm({ ...form, sender_descriptor: e.target.value })}
            data-testid="contact-descriptor-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">message *</label>
          <textarea
            className="pico-input font-hand min-h-[120px]"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            data-testid="contact-message-input"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="pico-btn tilt-l" data-testid="contact-submit-btn">
            {submitting ? "..." : "Slip Onto The Desk"}
          </button>
        </div>
      </form>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default Contact;

```

---

## `/frontend/src/pages/Drawings.jsx`

```jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Drawings = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => axios.get(`${API}/drawings`).then((r) => {
    setItems(r.data);
    const preselectId = location.state?.selectId;
    const picked = preselectId ? r.data.find((x) => x.id === preselectId) : null;
    if (picked) setSelected(picked);
    else if (r.data.length && !selected) setSelected(r.data[0]);
    setLoading(false);
  });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    // Tags can be entered as #tag (space- or comma-separated) or as title/date substrings
    const tagTokens = q.split(/[\s,]+/).filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = tagTokens.length
        ? tagTokens.every((t) => (it.tags || []).map((x) => x.toLowerCase()).includes(t))
        : (it.tags || []).some((x) => x.toLowerCase().includes(q));
      return inTitle || inDate || inTags;
    });
  }, [items, query]);

  const next = () => {
    if (!selected || !filtered.length) return;
    const i = filtered.findIndex((x) => x.id === selected.id);
    setSelected(filtered[(i + 1) % filtered.length]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">doodles</h2>
      {selected ? (
        <div className="relative mt-2">
          <div className="relative bg-[var(--bg-color)] p-3 inline-block max-w-full tilt-l shadow-lg" style={{ boxShadow: "3px 6px 12px var(--shadow)" }}>
            <span className="tape tape-tl" />
            <span className="tape tape-tr" />
            <ProtectedImage
              src={selected.image_path}
              alt={selected.title}
              className="max-h-[55vh] w-auto object-contain block"
            />
          </div>
          <div className="mt-5 sticky tilt-r2 inline-block max-w-full p-3">
            <span className="tape" />
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{selected.date}</div>
            <div className="font-marker text-2xl text-[var(--ink-color)] leading-tight">"{selected.title}"</div>
            {selected.description && (
              <p className="font-hand text-[var(--ink-soft)] mt-1 text-sm">{selected.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(selected.tags || []).map((t) => (
                <span key={t} className="font-pixel text-xs uppercase tracking-widest text-[var(--ink-color)]">#{t}</span>
              ))}
              {admin && (
                <button
                  type="button"
                  className="pico-btn ml-auto"
                  onClick={() => setEditing(selected)}
                  data-testid={`inline-edit-drawing-${selected.id}`}
                >
                  ✎ edit
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="font-hand text-[var(--ink-soft)]">{loading ? "loading..." : "no drawings yet."}</p>
      )}
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="drawing" onAdded={load} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">index</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {filtered.length} entries
        </span>
      </div>
      <div className="mb-4">
        <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)] block mb-1">
          search · title · date · #tag
        </label>
        <input
          className="pico-input font-hand"
          placeholder="e.g. #sketch  or  02/14/2026  or  rabbit"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="drawings-search-input"
        />
      </div>

      <div className="notebook-scroll overflow-y-auto pr-2" style={{ maxHeight: "60vh" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map((it, idx) => (
            <StickyNote
              key={it.id}
              tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
              color={idx % 3 === 0 ? "alt" : "default"}
              onClick={() => setSelected(it)}
              dataTestId={`drawing-thumb-${it.id}`}
            >
              <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
              <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
              <div className="mt-2 aspect-[4/3] bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                <ProtectedImage src={it.image_path} alt={it.title} className="w-full h-full object-cover" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(it.tags || []).slice(0, 3).map((t) => (
                  <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
                    #{t}
                  </span>
                ))}
              </div>
            </StickyNote>
          ))}
        </div>
        {!filtered.length && (
          <p className="font-hand text-[var(--ink-soft)] mt-6">nothing here. try clearing the search.</p>
        )}
      </div>
      <PageCorner onClick={next} label="next entry" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {editing && (
        <EditContentDialog
          type="drawing"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setEditing(null); setSelected(updated); load(); }}
        />
      )}
    </>
  );
};

export default Drawings;

```

---

## `/frontend/src/pages/Writings.jsx`

```jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Writings = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const load = () => axios.get(`${API}/writings`).then((r) => {
    setItems(r.data);
    const preselectId = location.state?.selectId;
    const picked = preselectId ? r.data.find((x) => x.id === preselectId) : null;
    if (picked) setSelected(picked);
    else if (r.data.length && !selected) setSelected(r.data[0]);
  });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = (it.tags || []).some((t) => t.toLowerCase().includes(q.replace(/^#/, "")));
      const inContent = it.content?.toLowerCase().includes(q);
      return inTitle || inDate || inTags || inContent;
    });
  }, [items, query]);

  const next = () => {
    if (!selected || !filtered.length) return;
    const i = filtered.findIndex((x) => x.id === selected.id);
    setSelected(filtered[(i + 1) % filtered.length]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">writings</h2>
      {selected ? (
        <article className="mt-4">
          <div className="sticky tilt-l inline-block p-3 mb-5">
            <span className="tape tape-tl" />
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{selected.date}</div>
            <div className="font-marker text-3xl text-[var(--ink-color)] leading-tight">"{selected.title}"</div>
            {admin && (
              <button
                type="button"
                className="pico-btn mt-2"
                onClick={() => setEditing(selected)}
                data-testid={`inline-edit-writing-${selected.id}`}
              >
                ✎ edit
              </button>
            )}
          </div>
          <div className="font-hand text-lg md:text-xl text-[var(--ink-color)] leading-loose whitespace-pre-wrap">
            {selected.content}
          </div>
        </article>
      ) : (
        <p className="font-hand text-[var(--ink-soft)]">no writings yet.</p>
      )}
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="writing" onAdded={load} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">index</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{filtered.length}</span>
      </div>
      <input
        className="pico-input font-hand mb-4"
        placeholder="search title · date · #tag · text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="writings-search-input"
      />
      <div className="notebook-scroll overflow-y-auto pr-2 space-y-4" style={{ maxHeight: "60vh" }}>
        {filtered.map((it, idx) => (
          <StickyNote
            key={it.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 2 === 0 ? "default" : "alt"}
            onClick={() => setSelected(it)}
            dataTestId={`writing-thumb-${it.id}`}
          >
            <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
            <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
            <p className="font-hand text-[var(--ink-soft)] text-sm mt-1 line-clamp-2">{it.content?.slice(0, 120)}…</p>
          </StickyNote>
        ))}
        {!filtered.length && <p className="font-hand text-[var(--ink-soft)]">nothing here.</p>}
      </div>
      <PageCorner onClick={next} label="next entry" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {editing && (
        <EditContentDialog
          type="writing"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setEditing(null); setSelected(updated); load(); }}
        />
      )}
    </>
  );
};

export default Writings;

```

---

## `/frontend/src/pages/Videos.jsx`

```jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage, { resolveMediaUrl } from "../components/ProtectedImage";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VideoPlayer = ({ video, onClose, onNext, hasNext, onEdit, isAdmin }) => {
  const ref = useRef(null);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showCC, setShowCC] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.playbackRate = speed;
      el.loop = loop;
    }
  }, [speed, loop]);

  const isExternal = !!video.external_url;

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  return (
    <div className="lightbox-bg" data-testid="video-lightbox" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pico-window w-full max-w-3xl" onContextMenu={(e) => e.preventDefault()}>
        <div className="pico-titlebar">
          <span>{video.title}</span>
          <button className="font-pixel" onClick={onClose} data-testid="video-close-btn">[X]</button>
        </div>
        <div className="p-3 bg-[var(--bg-color)]">
          {isExternal ? (
            <div className="aspect-video">
              <iframe
                title={video.title}
                src={video.external_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <video
              ref={ref}
              src={resolveMediaUrl(video.video_path)}
              className="w-full h-auto max-h-[70vh] bg-black"
              autoPlay
              controls={false}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onContextMenu={(e) => e.preventDefault()}
              controlsList="nodownload noremoteplayback"
            >
              {video.captions_url && <track default kind="captions" src={video.captions_url} label="EN" />}
            </video>
          )}
        </div>
        <div className="border-t-2 border-[var(--ink-color)] bg-[var(--bg-deep)] p-2 flex flex-wrap gap-2 items-center">
          {!isExternal && (
            <>
              <button className="pico-btn" onClick={togglePlay} data-testid="video-playpause-btn">
                {playing ? "pause" : "play"}
              </button>
              <button className="pico-btn" onClick={() => setShowCC((v) => !v)} data-testid="video-cc-btn">
                cc {showCC ? "on" : "off"}
              </button>
              <button
                className="pico-btn"
                onClick={() => setSpeed((s) => (s >= 2 ? 0.5 : s + 0.25))}
                data-testid="video-speed-btn"
              >
                speed × {speed}
              </button>
              <button className="pico-btn" onClick={() => setLoop((v) => !v)} data-testid="video-loop-btn">
                loop {loop ? "on" : "off"}
              </button>
            </>
          )}
          <button
            className="pico-btn ml-auto"
            onClick={onNext}
            disabled={!hasNext}
            data-testid="video-next-btn"
          >
            skip ▶
          </button>
          {isAdmin && (
            <button
              className="pico-btn"
              onClick={onEdit}
              data-testid="video-edit-btn"
            >
              ✎ edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Videos = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    axios.get(`${API}/videos`).then((r) => {
      setItems(r.data);
      const preselectId = location.state?.selectId;
      if (preselectId) {
        const picked = r.data.find((x) => x.id === preselectId);
        if (picked) setOpen(picked);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => axios.get(`${API}/videos`).then((r) => setItems(r.data));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = (it.tags || []).some((t) => t.toLowerCase().includes(q.replace(/^#/, "")));
      return inTitle || inDate || inTags;
    });
  }, [items, query]);

  const openVideo = (v) => setOpen(v);
  const nextVideo = () => {
    if (!open) return;
    const i = filtered.findIndex((x) => x.id === open.id);
    if (i >= 0 && filtered[i + 1]) setOpen(filtered[i + 1]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">videos</h2>
      <p className="font-hand text-[var(--ink-soft)]">
        click a thumbnail to open the player. shorts, timelapses, scraps.
      </p>
      <div className="mt-8 sticky tilt-r p-4 inline-block">
        <span className="tape" />
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">note to self</div>
        <p className="font-hand text-[var(--ink-color)] text-lg mt-1">
          → press the bunny-eared corner to wander forward.
        </p>
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="video" onAdded={reload} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">reel</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{filtered.length}</span>
      </div>
      <input
        className="pico-input font-hand mb-4"
        placeholder="search title · date · #tag"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="videos-search-input"
      />
      <div className="notebook-scroll overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ maxHeight: "60vh" }}>
        {filtered.map((it, idx) => (
          <StickyNote
            key={it.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 3 === 0 ? "alt" : "default"}
            onClick={() => openVideo(it)}
            dataTestId={`video-thumb-${it.id}`}
          >
            <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
            <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
            <div className="mt-2 aspect-video bg-[var(--bg-color)] border-2 border-[var(--ink-color)] relative overflow-hidden">
              {it.thumbnail_path ? (
                <ProtectedImage src={it.thumbnail_path} alt={it.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--bg-deep)]" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="pico-btn">▶ play</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(it.tags || []).slice(0, 3).map((t) => (
                <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
              ))}
            </div>
          </StickyNote>
        ))}
        {!filtered.length && <p className="font-hand text-[var(--ink-soft)]">no videos yet.</p>}
      </div>
      <PageCorner onClick={() => filtered[0] && openVideo(filtered[0])} label="play first" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {open && (
        <VideoPlayer
          video={open}
          onClose={() => setOpen(null)}
          onNext={nextVideo}
          hasNext={filtered.findIndex((x) => x.id === open.id) < filtered.length - 1}
          onEdit={() => { setEditing(open); setOpen(null); }}
          isAdmin={!!admin}
        />
      )}
      {editing && (
        <EditContentDialog
          type="video"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
};

export default Videos;

```

---

## `/frontend/src/pages/SearchResults.jsx`

```jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { NotebookFrame, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const matches = (it, q, tagTokens, fields) => {
  const qLower = q.toLowerCase();
  if (tagTokens.length) {
    return tagTokens.every((t) => (it.tags || []).map((x) => x.toLowerCase()).includes(t));
  }
  return fields.some((f) => (it[f] || "").toString().toLowerCase().includes(qLower));
};

const SearchResults = () => {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [drawings, setDrawings] = useState([]);
  const [writings, setWritings] = useState([]);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/drawings`).then((r) => setDrawings(r.data)).catch(() => {});
    axios.get(`${API}/writings`).then((r) => setWritings(r.data)).catch(() => {});
    axios.get(`${API}/videos`).then((r) => setVideos(r.data)).catch(() => {});
  }, []);

  const parsed = useMemo(() => {
    const raw = q.trim();
    const tokens = raw.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const tagTokens = tokens.filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    return { raw, tagTokens };
  }, [q]);

  const matchedDrawings = useMemo(() => {
    if (!parsed.raw) return [];
    return drawings.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "description"]));
  }, [drawings, parsed]);

  const matchedWritings = useMemo(() => {
    if (!parsed.raw) return [];
    return writings.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "content"]));
  }, [writings, parsed]);

  const matchedVideos = useMemo(() => {
    if (!parsed.raw) return [];
    return videos.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "description"]));
  }, [videos, parsed]);

  const total = matchedDrawings.length + matchedWritings.length + matchedVideos.length;

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">search</h2>
      <form onSubmit={submit} className="flex gap-2 items-center mb-4">
        <input
          className="pico-input font-hand flex-1"
          placeholder="e.g. #sketch  or  rabbit  or  02/14/2026"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="search-input"
          autoFocus
        />
        <button type="submit" className="pico-btn" data-testid="search-submit">go</button>
      </form>
      <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
        {parsed.raw ? `${total} result${total === 1 ? "" : "s"} for "${parsed.raw}"` : "type a query to begin"}
      </div>
      <p className="font-hand text-[var(--ink-soft)] mt-4 text-sm max-w-md">
        Tips: use <code className="font-pixel">#tagname</code> for tag-only matches. Multiple tags work as AND
        (e.g. <code className="font-pixel">#sketch #rabbit</code>). Otherwise search matches titles, dates,
        writings' text, drawing/video descriptions.
      </p>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <div
        className="notebook-scroll overflow-y-auto pr-2 space-y-6"
        style={{ maxHeight: "70vh" }}
        data-testid="search-results"
      >
        {parsed.raw && total === 0 && (
          <p className="font-hand text-[var(--ink-soft)]">no results. try a different word or tag.</p>
        )}

        {matchedDrawings.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">drawings · {matchedDrawings.length}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchedDrawings.map((it, i) => (
                <Link key={it.id} to="/drawings" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 3 === 0 ? "alt" : "default"}
                    dataTestId={`search-drawing-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    {it.image_path && (
                      <div className="mt-2 aspect-[4/3] bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                        <ProtectedImage src={it.image_path} alt={it.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedWritings.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">writings · {matchedWritings.length}</h3>
            <div className="space-y-3">
              {matchedWritings.map((it, i) => (
                <Link key={it.id} to="/writings" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 2 === 0 ? "default" : "alt"}
                    dataTestId={`search-writing-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    <p className="font-hand text-sm text-[var(--ink-soft)] mt-1 line-clamp-2">
                      {(it.content || "").slice(0, 140)}…
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedVideos.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">videos · {matchedVideos.length}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchedVideos.map((it, i) => (
                <Link key={it.id} to="/videos" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 3 === 0 ? "alt" : "default"}
                    dataTestId={`search-video-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    {it.thumbnail_path && (
                      <div className="mt-2 aspect-video bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                        <ProtectedImage src={it.thumbnail_path} alt={it.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default SearchResults;

```

---

## `/frontend/src/pages/NotFound.jsx`

```jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as sfx from "../lib/sfx";

const NotFound = () => {
  const [shell] = useState(() => localStorage.getItem("device-shell") || "mauve");

  useEffect(() => {
    const t = setTimeout(() => { sfx.unlockAudio(); sfx.boot(); }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="retro-stage" data-testid="notfound-stage">
      {/* Side-of-device label */}
      <div
        aria-hidden="true"
        data-testid="notfound-side-label"
        style={{
          position: "absolute",
          left: "max(18px, 3vw)",
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          fontFamily: "'VT323', monospace",
          fontSize: "1.05rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
          whiteSpace: "nowrap",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      >
        ▸ come back later when its right again
      </div>

      <div className="device" data-shell={shell} data-testid="notfound-device-shell">
        <div className="device-header">
          <span><span className="power-led" />power on</span>
          <span>delined — v1.0</span>
        </div>

        <div className="screen-bezel">
          <div className="crt-screen" data-testid="notfound-crt-screen">
            <div className="crt-noise" />

            <div className="crt-statusbar">
              <span style={{ color: "#ff8a8a" }}>◉ error</span>
              <span>404</span>
            </div>

            <div className="crt-title" style={{ color: "#ff8a8a" }}>
              ▒ error<span className="crt-blink">_</span>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 4,
                textAlign: "center",
                padding: "48px 0 28px",
              }}
            >
              <div
                data-testid="notfound-screen-message"
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--crt-fg)",
                  textShadow: "0 0 14px var(--crt-glow)",
                  lineHeight: 1,
                }}
              >
                I am error
              </div>
              <div
                style={{
                  marginTop: 22,
                  color: "var(--crt-fg-dim)",
                  fontFamily: "'VT323', monospace",
                  fontSize: "1rem",
                  letterSpacing: "0.18em",
                }}
              >
                ░ broken link ░
              </div>
            </div>

            <div className="crt-footer">
              <span>↩ press A to return</span>
              <span>404</span>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="dpad" aria-hidden="true">
            <span className="up">▲</span>
            <span className="down">▼</span>
            <span className="left">◀</span>
            <span className="right">▶</span>
            <span className="center" aria-hidden="true" />
          </div>

          <div className="start-select">
            <Link
              to="/home"
              className="pill-btn"
              data-testid="notfound-home-link"
              onClick={() => sfx.click()}
            >
              select • return home
            </Link>
            <Link
              to="/home"
              className="pill-btn"
              data-testid="notfound-start-link"
              onClick={() => sfx.select()}
            >
              start ▸
            </Link>
          </div>

          <div className="ab-buttons" aria-hidden="false">
            <Link
              to="/home"
              className="ab-button"
              data-testid="notfound-a-link"
              title="return home"
              onClick={() => sfx.click()}
            >
              A
            </Link>
            <Link
              to="/home"
              className="ab-button"
              data-testid="notfound-b-link"
              title="return home"
              onClick={() => sfx.click()}
            >
              B
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

```

---

## `/frontend/src/pages/AdminLogin.jsx`

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotebookFrame } from "../components/notebook/NotebookShell";

const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "could not log in.");
    }
  };

  const page = (
    <div className="max-w-md mx-auto">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">admin login</h2>
      <p className="font-hand text-[var(--ink-soft)] mb-6">private — for the owner.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">email</label>
          <input
            className="pico-input font-hand"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="admin-login-email-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">password</label>
          <input
            type="password"
            className="pico-input font-hand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="admin-login-password-input"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="pico-btn" data-testid="admin-login-submit-btn">log in</button>
          {error && <span className="font-hand text-[var(--margin-color)]" data-testid="admin-login-error">{error}</span>}
        </div>
      </form>
    </div>
  );

  return <NotebookFrame single>{page}</NotebookFrame>;
};

export default AdminLogin;

```

---

## `/frontend/src/pages/AdminPanel.jsx`

```jsx
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotebookFrame } from "../components/notebook/NotebookShell";
import { resolveMediaUrl } from "../components/ProtectedImage";
import UploadField from "../components/UploadField";
import EditContentDialog from "../components/EditContentDialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const useAuthApi = () => {
  const { token } = useAuth();
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });
};

const Section = ({ title, children }) => (
  <section className="sticky tilt-l mb-6 p-5" data-testid={`admin-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
    <span className="tape" />
    <h3 className="font-marker text-2xl text-[var(--ink-color)] mb-3">{title}</h3>
    {children}
  </section>
);

const AdminPanel = () => {
  const { admin, token } = useAuth();
  const api = useAuthApi();
  const [messages, setMessages] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [writings, setWritings] = useState([]);
  const [videos, setVideos] = useState([]);

  const [d, setD] = useState({ title: "", date: "", image_path: "", tags: "", description: "" });
  const [w, setW] = useState({ title: "", date: "", content: "", tags: "" });
  const [v, setV] = useState({ title: "", date: "", external_url: "", video_path: "", thumbnail_path: "", tags: "", description: "" });
  const [siteImages, setSiteImages] = useState({
    artist_image_path: "",
    hub_background_path: "",
    disclaimer_button_path: "",
    about_bookmark_path: "",
  });
  const [imgSaving, setImgSaving] = useState({});

  const [siteTexts, setSiteTexts] = useState({
    about: {
      section_label: "", heading: "", bio_paragraphs: [], signature: "",
      socials_label: "", content_warning_label: "", content_warning_text: "",
    },
    disclaimer: {
      heading: "", body_paragraphs: [], aka_line: "",
      warning_lines: [], ps_note: "",
    },
    contact: { random_questions: [] },
  });
  const [textSaving, setTextSaving] = useState({});
  const [purging, setPurging] = useState(false);
  const [editing, setEditing] = useState({ type: null, item: null });
  const openEdit = (type, item) => setEditing({ type, item });
  const closeEdit = () => setEditing({ type: null, item: null });

  const loadAll = useCallback(async () => {
    const [mr, dr, wr, vr, sr, tr] = await Promise.all([
      api.get(`/messages?all=true`),
      api.get(`/drawings`),
      api.get(`/writings`),
      api.get(`/videos`),
      api.get(`/settings/images`),
      api.get(`/settings/texts`),
    ]);
    setMessages(mr.data); setDrawings(dr.data); setWritings(wr.data); setVideos(vr.data);
    setSiteImages({
      artist_image_path: sr.data?.artist_image_path || "",
      hub_background_path: sr.data?.hub_background_path || "",
      disclaimer_button_path: sr.data?.disclaimer_button_path || "",
      about_bookmark_path: sr.data?.about_bookmark_path || "",
    });
    setSiteTexts({
      about: { ...tr.data?.about },
      disclaimer: { ...tr.data?.disclaimer },
      contact: { ...tr.data?.contact },
    });
    // api is recreated each render but its identity does not affect the
    // logical behaviour of this loader, so it is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (token) loadAll(); }, [token, loadAll]);

  if (!token) return <Navigate to="/admin/login" replace />;

  const approve = async (id) => { await api.patch(`/messages/${id}/approve`); toast("approved"); loadAll(); };
  const delMsg = async (id) => { await api.delete(`/messages/${id}`); toast("deleted"); loadAll(); };

  const addDrawing = async (e) => {
    e.preventDefault();
    if (!d.title || !d.date || !d.image_path) { toast("title, date, image required"); return; }
    await api.post(`/drawings`, { ...d, tags: d.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setD({ title: "", date: "", image_path: "", tags: "", description: "" });
    toast("added");
    loadAll();
  };
  const addWriting = async (e) => {
    e.preventDefault();
    if (!w.title || !w.date || !w.content) { toast("title, date, content required"); return; }
    await api.post(`/writings`, { ...w, tags: w.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setW({ title: "", date: "", content: "", tags: "" });
    toast("added");
    loadAll();
  };
  const addVideo = async (e) => {
    e.preventDefault();
    if (!v.title || !v.date || (!v.external_url && !v.video_path)) { toast("title, date, and either url or upload required"); return; }
    await api.post(`/videos`, { ...v, tags: v.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setV({ title: "", date: "", external_url: "", video_path: "", thumbnail_path: "", tags: "", description: "" });
    toast("added");
    loadAll();
  };

  const remove = async (col, id) => {
    await api.delete(`/${col}/${id}`);
    toast("removed");
    loadAll();
  };

  const saveSiteImage = async (key) => {
    const path = (siteImages[key] || "").trim();
    if (!path) { toast("paste a url or upload an image first"); return; }
    setImgSaving((s) => ({ ...s, [key]: true }));
    try {
      await api.put(`/settings/images`, { [key]: path });
      toast("image updated");
      loadAll();
    } catch {
      toast("update failed");
    } finally {
      setImgSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const saveTextGroup = async (group) => {
    setTextSaving((s) => ({ ...s, [group]: true }));
    try {
      await api.put(`/settings/texts`, { [group]: siteTexts[group] });
      toast(`${group} text saved`);
      loadAll();
    } catch {
      toast("save failed");
    } finally {
      setTextSaving((s) => ({ ...s, [group]: false }));
    }
  };

  const updateText = (group, key, value) =>
    setSiteTexts((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));
  const updateTextList = (group, key, idx, value) =>
    setSiteTexts((s) => {
      const list = [...(s[group][key] || [])];
      list[idx] = value;
      return { ...s, [group]: { ...s[group], [key]: list } };
    });
  const addTextListItem = (group, key) =>
    setSiteTexts((s) => ({
      ...s,
      [group]: { ...s[group], [key]: [...(s[group][key] || []), ""] },
    }));
  const removeTextListItem = (group, key, idx) =>
    setSiteTexts((s) => {
      const list = [...(s[group][key] || [])];
      list.splice(idx, 1);
      return { ...s, [group]: { ...s[group], [key]: list } };
    });

  const purgeSamples = async () => {
    if (!window.confirm("Delete the built-in sample drawings / writings / videos / message from the database? This only removes the template rows, not anything you created.")) return;
    setPurging(true);
    try {
      const { data } = await api.post(`/admin/purge-samples`);
      const r = data?.removed || {};
      toast(`purged — drawings ${r.drawings || 0} · writings ${r.writings || 0} · videos ${r.videos || 0} · messages ${r.messages || 0}`);
      loadAll();
    } catch {
      toast("purge failed");
    } finally {
      setPurging(false);
    }
  };

  const page = (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-marker text-5xl text-[var(--ink-color)] tilt-l2">admin panel</h2>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {admin?.email}
        </span>
      </div>

      <Section title="Site Images">
        <p className="font-hand text-sm text-[var(--ink-soft)] mb-3" data-testid="site-images-section">
          Master controls for every image asset on the site. Paste a URL or upload a new file, then click save for that slot.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: "artist_image_path",      label: "About — Artist Photo",       w: "w-36", h: "h-44", aspect: "aspect-[3/4]" },
            { key: "hub_background_path",    label: "Hub — Background (behind Gameboy)", w: "w-44", h: "h-32", aspect: "aspect-[16/10]" },
            { key: "disclaimer_button_path", label: "Disclaimer — “I Understand” Button", w: "w-40", h: "h-32", aspect: "aspect-[5/4]" },
            { key: "about_bookmark_path",    label: "About — Bookmark Logo (top-left ribbon)", w: "w-24", h: "h-24", aspect: "aspect-square" },
          ].map((slot) => {
            const val = siteImages[slot.key] || "";
            return (
              <div key={slot.key} className="border border-[var(--ink-soft)]/30 rounded-md p-3" data-testid={`site-image-card-${slot.key}`}>
                <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-2">{slot.label}</div>
                <div className="flex gap-3 items-start">
                  <div
                    className={`relative bg-[var(--bg-color)] p-2 shrink-0 ${slot.w} ${slot.h} flex items-center justify-center overflow-hidden tilt-l`}
                    style={{ boxShadow: "2px 4px 10px var(--shadow)" }}
                  >
                    {val ? (
                      <img
                        src={resolveMediaUrl(val)}
                        alt={slot.label}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                        data-testid={`site-image-preview-${slot.key}`}
                      />
                    ) : (
                      <div className="font-pixel text-xs text-[var(--ink-soft)] uppercase tracking-widest text-center">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <input
                      className="pico-input font-hand w-full"
                      placeholder="image URL or storage path"
                      value={val}
                      onChange={(e) => setSiteImages((s) => ({ ...s, [slot.key]: e.target.value }))}
                      data-testid={`site-image-input-${slot.key}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <UploadField
                        label="upload"
                        accept="image/*"
                        testId={`site-image-upload-${slot.key}`}
                        onUploaded={(p) => setSiteImages((s) => ({ ...s, [slot.key]: p }))}
                      />
                      <button
                        type="button"
                        className="pico-btn"
                        onClick={() => saveSiteImage(slot.key)}
                        disabled={!!imgSaving[slot.key]}
                        data-testid={`site-image-save-${slot.key}`}
                      >
                        {imgSaving[slot.key] ? "saving..." : "save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Site Text Content">
        <p className="font-hand text-sm text-[var(--ink-soft)] mb-4" data-testid="site-text-section">
          Master controls for the text content on each page. Edit, add or remove paragraphs/questions then click save for that section.
        </p>

        {/* About */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3 mb-5" data-testid="text-group-about">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">about page</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">section label (small caps)</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-section_label"
                value={siteTexts.about.section_label || ""}
                onChange={(e) => updateText("about", "section_label", e.target.value)} />
            </label>
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">heading</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-heading"
                value={siteTexts.about.heading || ""}
                onChange={(e) => updateText("about", "heading", e.target.value)} />
            </label>
          </div>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">bio paragraphs</span>
            {(siteTexts.about.bio_paragraphs || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`about-bio-row-${i}`}>
                <textarea className="pico-textarea font-hand flex-1" rows={2}
                  value={p}
                  onChange={(e) => updateTextList("about", "bio_paragraphs", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("about", "bio_paragraphs", i)}
                  data-testid={`about-bio-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("about", "bio_paragraphs")}
              data-testid="about-bio-add">+ add paragraph</button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">signature</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-signature"
                value={siteTexts.about.signature || ""}
                onChange={(e) => updateText("about", "signature", e.target.value)} />
            </label>
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">socials heading</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-socials_label"
                value={siteTexts.about.socials_label || ""}
                onChange={(e) => updateText("about", "socials_label", e.target.value)} />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content warning label</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-cw_label"
                value={siteTexts.about.content_warning_label || ""}
                onChange={(e) => updateText("about", "content_warning_label", e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content warning text</span>
              <textarea className="pico-textarea font-hand w-full" rows={2} data-testid="about-text-cw_text"
                value={siteTexts.about.content_warning_text || ""}
                onChange={(e) => updateText("about", "content_warning_text", e.target.value)} />
            </label>
          </div>

          <button type="button" className="pico-btn mt-4"
            onClick={() => saveTextGroup("about")}
            disabled={!!textSaving.about}
            data-testid="about-text-save">
            {textSaving.about ? "saving..." : "save about text"}
          </button>
        </div>

        {/* Disclaimer */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3 mb-5" data-testid="text-group-disclaimer">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">disclaimer page</div>

          <label className="block">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">heading</span>
            <input className="pico-input font-hand w-full" data-testid="disclaimer-text-heading"
              value={siteTexts.disclaimer.heading || ""}
              onChange={(e) => updateText("disclaimer", "heading", e.target.value)} />
          </label>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">body paragraphs</span>
            {(siteTexts.disclaimer.body_paragraphs || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`disclaimer-body-row-${i}`}>
                <textarea className="pico-textarea font-hand flex-1" rows={3}
                  value={p}
                  onChange={(e) => updateTextList("disclaimer", "body_paragraphs", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("disclaimer", "body_paragraphs", i)}
                  data-testid={`disclaimer-body-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("disclaimer", "body_paragraphs")}
              data-testid="disclaimer-body-add">+ add paragraph</button>
          </div>

          <label className="block mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">a.k.a line</span>
            <input className="pico-input font-hand w-full" data-testid="disclaimer-text-aka_line"
              value={siteTexts.disclaimer.aka_line || ""}
              onChange={(e) => updateText("disclaimer", "aka_line", e.target.value)} />
          </label>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">warning lines (bold, centered)</span>
            {(siteTexts.disclaimer.warning_lines || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`disclaimer-warn-row-${i}`}>
                <input className="pico-input font-hand flex-1"
                  value={p}
                  onChange={(e) => updateTextList("disclaimer", "warning_lines", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("disclaimer", "warning_lines", i)}
                  data-testid={`disclaimer-warn-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("disclaimer", "warning_lines")}
              data-testid="disclaimer-warn-add">+ add line</button>
          </div>

          <label className="block mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">P.S. note</span>
            <textarea className="pico-textarea font-hand w-full" rows={3} data-testid="disclaimer-text-ps_note"
              value={siteTexts.disclaimer.ps_note || ""}
              onChange={(e) => updateText("disclaimer", "ps_note", e.target.value)} />
          </label>

          <button type="button" className="pico-btn mt-4"
            onClick={() => saveTextGroup("disclaimer")}
            disabled={!!textSaving.disclaimer}
            data-testid="disclaimer-text-save">
            {textSaving.disclaimer ? "saving..." : "save disclaimer text"}
          </button>
        </div>

        {/* Contact / Message Board random questions */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3" data-testid="text-group-contact">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">message board · random question pool</div>
          <p className="font-hand text-sm text-[var(--ink-soft)] mb-2">
            One of these is picked at random each time a visitor opens the message board.
          </p>
          {(siteTexts.contact.random_questions || []).map((p, i) => (
            <div key={i} className="flex gap-2 mt-2" data-testid={`contact-q-row-${i}`}>
              <input className="pico-input font-hand flex-1"
                value={p}
                onChange={(e) => updateTextList("contact", "random_questions", i, e.target.value)} />
              <button type="button" className="pico-btn text-xs h-fit"
                onClick={() => removeTextListItem("contact", "random_questions", i)}
                data-testid={`contact-q-remove-${i}`}>×</button>
            </div>
          ))}
          <button type="button" className="pico-btn text-xs mt-2"
            onClick={() => addTextListItem("contact", "random_questions")}
            data-testid="contact-q-add">+ add question</button>

          <button type="button" className="pico-btn mt-4 ml-2"
            onClick={() => saveTextGroup("contact")}
            disabled={!!textSaving.contact}
            data-testid="contact-text-save">
            {textSaving.contact ? "saving..." : "save questions"}
          </button>
        </div>
      </Section>

      <Section title="Maintenance">
        <div className="flex flex-wrap items-start gap-4">
          <div className="max-w-lg">
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-1">purge sample content</div>
            <p className="font-hand text-sm text-[var(--ink-soft)]">
              Removes only the built-in template drawings, writings, video, and message that used to seed on startup. Anything you created is untouched. Safe to run any time.
            </p>
          </div>
          <button
            type="button"
            className="pico-btn"
            onClick={purgeSamples}
            disabled={purging}
            data-testid="purge-samples-btn"
          >
            {purging ? "purging..." : "purge sample content"}
          </button>
        </div>
      </Section>

      <Section title="Messages">
        <div className="space-y-3 max-h-[40vh] overflow-y-auto notebook-scroll pr-2">
          {messages.length === 0 && <p className="font-hand text-[var(--ink-soft)]">no messages.</p>}
          {messages.map((m) => (
            <div key={m.id} className="border-2 border-[var(--ink-color)] p-3 bg-[var(--bg-color)]" data-testid={`admin-msg-${m.id}`}>
              <div className="flex items-baseline justify-between">
                <div className="font-marker text-lg">{m.name} <span className="font-pixel text-xs text-[var(--ink-soft)] uppercase tracking-widest">{m.email}</span></div>
                <span className={`font-pixel uppercase text-xs tracking-widest ${m.approved ? "text-[var(--ink-color)]" : "text-[var(--margin-color)]"}`}>
                  {m.approved ? "approved" : "pending"}
                </span>
              </div>
              <p className="font-hand whitespace-pre-wrap mt-1">{m.message}</p>
              <div className="font-hand text-xs text-[var(--ink-soft)] mt-1">
                {m.website && <>site: {m.website} · </>}{m.found_via && <>found via: {m.found_via} · </>}{m.sender_descriptor && <>map: {m.sender_descriptor}</>}
              </div>
              <div className="mt-2 flex gap-2">
                {!m.approved && <button className="pico-btn" onClick={() => approve(m.id)} data-testid={`approve-msg-${m.id}`}>approve</button>}
                <button className="pico-btn" onClick={() => openEdit("message", m)} data-testid={`edit-msg-${m.id}`}>edit</button>
                <button className="pico-btn" onClick={() => delMsg(m.id)} data-testid={`delete-msg-${m.id}`}>delete</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Drawing">
        <form onSubmit={addDrawing} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-drawing-form">
          <input className="pico-input font-hand" placeholder="title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} data-testid="drawing-title-input" />
          <input className="pico-input font-hand" placeholder="MM/DD/YYYY" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} data-testid="drawing-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="image storage_path or URL" value={d.image_path} onChange={(e) => setD({ ...d, image_path: e.target.value })} data-testid="drawing-image-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} data-testid="drawing-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[60px]" placeholder="description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} data-testid="drawing-desc-input" />
          <div className="sm:col-span-2 flex gap-2">
            <UploadField label="upload image" accept="image/*" testId="drawing-upload-btn" onUploaded={(p) => setD((cur) => ({ ...cur, image_path: p }))} />
            <button type="submit" className="pico-btn" data-testid="drawing-submit-btn">add drawing</button>
          </div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {drawings.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("drawing", it)} data-testid={`edit-drawing-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("drawings", it.id)} data-testid={`del-drawing-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Writing">
        <form onSubmit={addWriting} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-writing-form">
          <input className="pico-input font-hand" placeholder="title" value={w.title} onChange={(e) => setW({ ...w, title: e.target.value })} data-testid="writing-title-input" />
          <input className="pico-input font-hand" placeholder="MM/DD/YYYY" value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} data-testid="writing-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={w.tags} onChange={(e) => setW({ ...w, tags: e.target.value })} data-testid="writing-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[140px]" placeholder="content" value={w.content} onChange={(e) => setW({ ...w, content: e.target.value })} data-testid="writing-content-input" />
          <div className="sm:col-span-2"><button type="submit" className="pico-btn" data-testid="writing-submit-btn">add writing</button></div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {writings.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("writing", it)} data-testid={`edit-writing-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("writings", it.id)} data-testid={`del-writing-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Video">
        <form onSubmit={addVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-video-form">
          <input className="pico-input font-hand" placeholder="title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} data-testid="video-title-input" />
          <input className="pico-input font-hand" placeholder="MM/DD/YYYY" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} data-testid="video-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="external url (youtube/vimeo embed) — leave empty if uploading" value={v.external_url} onChange={(e) => setV({ ...v, external_url: e.target.value })} data-testid="video-url-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="video storage_path (filled by upload)" value={v.video_path} onChange={(e) => setV({ ...v, video_path: e.target.value })} data-testid="video-path-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="thumbnail storage_path or URL" value={v.thumbnail_path} onChange={(e) => setV({ ...v, thumbnail_path: e.target.value })} data-testid="video-thumb-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} data-testid="video-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[60px]" placeholder="description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} data-testid="video-desc-input" />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <UploadField label="upload video" accept="video/*" testId="video-upload-btn" onUploaded={(p) => setV((cur) => ({ ...cur, video_path: p }))} />
            <UploadField label="upload thumbnail" accept="image/*" testId="video-thumb-upload-btn" onUploaded={(p) => setV((cur) => ({ ...cur, thumbnail_path: p }))} />
            <button type="submit" className="pico-btn" data-testid="video-submit-btn">add video</button>
          </div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {videos.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("video", it)} data-testid={`edit-video-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("videos", it.id)} data-testid={`del-video-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {editing.item && (
        <EditContentDialog
          type={editing.type}
          item={editing.item}
          onClose={closeEdit}
          onSaved={() => { closeEdit(); loadAll(); }}
        />
      )}
    </div>
  );

  return <NotebookFrame single>{page}</NotebookFrame>;
};

export default AdminPanel;

```

---

## `/backend/requirements.txt`

```text
fastapi==0.110.1
uvicorn==0.25.0
boto3>=1.34.129
requests-oauthlib>=2.0.0
cryptography>=42.0.8
python-dotenv>=1.0.1
pymongo==4.5.0
pydantic>=2.6.4
email-validator>=2.2.0
pyjwt>=2.10.1
bcrypt==4.1.3
passlib>=1.7.4
tzdata>=2024.2
motor==3.3.1
pytest>=8.0.0
black>=24.1.1
isort>=5.13.2
flake8>=7.0.0
mypy>=1.8.0
python-jose>=3.3.0
requests>=2.31.0
pandas>=2.2.0
numpy>=1.26.0
python-multipart>=0.0.9
jq>=1.6.0
typer>=0.9.0
emergentintegrations==0.1.0

```

---

## `/backend/server.py`

```python
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Response, Header, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import io

# -------------------- Setup --------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
SITE_PASSWORD = os.environ.get('SITE_PASSWORD', 'pass')
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
APP_NAME = os.environ.get('APP_NAME', 'delined')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
MESSAGE_EMAIL = os.environ.get('MESSAGE_EMAIL', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'delined <onboarding@resend.dev>')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# -------------------- Object storage --------------------
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set — storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # try reinit
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# -------------------- Auth helpers --------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# -------------------- Models --------------------
class SitePasswordIn(BaseModel):
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

class DrawingIn(BaseModel):
    title: str
    date: str  # MM/DD/YYYY
    image_path: str  # storage path or external URL
    tags: List[str] = []
    description: Optional[str] = ""

class WritingIn(BaseModel):
    title: str
    date: str
    content: str
    tags: List[str] = []

class VideoIn(BaseModel):
    title: str
    date: str
    video_path: Optional[str] = None  # storage path
    external_url: Optional[str] = None  # youtube/vimeo/tiktok
    thumbnail_path: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = ""

class MessageIn(BaseModel):
    name: str
    email: str
    website: Optional[str] = ""
    found_via: Optional[str] = ""
    sender_descriptor: Optional[str] = ""
    message: str

class DrawingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    image_path: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None

class WritingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    video_path: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_path: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None

class MessageUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    found_via: Optional[str] = None
    sender_descriptor: Optional[str] = None
    message: Optional[str] = None
    approved: Optional[bool] = None

class AdminUserIn(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

class SiteImagesIn(BaseModel):
    artist_image_path: Optional[str] = None
    hub_background_path: Optional[str] = None
    disclaimer_button_path: Optional[str] = None
    about_bookmark_path: Optional[str] = None

class SiteTextsIn(BaseModel):
    about: Optional[Dict[str, Any]] = None
    disclaimer: Optional[Dict[str, Any]] = None
    contact: Optional[Dict[str, Any]] = None

# -------------------- Email helper --------------------
def send_email(subject: str, html: str, to: Optional[str] = None) -> bool:
    """Send via Resend HTTP API. Silently returns False if not configured."""
    if not RESEND_API_KEY or not MESSAGE_EMAIL:
        logger.info("Email skipped — RESEND_API_KEY or MESSAGE_EMAIL missing")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": [to or MESSAGE_EMAIL],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.error(f"Resend error {resp.status_code}: {resp.text}")
            return False
        return True
    except Exception as e:
        logger.error(f"Resend send failed: {e}")
        return False

# -------------------- Routes --------------------
@api_router.get("/")
async def root():
    return {"message": "Creative Journal API"}

@api_router.post("/site/verify-password")
async def verify_site_password(body: SitePasswordIn):
    submitted = body.password or ""
    # Admin password unlocks the gate AND grants an admin JWT in one step.
    if submitted and submitted == ADMIN_PASSWORD:
        admin_email = ADMIN_EMAIL.strip().lower()
        user = await db.users.find_one({"email": admin_email})
        if not user:
            # Fail closed if the admin user hasn't been seeded yet.
            raise HTTPException(status_code=500, detail="admin not seeded")
        token = create_access_token(user["id"], user["email"])
        return {
            "ok": True,
            "role": "admin",
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user.get("name"),
                "role": user.get("role"),
            },
        }
    # Visitor / drifter password just unlocks the site.
    if submitted and submitted == SITE_PASSWORD:
        return {"ok": True, "role": "drifter"}
    raise HTTPException(status_code=401, detail="Incorrect password")

@api_router.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role")}}

@api_router.get("/auth/me")
async def auth_me(admin: dict = Depends(get_current_admin)):
    return admin

@api_router.post("/auth/logout")
async def auth_logout(admin: dict = Depends(get_current_admin)):
    return {"ok": True}

# Drawings
@api_router.get("/drawings")
async def list_drawings():
    items = await db.drawings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/drawings")
async def create_drawing(body: DrawingIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.drawings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/drawings/{drawing_id}")
async def delete_drawing(drawing_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.drawings.delete_one({"id": drawing_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/drawings/{drawing_id}")
async def update_drawing(drawing_id: str, body: DrawingUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.drawings.update_one({"id": drawing_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.drawings.find_one({"id": drawing_id}, {"_id": 0})
    return doc

# Writings
@api_router.get("/writings")
async def list_writings():
    items = await db.writings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/writings")
async def create_writing(body: WritingIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.writings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/writings/{writing_id}")
async def delete_writing(writing_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.writings.delete_one({"id": writing_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/writings/{writing_id}")
async def update_writing(writing_id: str, body: WritingUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.writings.update_one({"id": writing_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.writings.find_one({"id": writing_id}, {"_id": 0})
    return doc

# Videos
@api_router.get("/videos")
async def list_videos():
    items = await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/videos")
async def create_video(body: VideoIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.videos.delete_one({"id": video_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/videos/{video_id}")
async def update_video(video_id: str, body: VideoUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.videos.update_one({"id": video_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.videos.find_one({"id": video_id}, {"_id": 0})
    return doc

# Messages
@api_router.get("/messages")
async def list_messages(all: bool = False, authorization: Optional[str] = Header(None)):
    if all:
        # admin only
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload["sub"]})
            if not user or user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin only")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        items = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        items = await db.messages.find({"approved": True}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/messages")
async def create_message(body: MessageIn):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["approved"] = False
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.messages.insert_one(doc)
    doc.pop("_id", None)

    # Fire-and-forget email notification to the operators inbox
    html = (
        f"<h2>new delined transmission</h2>"
        f"<p><b>from:</b> {doc.get('name')} &lt;{doc.get('email')}&gt;</p>"
        f"<p><b>website / socials:</b> {doc.get('website') or '—'}</p>"
        f"<p><b>found via:</b> {doc.get('found_via') or '—'}</p>"
        f"<p><b>sender descriptor (map):</b> {doc.get('sender_descriptor') or '—'}</p>"
        f"<hr><p style='white-space:pre-wrap'>{doc.get('message')}</p>"
        f"<hr><p><i>received {doc.get('created_at')} — awaiting approval</i></p>"
    )
    send_email(subject=f"delined — note from {doc.get('name')}", html=html)
    return doc

@api_router.patch("/messages/{message_id}/approve")
async def approve_message(message_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.messages.update_one({"id": message_id}, {"$set": {"approved": True}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.messages.delete_one({"id": message_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/messages/{message_id}")
async def update_message(message_id: str, body: MessageUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.messages.update_one({"id": message_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.messages.find_one({"id": message_id}, {"_id": 0})
    return doc

# Upload
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "storage_path": result["path"], "content_type": content_type}

# Site image settings
DEFAULT_SITE_IMAGES = {
    "artist_image_path": "https://images.pexels.com/photos/29861519/pexels-photo-29861519.jpeg?auto=compress&cs=tinysrgb&w=900",
    "hub_background_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/df20ee9o_15187.jpg",
    "disclaimer_button_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/43b6fv8r_Untitled%20design%20%281%29.png",
    "about_bookmark_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/twxxbarm_Untitled_Artwork.PNG",
}

async def _load_site_images() -> Dict[str, str]:
    doc = await db.settings.find_one({"key": "images"}, {"_id": 0}) or {}
    merged = dict(DEFAULT_SITE_IMAGES)
    for k in DEFAULT_SITE_IMAGES.keys():
        v = doc.get(k)
        if v:
            merged[k] = v
    return merged

@api_router.get("/settings/images")
async def get_site_images():
    return await _load_site_images()

@api_router.put("/settings/images")
async def update_site_images(body: SiteImagesIn, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    # only allow known keys, strip whitespace
    update: Dict[str, str] = {}
    for k in DEFAULT_SITE_IMAGES.keys():
        if k in payload:
            v = (payload[k] or "").strip()
            if v:
                update[k] = v
    if not update:
        raise HTTPException(status_code=400, detail="no valid fields to update")
    update["key"] = "images"
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = admin.get("email")
    await db.settings.update_one({"key": "images"}, {"$set": update}, upsert=True)
    return {"ok": True, "images": await _load_site_images()}

# Backwards-compat: keep old about endpoint as alias
DEFAULT_ARTIST_IMAGE = DEFAULT_SITE_IMAGES["artist_image_path"]

# Site text content (about / disclaimer / contact)
DEFAULT_SITE_TEXTS: Dict[str, Any] = {
    "about": {
        "section_label": "whoami",
        "heading": "a strange diary keeper",
        "bio_paragraphs": [
            "hi. i draw, write, and film small things. this site is a collected mess of those things — a sandbox more than a gallery.",
            "most entries are made in margins, on receipts, between classes, after sleep. i'd rather show the doodle than the polished version.",
            "if you'd like to leave a note, the contact page has a message board. messages are read before being shown.",
        ],
        "signature": "— The author",
        "socials_label": "other notebooks",
        "content_warning_label": "content warning",
        "content_warning_text": "Asking questions while someone is drawing may be distracting. Especially if the questions are consistent, repetitive, and are more critical than inquisitive.",
    },
    "disclaimer": {
        "heading": "Disclaimer",
        "body_paragraphs": [
            "That this site is simply meant to be a personal creative art/writing/media sandbox and overall gallery for its owner.",
            "Consider it another random personal blog on this World Wide Web — with its true meanings and worth being defined only by the one who owns it and likewise decided to share it.",
            "As such — the content within can and WILL change based on the owner's collective whims and focus regarding their interests. Life changes — so does a persons attention and focus on occasion. Whatever you see here isn't meant to be restricted by your own views and interpretations. Or anyone else's.",
            "So while the owner cannot physically stop you from viewing this blog, nor can they force how you think or tell you what to do after you browse the contents within — try to remember that this blog may hold things not suitable for you…or an audience that is younger or more sensitive.",
        ],
        "aka_line": "a.k.a…",
        "warning_lines": [
            "Warning: This blog is 18+. Viewer Discretion is Advised",
            "This blog, isn't a babysitter.",
        ],
        "ps_note": "P.S. — If and when you see any spelling or grammar errors, pretend this is an actual notebook. And remember human error is a thing that applies here. Along with sleep deprivation. Thanks.",
    },
    "contact": {
        "random_questions": [
            "If you were a sticky note, what color would you be and what would you say?",
            "What's the weirdest dream you remember and never told anyone about?",
            "If your handwriting had a personality, how would you describe it?",
            "What's a song you'd play on loop while doodling at 3am?",
            "If this blog were a room, what one object would you leave in it?",
            "What's an opinion you hold that you secretly think no one else does?",
            "Describe yourself using only three random objects from your desk.",
            "What's the last small thing that made you genuinely smile?",
            "If you could leave one footnote in someone else's diary, what would it say?",
            "What's the smell of your favorite memory?",
            "If your week had a soundtrack title, what would it be?",
            "What's a secret hobby you'd start if no one was watching?",
        ],
    },
}

def _deep_merge(defaults: Dict[str, Any], stored: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in defaults.items():
        if isinstance(v, dict):
            out[k] = _deep_merge(v, (stored or {}).get(k) or {})
        else:
            stored_val = (stored or {}).get(k)
            out[k] = stored_val if stored_val not in (None, "") else v
    # carry any extra keys from stored (so admin can add custom fields safely)
    for k, v in (stored or {}).items():
        if k not in out:
            out[k] = v
    return out

async def _load_site_texts() -> Dict[str, Any]:
    doc = await db.settings.find_one({"key": "texts"}, {"_id": 0}) or {}
    stored = doc.get("data") or {}
    return _deep_merge(DEFAULT_SITE_TEXTS, stored)

@api_router.get("/settings/texts")
async def get_site_texts():
    return await _load_site_texts()

@api_router.put("/settings/texts")
async def update_site_texts(body: SiteTextsIn, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    existing = await db.settings.find_one({"key": "texts"}, {"_id": 0}) or {}
    merged_data = _deep_merge(existing.get("data") or {}, payload)
    await db.settings.update_one(
        {"key": "texts"},
        {"$set": {
            "key": "texts",
            "data": merged_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email"),
        }},
        upsert=True,
    )
    return {"ok": True, "texts": await _load_site_texts()}

@api_router.get("/settings/about")
async def get_about_settings():
    imgs = await _load_site_images()
    return {"artist_image_path": imgs["artist_image_path"]}

@api_router.put("/settings/about")
async def update_about_settings(body: SiteImagesIn, admin: dict = Depends(get_current_admin)):
    path = (body.artist_image_path or "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="artist_image_path required")
    await db.settings.update_one(
        {"key": "images"},
        {"$set": {
            "key": "images",
            "artist_image_path": path,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email"),
        }},
        upsert=True,
    )
    return {"ok": True, "artist_image_path": path}

# File serving — public (we already gate the whole site with the password screen)
@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        # Allow direct fetches for known prefix anyway
        if not path.startswith(f"{APP_NAME}/"):
            raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    record_ct = record.get("content_type", content_type) if record else content_type
    return StreamingResponse(io.BytesIO(data), media_type=record_ct)

# -------------------- Seed & startup --------------------
async def seed_admin():
    # Remove legacy admin (rebrand)
    await db.users.delete_one({"email": "scalewitheac@gmail.com"})

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info("Updated admin password from env")

async def seed_sample_content():
    # No-op. The site is in active use and sample content is no longer seeded
    # on startup. Kept as an empty function so existing call sites don't break.
    return

# Known sample content identifiers (used only for the /admin/purge-samples cleanup route).
SAMPLE_DRAWING_TITLES = ["moon-rabbit", "study-001", "doodle-pile"]
SAMPLE_WRITING_TITLES = ["newsletter — winter notes", "small notice"]
SAMPLE_VIDEO_TITLES = ["timelapse-rabbit"]
SAMPLE_MESSAGE_MARKERS = [
    {"name": "anon", "email": "anon@example.com"},
]

@api_router.post("/admin/purge-samples")
async def purge_samples(admin: dict = Depends(get_current_admin)):
    """One-shot cleanup. Deletes only the exact sample rows that used to be
    seeded on startup, identified by their unique titles/emails. Any content
    the operator created themselves is left untouched."""
    dr = await db.drawings.delete_many({"title": {"$in": SAMPLE_DRAWING_TITLES}})
    wr = await db.writings.delete_many({"title": {"$in": SAMPLE_WRITING_TITLES}})
    vr = await db.videos.delete_many({"title": {"$in": SAMPLE_VIDEO_TITLES}})
    mr = await db.messages.delete_many({"$or": SAMPLE_MESSAGE_MARKERS})
    return {
        "ok": True,
        "removed": {
            "drawings": dr.deleted_count,
            "writings": wr.deleted_count,
            "videos": vr.deleted_count,
            "messages": mr.deleted_count,
        },
    }

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.drawings.create_index("created_at")
    await db.writings.create_index("created_at")
    await db.videos.create_index("created_at")
    await db.messages.create_index("created_at")
    await seed_admin()
    await seed_sample_content()
    init_storage()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

```

---

