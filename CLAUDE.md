# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SF Tools is a Chrome extension (Manifest V3) that enhances Salesforce workflows. It injects content scripts into `*.force.com` pages and provides a React popup UI. Key features: premade comment templates with text expansion (`;alias` + Enter), 7-day inactivity highlighting on case tables, and PagerDuty incident batch helper that parses PD alert titles to auto-fill Salesforce "New Case: Incident" forms.

## Commands

- `pnpm dev` — Start Vite dev server (HMR for popup; content scripts require extension reload)
- `pnpm build` — Production build to `dist/` (runs `set-dynamic-url.cjs` post-build)
- `pnpm lint` — ESLint
- `pnpm test:classify` — Run incident classification tests (plain Node, no framework)

Load the extension in Chrome via `chrome://extensions` → Developer mode → "Load unpacked" → select `dist/`.

## Architecture

### Extension entry points (defined in manifest.json)

- **Popup** — `index.html` → `src/main.jsx` → `src/App.jsx`. Template management UI (396×600px).
- **Background service worker** — `src/background.js`. Handles version checking (GitHub raw), PagerDuty title fetching, batch tab orchestration, and storage initialization.
- **Content scripts** (injected into `*.force.com`):
  - `src/TemplateContent.jsx` — Mounts the comment templates panel into `forceDetailPanelDesktop` containers. Uses MutationObserver to detect dynamically rendered forms.
  - `src/content/new-incident/NewIncidentPageDetector.jsx` — Detects "New Case: Incident" modals and injects auto-fill controls.
  - `src/content/seven-days/SevenDays.jsx` — Highlights stale rows in case tables.

### Key modules

- `src/content/comment-templates/` — Custom hooks: `useCommentFormFields` (resolves textarea + checkbox), `useCommentTemplatesStorage` (Chrome storage sync), `useTextExpansion` (alias detection), `useQuickSend` (double Ctrl+Enter to save).
- `src/content/new-incident/incidentAlertTypes/` — PD title parsing and classification. `config.js` defines alert type patterns; `index.js` exports `getCaseInfoFromPdTitle()`. Classification tests live in `classification.test.js`.
- `src/content/new-incident/domUtils.js` — Shadow DOM traversal helpers for Salesforce Lightning components.
- `src/lib/fillCommentForm.js` — Dispatches synthetic events (input, change, blur, focus) to make Salesforce Lightning react to programmatic form fills.
- `src/constants/storage.js` — All Chrome storage key names.

### State management

Persistent state lives in `chrome.storage.local` (keys in `src/constants/storage.js`). Zustand exists in `src/store/store.js` but is minimally used — most components read storage directly via hooks.

## Build & tooling

- **Vite + @crxjs/vite-plugin** — Builds the extension from `manifest.json`. CRXJS handles content script bundling and HMR for the popup.
- **Tailwind CSS 3** — Utility classes throughout. Config in `tailwind.config.js`.
- **ESLint 9** — Flat config with React and React Hooks plugins.
- **No TypeScript currently** — All `.js`/`.jsx` (migration to `.ts`/`.tsx` was started on `feature/shadcn-migrate` branch).

## Salesforce DOM interaction

Content scripts interact with Salesforce Lightning's DOM, which uses shadow DOM and Aura/LWC components. Key patterns:
- Find containers via `[data-aura-class="..."]` selectors
- Use `domUtils.js` helpers for deep shadow DOM queries
- Dispatch synthetic events to trigger Lightning's data binding (simple `.value =` assignment doesn't work)
