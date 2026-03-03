# Session 003 — MCP Improvements + Settings Cleanup

**Date:** March 3, 2026  
**Area:** `tesserin-mcp-server/tesserin_server.py`, `components/tesserin/panels/settings-panel.tsx`  
**Status:** ✅ Complete

---

## MCP Server Improvements

### Persistent HTTP Client
Replaced per-request `async with httpx.AsyncClient()` pattern with a module-level
singleton `_client` + `_get_client()` factory.  
One TCP connection pool per process instead of a fresh handshake on every tool call.

```python
_client: httpx.AsyncClient | None = None

def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=TESSERIN_API_URL, headers={...}, timeout=REQUEST_TIMEOUT)
    return _client
```

### `_http_error()` Helper
Centralised HTTP status error → human-readable message:
- 401 → "check TESSERIN_API_TOKEN"
- 403 → "key lacks permission"
- 404 → "resource doesn't exist"
- 422 → "check fields"
- 429 → "rate limited"
- 5xx → "check if desktop app is running"

### 8 New MCP Tools Added (32 total)

| Tool | Description |
|---|---|
| `append_to_note(note_id, content)` | Appends text to a note without overwriting existing content |
| `pin_note(note_id, pinned)` | Pins or unpins a note |
| `archive_note(note_id, archived)` | Archives or unarchives a note |
| `get_recent_notes(limit)` | Returns N most recently updated notes |
| `delete_task(task_id)` | Permanently deletes a kanban task |
| `delete_tag(tag_id)` | Permanently deletes a global tag |
| `delete_folder(folder_id)` | Deletes a folder (notes inside are unfoldered, not deleted) |
| `ai_suggest_links(content, model)` | Suggests [[wiki-links]] using Tesserin's local AI |

---

## Settings Panel Reorganization

### Before — 14 flat sections (no grouping, messy order)
```
general → editor → ai → mcp → api → agents → appearance → themes →
features → vault → plugins → marketplace → shortcuts → about
```
Problems:
- "AI / SAM" label referred to removed SAM system
- `sam` still listed as startup tab option
- Three unrelated connection sections (mcp, api, agents) scattered
- plugins and marketplace split far from ai
- themes split from appearance
- Build date wrong ("February 2026")
- Features tip mentioned removed "Floating Chat"
- No visual grouping whatsoever

### After — 14 sections in 4 labelled groups
```
WORKSPACE      General · Editor · Appearance · Themes · Shortcuts
INTELLIGENCE   AI · Features · Plugins · Marketplace
CONNECTIONS    MCP Servers · Cloud Agents · API Access
DATA           Vault & Data · About
```

### Specific Fixes
| Fix | Before | After |
|---|---|---|
| AI section label | "AI / SAM" | "AI" |
| AI section heading | "AI / SAM" | "AI" |
| Startup tab options | included "SAM" | removed |
| Build date | "February 2026" | "March 2026" |
| Features tip text | mentioned "Floating Chat" | updated to "Templates, References" |
| Sidebar nav | flat list, no headers | group label headers per group |
| MCP label | "MCP" | "MCP Servers" |
| API label | "API" | "API Access" |

### Nav Sidebar Changes
```tsx
// Group header rendered before each section that has a `group` property
{section.group && (
  <div className="px-2 pt-4 pb-1">
    <span className="text-[9px] font-bold uppercase tracking-widest" ...>
      {section.group}
    </span>
  </div>
)}
```

---

## Files Changed
| File | Action |
|---|---|
| `tesserin-mcp-server/tesserin_server.py` | Edited — persistent client, _http_error, 8 new tools |
| `components/tesserin/panels/settings-panel.tsx` | Edited — SECTIONS reorder, group headers, label fixes, date fix |

## TypeScript Errors After
Zero.
