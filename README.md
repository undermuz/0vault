# 0vault

A cross-platform editor for encrypted vault containers. Store passwords, secrets, notes, and any text files in one or more `.age` files — keep them anywhere safely: in the cloud, on a USB drive, in email, or in a git repo. Without the passphrase, the contents are unreadable.

## Features

- **[age](https://age-encryption.org/) encryption** — `.age` containers are protected with a passphrase (scrypt).
- **Archives** — multiple files and folders inside a single container (packed as ZIP on save).
- **Editor** — file tree, text editor, unsaved-change tracking.
- **Formats** — open `.age`, `.zip`, and plain files; export a single file as a ZIP-based `.age` container.
- **Compatibility** — container format is compatible with the Java `VaultArchive` implementation.

## Applications

| App | Description |
|-----|-------------|
| **electrobun-desktop** | Native desktop app (Windows, macOS, Linux) via [Electrobun](https://electrobun.dev/) |
| **web-pwa** | Browser/PWA build with File System Access API |

## Getting Started

**Requirements:** [Bun](https://bun.sh/), Node.js (for Nx/Vite tooling).

```bash
bun install
```

### Desktop (Electrobun)

```bash
# Development with file watch
bun run dev

# Development with Vite HMR (recommended)
bun run dev:hmr

# Release builds
bun run build:canary
bun run build:stable
```

Open a file on launch (Electrobun passes the path to the main process):

```bash
bun run dev -- /path/to/secrets.age
```

### Web PWA

```bash
bun run dev:web      # http://127.0.0.1:5174
bun run build:web
```

### Tests

```bash
bun run test
```

### Nx

```bash
bunx nx graph
bunx nx build electrobun-desktop
bunx nx dev web-pwa
```

## Usage

1. Click **Open…** or pass a file path as a command-line argument (desktop).
2. For `.age` files, enter the passphrase. An empty `.age` file creates a new empty container.
3. Edit files in the tree on the right: create, rename, delete, or add files from disk.
4. **Save** (`Ctrl+S` / `Cmd+S`) — overwrite the current container (passphrase required).
5. **Save As…** (`Ctrl+Shift+S` / `Cmd+Shift+S`) — write a new `.age` with a chosen passphrase.

### Keyboard Shortcuts

| Action | Keys |
|--------|------|
| Save | `Ctrl+S` / `Cmd+S` |
| Save As | `Ctrl+Shift+S` / `Cmd+Shift+S` |
| Rename | `F2` |
| Delete file | `Delete` |

### Supported Open Scenarios

| File | Behavior |
|------|----------|
| `.age` | Decrypt with passphrase; empty file creates a new container |
| `.zip` | Import as archive; save is suggested to a sibling `.age` |
| Any other | Single file in a container; save to `name.age` alongside |

## Stack

- **Monorepo:** [Nx](https://nx.dev/) 22, Bun
- **Desktop:** Electrobun + Bun (main process, RPC, native dialogs)
- **Web:** Vite, React 19, Tailwind CSS v4, PWA (`vite-plugin-pwa`)
- **Shared:** Inversify (DI), Valtio (UI state), HeroUI
- **Crypto:** `age-encryption`, `fflate` (ZIP inside container)

## Project Structure

```
under0vault/
├── apps/
│   ├── electrobun-desktop/       # Desktop app
│   │   ├── src/
│   │   │   ├── main.tsx          # Webview bootstrap
│   │   │   ├── bun/index.ts      # Bun main entry
│   │   │   ├── di/bun/           # Main-process DI (RPC, age, file I/O)
│   │   │   ├── platform/         # IVaultPlatformApi → Electrobun RPC
│   │   │   └── rpc/              # RPC schema
│   │   ├── electrobun.config.ts
│   │   └── vite.config.mts
│   └── web-pwa/                  # Browser/PWA app
│       ├── src/
│       │   ├── main.tsx
│       │   └── platform/         # IVaultPlatformApi → browser APIs
│       └── vite.config.mts
├── libs/
│   ├── views/                    # React UI (App, components)
│   ├── di/                       # DI container, VaultEditorProvider, platform types
│   └── utils/                    # Vault paths, tree, bytes, archive types
├── types/                        # Global TypeScript shims
├── dist/apps/<app>/              # Vite production output
├── package.json
├── nx.json
└── tsconfig.base.json            # @libs/* path aliases
```

Shared UI and vault logic live in `libs/`. Each app implements [`IVaultPlatformApi`](libs/di/src/platform/types.ts) for its runtime (native RPC, browser file picker, etc.).

## Security

- The passphrase is never written to disk; decryption happens in memory on open and save.
- `.age` writes are atomic on desktop: a temp file in the same directory, then replace the target.
- Use a long, unique passphrase for strong protection; `.age` files can be copied and synced without exposing their contents.

## Development notes

- Desktop Vite dev server: `http://127.0.0.1:5173` (HMR with `dev:hmr`).
- Web PWA dev server: `http://127.0.0.1:5174`.
- AI/agent conventions: see [AGENTS.md](AGENTS.md).

## License

See [LICENSE](LICENSE).
