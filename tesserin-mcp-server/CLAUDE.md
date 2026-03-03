# CLAUDE.md — Tesserin MCP Server Implementation Guide

## Overview

This is a Python-based MCP (Model Context Protocol) server that acts as a bridge
between Claude Desktop (via Docker MCP Toolkit) and the Tesserin desktop app's
REST API. It translates MCP tool calls into HTTP requests against Tesserin's
local API server.

## Critical Implementation Rules

### DO NOT

- Use `@mcp.prompt()` decorators — they break Claude Desktop
- Use `prompt` parameter in `FastMCP()` — they break Claude Desktop
- Use type hints from `typing` module — no `Optional`, `Union`, `List[str]`
- Use `param: str = None` — always use `param: str = ""`
- Use multi-line docstrings — they cause gateway panic errors
- Return non-string values from tools — always return formatted strings

### ALWAYS

- Use single-line docstrings on all tools
- Default parameters to empty strings (`""`)
- Return formatted strings with emoji indicators (✅ ❌ 🔍 📊 etc.)
- Log to stderr via the `logging` module
- Handle errors gracefully with user-friendly messages
- Run in Docker with a non-root user

## Architecture

```
Claude Desktop
     │ (stdio)
     ▼
Docker MCP Gateway
     │ (stdio)
     ▼
tesserin_server.py (this server, Python 3.11, in Docker)
     │ (HTTP/REST)
     ▼
Tesserin Desktop App → api-server.ts → database.ts → SQLite
```

## Environment Variables

| Variable              | Default                              | Description                         |
|-----------------------|--------------------------------------|-------------------------------------|
| `TESSERIN_API_TOKEN`  | `""` (empty — will warn on startup)  | API key from Tesserin Settings → API |
| `TESSERIN_API_URL`    | `http://host.docker.internal:9960`   | Tesserin REST API base URL          |

## Tool Categories

### Notes (CRUD)
- `list_notes` → GET /api/notes
- `get_note(note_id)` → GET /api/notes/:id
- `search_notes(query)` → GET /api/notes/search/:query
- `create_note(title, content, folder_id)` → POST /api/notes
- `update_note(note_id, title, content)` → PUT /api/notes/:id
- `delete_note(note_id)` → DELETE /api/notes/:id

### Tags
- `list_tags` → GET /api/tags
- `create_tag(name, color)` → POST /api/tags

### Tasks / Kanban
- `list_tasks` → GET /api/tasks
- `create_task(title, column_id, priority, due_date, note_id)` → POST /api/tasks
- `update_task(task_id, title, status, column_id, priority, due_date)` → PUT /api/tasks/:id

### Folders
- `list_folders` → GET /api/folders
- `create_folder(name, parent_id)` → POST /api/folders

### Knowledge Graph
- `get_knowledge_graph` → GET /api/knowledge/graph
- `search_vault_context(query, max_chunks)` → POST /api/knowledge/search
- `get_vault_context(max_notes)` → GET /api/knowledge/context
- `export_vault` → GET /api/knowledge/export
- `get_note_with_connections(note_id)` → GET /api/knowledge/note/:id/connections

### AI (Ollama)
- `ai_chat(message, model)` → POST /api/ai/chat
- `ai_summarize(text, model)` → POST /api/ai/summarize
- `ai_generate_tags(text, model)` → POST /api/ai/generate-tags

### Utility
- `list_templates` → GET /api/templates
- `get_vault_summary` → GET /api/vault/summary
- `check_health` → GET /api/health

## API Authentication

All requests include the header:
```
Authorization: Bearer <TESSERIN_API_TOKEN>
```

The API key is generated inside the Tesserin desktop app at Settings → API.
It's stored as a Docker MCP secret and injected as an environment variable.

## Error Handling Pattern

Every tool follows this pattern:
```python
@mcp.tool()
async def tool_name(param: str = "") -> str:
    """Single-line description of the tool."""
    if not param.strip():
        return "❌ Error: param is required"
    try:
        data = await api_get(f"/api/endpoint/{param}")
        return f"✅ Result: {formatted_output}"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Not found: {param}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        return f"❌ Error: {str(e)}"
```

## Tesserin REST API Reference

The server connects to these Tesserin API endpoints:

- `GET /api/health` — Health check + capabilities
- `GET /api/vault/summary` — Vault statistics
- `GET /api/notes` — List all notes
- `GET /api/notes/:id` — Get a note
- `GET /api/notes/search/:query` — Search notes
- `POST /api/notes` — Create a note
- `PUT /api/notes/:id` — Update a note
- `DELETE /api/notes/:id` — Delete a note
- `GET /api/tags` — List tags
- `POST /api/tags` — Create a tag
- `GET /api/tasks` — List tasks
- `POST /api/tasks` — Create a task
- `PUT /api/tasks/:id` — Update a task
- `GET /api/folders` — List folders
- `POST /api/folders` — Create a folder
- `GET /api/templates` — List templates
- `GET /api/knowledge/graph` — Full knowledge graph
- `GET /api/knowledge/context` — Vault as AI context text
- `POST /api/knowledge/search` — RAG-style context search
- `GET /api/knowledge/export` — Full vault export (JSON)
- `GET /api/knowledge/note/:id/connections` — Note with graph connections
- `POST /api/ai/chat` — Chat with Ollama
- `POST /api/ai/summarize` — Summarize text
- `POST /api/ai/generate-tags` — Auto-generate tags

## Permissions

The API key's permissions control which endpoints are accessible:
- `notes:read` — Read notes, tags, folders, templates, vault summary, knowledge graph
- `notes:write` — Create/update/delete notes, tags, folders
- `tasks:read` — Read tasks
- `tasks:write` — Create/update/delete tasks
- `ai:use` — Use AI endpoints (chat, summarize, generate-tags)
- `*` — Full access (all permissions)

## Testing

```bash
# Direct (outside Docker):
export TESSERIN_API_TOKEN="tsk_your_key"
export TESSERIN_API_URL="http://localhost:9960"
python tesserin_server.py

# MCP protocol test:
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python tesserin_server.py

# Docker:
docker build -t tesserin-mcp-server .
docker run --rm -i -e TESSERIN_API_TOKEN="tsk_your_key" tesserin-mcp-server
```

## Version History

- **1.0.0** (2026-03-03) — Initial release with 22 tools covering notes, tags,
  tasks, folders, knowledge graph, AI, templates, and health check.
