# AGENTS.md — 0vault

Guidance for AI coding agents working in this repository.

## Project summary

**0vault** is an encrypted `.age` vault editor with multi-file archive support. The repo is an **Nx 22 monorepo** (package manager: **Bun**). Shared UI and business logic live in `libs/`; each app provides its own platform adapter for file I/O, dialogs, and encryption transport.

| App | Path | Role |
|-----|------|------|
| Desktop | `apps/electrobun-desktop` | Primary native app (Electrobun + Bun main process) |
| Web PWA | `apps/web-pwa` | Browser build with File System Access API |

Planned but **not started**: `apps/tauri` (Android/iOS) — do not scaffold unless explicitly requested.

## Repository layout

```
apps/
  electrobun-desktop/     # Vite webview + Bun entry (src/bun/) + Electrobun config
  web-pwa/                # Vite PWA shell + browser platform API
libs/
  views/                  # React UI (App, components, index.css)
  di/                     # Inversify DI, VaultEditorProvider, IVaultPlatformApi
  utils/                  # Vault paths/tree/bytes, archive types, RPC message types
types/                    # Global shims (shims.d.ts, jsx-global.d.ts)
dist/apps/<app>/          # Vite build output (consumed by Electrobun copy paths)
```

## Architecture rules

### Platform abstraction

All file/dialog/crypto **transport** is behind [`IVaultPlatformApi`](libs/di/src/platform/types.ts). Apps inject a platform module via `DiProvider extraModules`:

```tsx
<DiProvider extraModules={[ElectrobunPlatformModule]}>
  <App />
</DiProvider>
```

- **Do not** import `electro.ts` or Bun RPC from `libs/views` or `libs/di`.
- **Do not** add platform-specific code to shared libs unless it is behind `IVaultPlatformApi` or a new shared abstraction.

### Dependency graph

```
apps/*  →  libs/views, libs/di, libs/utils
libs/views  →  libs/di, libs/utils
libs/di  →  libs/utils
libs/utils  →  (no di/views)
```

Avoid cycles. `IVaultArchive` types live in `libs/utils` (`archive-types.ts`) for this reason.

### Path aliases

Defined in [`tsconfig.base.json`](tsconfig.base.json):

- `@libs/views`, `@libs/di`, `@libs/utils` (+ `/*` wildcards)

**Vite/webview code** may use `@libs/*` (resolved by `nxViteTsPaths`).

**Electrobun Bun bundle** (`apps/electrobun-desktop/src/bun/`, `src/di/bun/`, `src/rpc/`) **cannot** resolve `@libs/*` at bundle time — use **relative imports** to `libs/` (e.g. `../../../../../../libs/di/src/...`).

### DI bootstrap

[`createDiContainer(extraModules)`](libs/di/src/container.ts) loads `extraModules` first, then shared modules (i18n, theme, vault, recent files, localStorage, logtape). Platform binding must be in `extraModules`.

### UI

- Shared app: [`libs/views/src/App.tsx`](libs/views/src/App.tsx)
- Tailwind v4 entry: [`libs/views/src/index.css`](libs/views/src/index.css) — `@source` must include every app that contributes classes (`electrobun-desktop`, `web-pwa`).

## Commands

```bash
bun install

# Desktop (Electrobun)
bun run dev          # eb-dev-watch
bun run dev:hmr      # Vite HMR + Electrobun (port 5173)
bun run build:canary
bun run build:stable

# Web PWA
bun run dev:web      # http://127.0.0.1:5174
bun run build:web

# Tests
bun run test         # vault-age + archive tests

# Nx directly
bunx nx build electrobun-desktop
bunx nx dev web-pwa
bunx nx graph
```

Electrobun targets use `cwd: apps/electrobun-desktop` — never run `electrobun dev` from repo root without `cwd`.

## Conventions for changes

1. **Minimize scope** — match existing style; no drive-by refactors.
2. **Shared behavior** → `libs/`; **platform I/O** → `apps/<app>/src/platform/`.
3. **Desktop-only Bun/RPC** → `apps/electrobun-desktop/src/di/bun/`, `src/bun/`, `src/rpc/`.
4. **Tests** — `bun test`; existing suites under `vault-age` and `libs/di/src/vault/archive`.
5. **Commits** — only when the user asks; do not push unless asked.
6. **Ports** — electrobun Vite: `127.0.0.1:5173`; web-pwa: `127.0.0.1:5174`. Use IPv4 `127.0.0.1`, not `localhost` (Windows IPv6 mismatch broke HMR).

## Electrobun-specific notes

- Config: [`apps/electrobun-desktop/electrobun.config.ts`](apps/electrobun-desktop/electrobun.config.ts)
- Vite outDir: `dist/apps/electrobun-desktop` — copy paths in electrobun config point here
- HMR: [`apps/electrobun-desktop/src/di/bun/app/provider.ts`](apps/electrobun-desktop/src/di/bun/app/provider.ts) probes `http://127.0.0.1:5173` with retries
- `dev:hmr` runs `kill-port 5173` before start

## Web PWA notes

- Platform API: [`apps/web-pwa/src/platform/browser-platform-api.ts`](apps/web-pwa/src/platform/browser-platform-api.ts)
- Virtual path store for File System Access API / download fallback
- `age-encryption` runs in the webview (not Rust/Bun)

## Common pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| `Bundle failed` / cannot resolve `@libs/*` | Bun bundle in electrobun | Relative imports in bun-side code |
| `Vite not running` with HMR | IPv6-only bind or race | `host: '127.0.0.1'`, retry in provider |
| Port 5173 in use | Stale Vite process | `kill-port 5173` or `dev:hmr` pre-step |
| Tailwind classes missing | Missing `@source` | Add app path to `libs/views/src/index.css` |

## What not to do

- Do not restore monolithic root `src/` layout.
- Do not move `invariant.ts` out of `libs/di` into `libs/utils` (intentional placement).
- Do not add Tauri/mobile scaffolding without explicit user request.
- Do not use `git commit --amend` unless user requests and safety rules allow.

## Key files reference

| Concern | Location |
|---------|----------|
| Vault editor logic | `libs/di/src/vault-editor/provider.ts` |
| Archive implementation | `libs/di/src/vault/archive/` |
| Path/tree helpers | `libs/utils/src/vault/` |
| RPC schema (desktop) | `apps/electrobun-desktop/src/rpc/vault-schema.ts` |
| Message box types | `libs/utils/src/rpc/message-box.ts` |
| Nx project targets | `apps/*/project.json` |
| Root scripts | `package.json` |
