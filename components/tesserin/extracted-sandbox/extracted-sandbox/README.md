# Extracted WebContainer Sandbox Engine

A fully self-contained, plug-and-play browser IDE powered by `@webcontainer/api`. Includes a code editor (CodeMirror 6), terminal (XTerm.js), file tree, live preview, diff view, and a built-in AI action runner for LLM-driven file modifications and shell executions.

Extracted from the Forge application — ready to drop into any React project.

---

## Architecture

```
src/
├── components/
│   ├── editor/codemirror/    # CodeMirror 6 editor with themes, syntax, env masking
│   ├── workbench/            # Main IDE shell (13 components)
│   │   ├── Workbench.client.tsx   # Root orchestrator
│   │   ├── EditorPanel.tsx        # Code editing panel
│   │   ├── Preview.tsx            # Live browser preview iframe
│   │   ├── FileTree.tsx           # Virtual file system browser
│   │   ├── DiffView.tsx           # Side-by-side diff viewer
│   │   ├── Search.tsx             # File search
│   │   ├── LockManager.tsx        # File locking UI
│   │   ├── Inspector.tsx          # Element inspector
│   │   └── terminal/              # XTerm.js terminal tabs
│   └── ui/                   # 42 reusable UI primitives (Radix-based)
├── lib/
│   ├── api/                  # Notifications, cookies, feature flags
│   ├── runtime/              # AI Action Runner + Message Parser
│   ├── stores/               # Nano stores (workbench, files, editor, terminal, etc.)
│   ├── persistence/          # File locking persistence
│   └── webcontainer/         # WebContainer boot & initialization
├── types/                    # TypeScript definitions
└── utils/                    # Shell, diff, markdown, logging, templates
```

---

## Prerequisites

- **Node.js** 18+ and **pnpm** (or npm/yarn)
- **React 18+** (peer dependency)
- A bundler that supports `import.meta.env` (Vite, Next.js, Remix, etc.)
- SCSS support (the `sass` package is included in devDependencies)

---

## Step-by-Step Integration Guide

### Step 1: Copy & Install

```bash
# Copy the extracted-sandbox folder into your project root
cp -r extracted-sandbox /path/to/your-project/

# Install all dependencies
cd /path/to/your-project/extracted-sandbox
pnpm install
```

### Step 2: Configure CORS Headers (REQUIRED)

WebContainers use `SharedArrayBuffer` which requires cross-origin isolation. Without these headers, **the sandbox will not boot**.

#### Vite

Install the plugin:
```bash
pnpm add -D vite-plugin-cross-origin-isolation
```

```ts
// vite.config.ts
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';

export default defineConfig({
  plugins: [react(), crossOriginIsolation()],
});
```

#### Next.js

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};
```

#### Remix / Express

```ts
// server.ts or entry.server.tsx
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
```

### Step 3: Configure SCSS Support

The `BackgroundRays` component uses SCSS modules. Ensure your bundler supports it:

```bash
# Already in devDependencies, but if you need it in your project:
pnpm add -D sass
```

Vite handles `.module.scss` out of the box if `sass` is installed. For Next.js, SCSS is also supported natively.

### Step 4: Mount the Workbench

```tsx
// App.tsx or any page component
import { Workbench } from './extracted-sandbox/src/components/workbench/Workbench.client';

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Workbench chatStarted={true} />
    </div>
  );
}
```

> **Note:** The `chatStarted` prop controls whether the workbench is visible. Set it to `true` to show the IDE immediately.

### Step 5: Load Files into the Virtual File System

```ts
import { workbenchStore } from './extracted-sandbox/src/lib/stores/workbench';

// Load a full project into the WebContainer
workbenchStore.setDocuments({
  'index.js': {
    type: 'file',
    content: 'console.log("Hello WebContainers!");',
    isBinary: false,
  },
  'package.json': {
    type: 'file',
    content: JSON.stringify({
      name: 'my-app',
      type: 'module',
      scripts: { start: 'node index.js' },
    }, null, 2),
    isBinary: false,
  },
});
```

### Step 6: Use the AI Action Runner (Optional)

The engine includes a built-in action runner that parses LLM streaming output and executes file write/shell commands inside the WebContainer:

```ts
import { workbenchStore } from './extracted-sandbox/src/lib/stores/workbench';

// Register an artifact (triggers the ActionRunner)
workbenchStore.addArtifact(
  { messageId: 'msg-1', id: 'artifact-1', title: 'My App' },
);

// Add individual actions (file writes, shell commands)
workbenchStore.addAction({
  messageId: 'msg-1',
  artifactId: 'artifact-1',
  actionId: 'action-1',
  action: {
    type: 'file',
    filePath: '/src/app.js',
    content: 'export default function App() { return "Hello!"; }',
  },
});

// Run all queued actions
workbenchStore.runAction({ messageId: 'msg-1', artifactId: 'artifact-1', actionId: 'action-1' });
```

### Step 7: Access Terminal & Preview

The terminal and preview are managed automatically by the Workbench component. You can also interact with them programmatically:

```ts
import { workbenchStore } from './extracted-sandbox/src/lib/stores/workbench';

// Toggle terminal visibility
workbenchStore.toggleTerminal(true);

// Switch views
workbenchStore.currentView.set('preview');  // 'code' | 'preview'
```

---

## What's Included

| Layer | Count | Description |
|-------|-------|-------------|
| **Workbench UI** | 13 components | Full IDE: editor, preview, file tree, terminal, diff, search |
| **Editor** | CodeMirror 6 | Syntax for 14 languages, env masking, themes |
| **Terminal** | XTerm.js | Multiple tabs, process management |
| **UI Primitives** | 42 components | Radix-based: buttons, dialogs, tooltips, tabs, etc. |
| **Stores** | 10 nano stores | Workbench, files, editor, terminal, theme, previews, logs |
| **AI Runtime** | Action Runner | LLM message parser, file/shell action execution |
| **WebContainer** | Boot logic | `@webcontainer/api` initialization |
| **Utilities** | 31 modules | Shell, diff, markdown, logging, templates |
| **Types** | 14 definitions | Actions, artifacts, models, themes, terminals |

## What's NOT Included (Forge-Specific)

Removed to keep the engine generic and reusable:

- Chat UI and streaming stores
- GitHub/GitLab/Vercel/Netlify deployment integrations
- Supabase authentication
- LLM provider management (stubbed with empty arrays)
- Settings/preferences store
- MCP (Model Context Protocol) store

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@webcontainer/api` | Browser-based Node.js runtime |
| `@codemirror/*` | Code editor framework (6 packages) |
| `@xterm/xterm` | Terminal emulator |
| `nanostores` | Reactive state management |
| `@radix-ui/*` | Accessible UI primitives (11 packages) |
| `framer-motion` | Animations and transitions |
| `shiki` | Code syntax highlighting |
| `jszip` + `file-saver` | Project export/download |
| `lucide-react` | Icon library |
| `react-resizable-panels` | Resizable IDE panels |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sandbox won't boot | Check CORS headers — `SharedArrayBuffer` requires cross-origin isolation |
| SCSS import errors | Install `sass` as a dev dependency |
| Type errors with `import.meta` | The `src/env.d.ts` file should handle this — ensure your tsconfig includes it |
| CodeMirror type conflicts | These are version-resolution artifacts; `@ts-nocheck` is applied where needed |
| `react` not found | React is a peer dependency — install it in your host project |

## Notes

- Uses `import.meta.env` and `import.meta.hot` (Vite conventions). `env.d.ts` provides type shims.
- React 18+ is required as a peer dependency.
- The engine is framework-agnostic for the host app — works with Vite, Next.js, Remix, or any React setup.
