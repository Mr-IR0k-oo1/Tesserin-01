# Session 004 — MCP Server Security Hardening

**Date:** 2025-03-03  
**Status:** Complete

---

## Summary

Full security audit and hardening pass on the Tesserin MCP server. The server was completely rewritten from scratch to eliminate all identified vulnerabilities.

---

## Changes

### `tesserin-mcp-server/tesserin_server.py` — Full rewrite

| Fix | Detail |
|-----|--------|
| **Fail-fast token check** | `sys.exit(1)` at startup if `TESSERIN_API_TOKEN` is not set |
| **Path traversal prevention** | `_safe_id()` validates all ID parameters against `^[A-Za-z0-9_\-]{1,128}$` |
| **Payload size cap** | `_safe_text()` rejects payloads over 512 KB |
| **HTTP error handling** | All 32 tools: `except httpx.HTTPStatusError` with `exc_info=True` |
| **Bare except hardening** | All 32 tools: bare `except Exception` also with `exc_info=True` |
| **Lifespan hook** | `_lifespan()` via `@contextlib.asynccontextmanager` — closes HTTP client on shutdown |
| **Hex colour validation** | `create_tag` validates color against `^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$` |
| **`max_notes` forwarded** | `get_vault_context` now passes `?maxNotes={n}` to API (was silently ignored) |
| **Priority range validation** | `create_task` and `update_task` validate priority in `(0, 1, 2, 3)` |
| **Tool count** | 32 tools total — all from sessions 001–003 preserved |

### `tesserin-mcp-server/requirements.txt`
- Pinned `mcp[cli]==1.26.0` (was `>=1.2.0`)
- Pinned `httpx==0.28.1` (was `>=0.27.0`)

### `tesserin-mcp-server/Dockerfile`
- Added `--retries 5 --timeout 120` to `pip install` for resilience on slow networks

### `tesserin-mcp-server/.dockerignore` — New file
- Excludes `__pycache__/`, `*.pyc`, `.env*`, `node_modules/`, `release/`, `dist/`, `*.md`

### `tesserin-mcp-server/docker-compose.yml` — New file
- Plug-and-play single `docker compose up -d`
- Uses `host.docker.internal` to reach Tesserin API on host
- `restart: unless-stopped`
- Environment: `TESSERIN_API_TOKEN`, `TESSERIN_API_URL`, `TESSERIN_TIMEOUT`

### `mcp.json` — Phantom tools removed
Removed from both `default` and `readonly` profiles:
- `get_note_by_title` — never existed
- `add_tag_to_note` — never existed
- `batch_create_notes` — never existed

Added all real tools to profiles (32 in default, 15 read-only in readonly).

---

## Smoke Tests

| Test | Result |
|------|--------|
| Empty token → `sys.exit(1)` | PASS — exits with code 1, logs error |
| 32 tools present | PASS |
| `_safe_id`, `_safe_text`, `_HEX_COLOUR_RE`, `_lifespan` present | PASS |
| `exc_info=True` on all errors | PASS |
| `maxNotes` forwarded | PASS |
| Docker build | PASS |

---

## Files Modified This Session

- `tesserin-mcp-server/tesserin_server.py`
- `tesserin-mcp-server/requirements.txt`
- `tesserin-mcp-server/Dockerfile`
- `tesserin-mcp-server/.dockerignore` *(new)*
- `tesserin-mcp-server/docker-compose.yml` *(new)*
- `mcp.json`
