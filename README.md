# 0vault

A desktop editor for encrypted vault containers. Store passwords, secrets, notes, and any text files in one or more `.age` files — keep them anywhere safely: in the cloud, on a USB drive, in email, or in a git repo. Without the passphrase, the contents are unreadable.

## Features

- **[age](https://age-encryption.org/) encryption** — `.age` containers are protected with a passphrase (scrypt).
- **Archives** — multiple files and folders inside a single container (packed as ZIP on save).
- **Editor** — file tree, text editor, unsaved-change tracking.
- **Formats** — open `.age`, `.zip`, and plain files; export a single file as a ZIP-based `.age` container.
- **Compatibility** — container format is compatible with the Java `VaultArchive` implementation.

## Getting Started

```bash
# Install dependencies
bun install

# Development (build + Electrobun)
bun run dev

# Development with HMR (recommended)
bun run dev:hmr

# Canary build
bun run build:canary

# Stable build
bun run build:stable

# Tests
bun test
```

Open a file on launch:

```bash
bun run dev -- /path/to/secrets.age
```

## Usage

1. Click **Open…** or pass a file path as a command-line argument.
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

- [Electrobun](https://electrobun.dev/) + Bun — native window and file I/O
- React, Tailwind CSS, Vite (HMR)
- `age-encryption` — encryption
- `fflate` — ZIP inside the container
- Inversify — DI, Valtio — UI state

## Project Structure

```
├── src/
│   ├── bun/
│   │   ├── index.ts          # Main process: RPC, dialogs, age
│   │   └── vaultAge.ts       # Encrypt / decrypt
│   ├── mainview/             # React UI
│   ├── vault/                # VaultArchive, tree, dirty-tracking
│   ├── di/                   # VaultEditorProvider
│   └── rpc/                  # Webview ↔ Bun RPC schema
├── electrobun.config.ts
├── vite.config.ts
└── package.json
```

## Security

- The passphrase is never written to disk; decryption happens in memory on open and save.
- `.age` writes are atomic: a temp file in the same directory, then replace the target.
- Use a long, unique passphrase for strong protection; `.age` files can be copied and synced without exposing their contents.
