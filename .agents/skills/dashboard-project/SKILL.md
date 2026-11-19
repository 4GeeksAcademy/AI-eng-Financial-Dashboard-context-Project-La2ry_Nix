---
name: dashboard-project
description: Conventions, workflow, and architecture for the Influencer Analytics Dashboard project. Use when asked to commit, branch, build, test, deploy, or understand the project structure.
---

# Influencer Analytics Dashboard — Project Skill

## Stack

| Layer | Choice |
|---|---|
| Frontend | HTML + CSS + JavaScript (no framework) |
| CSS framework | Tailwind CSS via CDN (`@tailwindcss/browser@4`) |
| Chart rendering | Custom JS (`chart-renderer.mjs`), horizontal bars |
| Chart loading | Viewport-lazy via `IntersectionObserver` |
| Backend | Python Flask (`server.py`, port 3000) |
| Testing | `node:test` + `node:assert/strict` |
| Linting | `node --check <file>` |

## Project Structure

```
.
├── index.html          # Main dashboard page
├── dashboard.js        # Client JS: chart parsing, lazy loading
├── dashboard.css       # Styles (complements Tailwind)
├── chart-renderer.mjs  # Chart markup renderer (exported module)
├── dashboard.test.js   # Node test suite (6 tests)
├── server.py           # Flask dev server (port 3000)
├── package.json        # Scripts: lint, test, build
├── skills-lock.json    # Installed npx skill manifest
├── data/               # Static data files
├── scripts/
│   └── verify-build.js # CI-style build assertion checks
└── specs/
    └── stage-three-skills.md  # Skill-driven improvement documentation
```

## Development Workflow

### Preview
- Run `python3 server.py` (or use the VS Code task "Run Flask preview server")
- Opens on `http://localhost:3000`
- The server serves `index.html` from the project root

### Lint
```sh
npm run lint
```
Checks JavaScript syntax for all JS/MJS files using `node --check`.

### Test
```sh
npm test
```
Runs `dashboard.test.js` via `node --test`. Currently 6 tests covering:
- Table label/value parsing
- Proportional bar rendering + HTML escaping
- Empty-data state
- Zero-value minimum bar width
- IntersectionObserver lazy hydration
- Fallback when Observer is unavailable

### Build (verification)
```sh
npm run build
```
Runs `scripts/verify-build.js` which asserts key metadata and chart contract elements exist in the source files. Must pass before submission.

## Commit & Branch Conventions

### Branch names
- Feature branches: `kebab-case-description` (e.g. `skill-tighten`, `data-filters`)
- Base off `main` unless coordinating multi-branch work

### Commit messages
```
<area>: <brief description>

- Bullet details with rationale or skill reference when applicable
- Keep subject line under 72 chars
- Reference installed skills in commit body when changes are skill-driven
```

Examples:
```
Apply extra skill: web-design-guidelines (vercel-labs)

Document skill discovery and apply web-design-guidelines improvements

- Expand stage-three-skills.md with full npx skills find command output
  documenting both chart quality and data table accessibility explorations.
- Add Extra skill application section detailing web-design-guidelines
  installation and the four changes it drove.
```

## Installed Skills

| Skill | Source | Purpose |
|---|---|---|
| `chart-checklist` | `olitreadwell/chart-checklist` | Data-visualisation quality rules: accessible table equivalents, labels beyond color, loading/empty states |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Web interface compliance: accessibility, forms, typography, performance |
| `dashboard-project` | (internal) | This file — project conventions and workflow |

Install new skills with:
```sh
npx --yes skills add <owner/repo> --skill <skill-name> --copy -y
```

## Accessibility & Quality Conventions

- Chart data is always available as an `<table class="sr-only" data-chart-data>` with `<caption>`, `<th scope="col">`, and `<th scope="row">` for screen readers.
- Charts load lazily via `IntersectionObserver` with `rootMargin: "160px"`. A no-observer fallback renders immediately.
- Decorative UI elements use `aria-hidden="true"`.
- Loading states end with `&hellip;` (ellipsis).
- External CDN assets should have a `<link rel="preconnect">` hint.

## Deployment

- The Flask server in `server.py` serves the static HTML/JS/CSS.
- No build step required — `index.html` references assets directly.
- For production, serve the static directory via any HTTP server (nginx, Caddy, etc.).