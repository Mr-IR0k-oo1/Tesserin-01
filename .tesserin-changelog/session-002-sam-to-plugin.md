# Session 002 — SAM → Optional Workspace Plugin

**Date:** February 2026  
**Area:** `lib/`, `components/tesserin/`, `src/`  
**Status:** ✅ Complete

---

## What Was Done

### Renamed SAM → Agent across type system
`SAMTool` → `AgentTool`  
`sam:tools` → `agent:tools` permission  

**Files touched:**
- `lib/plugins/types.ts` — renamed interface + permission string
- `lib/plugins/registry.ts` — updated permission checks
- `lib/plugins/index.ts` — updated exports
- `lib/plugin-system.ts` — updated all references

### Added `ai` namespace to `TesserinPluginAPI`
Plugins can now access `pluginAPI.ai.chat()`, `.summarize()`, `.generateTags()`.  
New permission: `"ai:access"`.

### Created `lib/plugins/workspace/sam.ts`
SAM is now an optional WORKSPACE_PLUGIN — not hardcoded into the app shell.  
- Lazy-loads `SAMNode` + `FloatingAIChat` components
- Registers left dock panel
- Registers status bar widget
- Registers `sam.open` command

### Updated app wiring
- `lib/builtin-plugins.ts` — added SAM plugin to `WORKSPACE_PLUGINS`
- `src/App.tsx` — removed hardcoded SAM imports, now driven by plugin registry
- `components/tesserin/workspace/left-dock.tsx` — removed hardcoded SAM tab
- `components/tesserin/core/plugin-provider.tsx` — wired `ai` API namespace
- `components/tesserin/panels/settings-panel.tsx` — removed `features.sam` + `features.floatingChat` toggles
- `lib/tips.ts` — removed SAM-specific tips

---

## Files Changed
| File | Action |
|---|---|
| `lib/plugins/types.ts` | Edited — AgentTool, ai:access, ai namespace |
| `lib/plugins/registry.ts` | Edited — permission rename |
| `lib/plugins/index.ts` | Edited — export rename |
| `lib/plugin-system.ts` | Edited — all SAMTool → AgentTool references |
| `lib/plugins/workspace/sam.ts` | Created |
| `lib/builtin-plugins.ts` | Edited — added SAM plugin |
| `src/App.tsx` | Edited — removed hardcoded SAM |
| `components/tesserin/workspace/left-dock.tsx` | Edited — removed hardcoded SAM tab |
| `components/tesserin/core/plugin-provider.tsx` | Edited — ai API namespace |
| `components/tesserin/panels/settings-panel.tsx` | Edited — removed SAM feature toggles |
| `lib/tips.ts` | Edited — removed SAM tips |

---

## TypeScript Errors After
Zero.
