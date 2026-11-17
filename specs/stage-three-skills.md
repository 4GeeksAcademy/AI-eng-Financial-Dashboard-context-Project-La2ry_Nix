# Stage 3 — Targeted Skill-Driven Improvements

## Scope

This stage is limited to concrete frontend quality improvements informed by
skill discovery and review. It does **not** add the broader filters, alerts,
or API feature work proposed in the specifications. The current dashboard
content and feature set remain intact.

## Skill discovery and application

- Discovery command: `npx --yes skills find "dashboard quality accessibility charts"`
- Relevant chart result: `olitreadwell/chart-checklist@chart-checklist`
  ([skills.sh](https://skills.sh/olitreadwell/chart-checklist/chart-checklist)).
- Also surfaced: `vercel-labs/agent-skills@web-design-guidelines` and
  `alexsnchz/skills@wcag-design`; the chart-specific checklist was selected
  because this pass targets the existing dashboard visualizations.
- Applied skill: `chart-checklist` (installed with
  `npx --yes skills add olitreadwell/chart-checklist --skill chart-checklist
  --copy -y`; its guidance lives in `.agents/skills/chart-checklist/`).
- Relevant checklist principles: preserve an accessible table equivalent,
  make labels and units available beyond color/marks, and check loading and
  empty states. This is an implementation note, not a claim of WCAG
  conformance or a full checklist pass.

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

## Verification record

Run from the repository root:

```sh
npm run lint
npm test
npm run build
```

Recorded result: `npm run lint` passed; `npm test` passed all 6 tests; and
`npm run build` passed. `git diff --check` also passed.

The checks are deliberately limited to the stage-three files and do not
represent a separate API/backend or filters-and-alerts feature implementation.