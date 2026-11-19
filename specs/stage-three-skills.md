# Stage 3 — Targeted Skill-Driven Improvements

## Scope

This stage is limited to concrete frontend quality improvements informed by
skill discovery and review. It does **not** add the broader filters, alerts,
or API feature work proposed in the specifications. The current dashboard
content and feature set remain intact.

## Skill discovery and application

### First exploration: chart quality

```sh
npx --yes skills find "dashboard quality accessibility charts"
```

Exact matches:

- `vercel-labs/agent-skills@web-design-guidelines` -- 878.1K installs
  https://skills.sh/vercel-labs/agent-skills/web-design-guidelines
- `olitreadwell/chart-checklist@chart-checklist` -- 2 installs
  https://skills.sh/olitreadwell/chart-checklist/chart-checklist

Partial matches included `alexsnchz/skills@wcag-design` (51 installs),
`anthropics/knowledge-work-plugins@data-visualization` (15K), and
`glebis/claude-skills@tufte-report` (202).

The chart-specific checklist was selected because this pass targets the
existing dashboard visualizations; `web-design-guidelines` was noted for
later use as an extra skill.

Applied skill: `chart-checklist` (installed with
`npx --yes skills add olitreadwell/chart-checklist --skill chart-checklist
--copy -y`; its guidance lives in `.agents/skills/chart-checklist/`).

Relevant checklist principles: preserve an accessible table equivalent,
make labels and units available beyond color/marks, and check loading and
empty states. This is an implementation note, not a claim of WCAG
conformance or a full checklist pass.

### Second exploration: data table accessibility

```sh
npx --yes skills find "data tables accessibility screen readers"
```

Exact match:

- `owl-listener/inclusive-design-skills@table-accessibility` -- 90 installs
  https://skills.sh/owl-listener/inclusive-design-skills/table-accessibility

Partial matches included `pmq9/agent-skills@accessibility-wcag`,
`vercel-labs/agent-skills@web-design-guidelines` (also surfaced here), and
`ziniman/ai-instruct@web-accessibility`.

This reinforced the accessible-table approach already taken in the chart
improvements and confirmed that `web-design-guidelines` (which covers table
accessibility, form controls, focus states, and performance) was the right
extra skill for the dashboard shell.

## Extra skill application

Extra skill: `vercel-labs/agent-skills@web-design-guidelines`
([skills.sh](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines)).

Installed with:

```sh
npx --yes skills add vercel-labs/agent-skills --skill web-design-guidelines --copy -y
```

This skill provides Web Interface Guidelines compliance review covering
accessibility, focus states, forms, animation, typography, and performance.
It complements `chart-checklist`'s data-visualization focus with broader
frontend-pattern guidance applicable to the overall dashboard shell.

Changes driven by web-design-guidelines:

- Added `aria-hidden="true"` to the decorative status indicator in the
  header (accessibility rule: decorative icons need assistive-tech hiding).
- Updated chart loading-placeholder text to end with `&hellip;` per the
  typography rule that loading states use an ellipsis character.
- Added `<link rel="preconnect" href="https://cdn.jsdelivr.net">` for the
  Tailwind CDN (performance rule: preconnect for CDN/asset domains).
- Added a visible hero description below the page heading to give
  sighted and assistive-tech users immediate context for the dashboard.

The skill was applied agent-first: the guidelines were fetched and rules
identified, then each change was verified against the rule text. This is
an implementation note, not a compliance audit.

## Changes

1. Replaced the generic page title with an analytics-specific title and added
   a concise search description in `index.html`.
2. Converted only the existing revenue-by-product and conversion-funnel
  visualizations to viewport-lazy charts. `IntersectionObserver` defers
  loading `chart-renderer.mjs` and chart-mark DOM generation until near the
  viewport; the source tables remain in the document and are screen-reader
  accessible. A no-observer fallback renders immediately.
3. Added focused automated checks for parsing data from the tables, proportional
   bars, empty/zero values, safe label escaping, lazy intersection behavior,
   and the metadata/chart build contract.
4. Applied `web-design-guidelines` rules: `aria-hidden` on decorative indicator,
   `&hellip;` on chart loading placeholders, `<link rel="preconnect">` for Tailwind
   CDN, and a visible hero description in the page header.

## Verification record

Run from the repository root:

```sh
npm run lint
npm test
npm run build
```

Recorded result: `npm run lint` passed; `npm test` passed all 6 tests; and
`npm run build` passed. `git diff --check` also passed. All checks green after
tightening the branch from the stage-three base and adding the extra-skill
driven frontend improvements.

The checks are deliberately limited to the stage-three files and do not
represent a separate API/backend or filters-and-alerts feature implementation.