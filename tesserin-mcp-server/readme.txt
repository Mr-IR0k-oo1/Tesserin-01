# Tesserin MCP Server

A Model Context Protocol (MCP) server that bridges Claude Desktop to the Tesserin
AI-native knowledge workspace. It exposes Tesserin's vault — notes, tasks, tags,
folders, knowledge graph, AI tools — as MCP tools accessible via Docker MCP Toolkit.

## Purpose

This MCP server provides a secure interface for AI assistants (Claude Desktop,
Claude Code, Gemini CLI, Codex, OpenCode) to read, write, search, and analyze
your Tesserin vault without leaving the chat interface. It connects to the
Tesserin REST API running inside your desktop app.

## Features

### Notes
- **`list_notes`** — List all notes in the vault with titles, IDs, and timestamps
- **`get_note`** — Get the full content of a specific note by its ID
- **`search_notes`** — Search notes by title or content with snippet results
- **`create_note`** — Create a new markdown note with title, content, and folder
- **`update_note`** — Update an existing note's title or content
- **`delete_note`** — Delete a note from the vault

### Tags
- **`list_tags`** — List all tags in the vault
- **`create_tag`** — Create a new tag with name and color

### Tasks / Kanban
- **`list_tasks`** — List all kanban tasks with status, priority, and due dates
- **`create_task`** — Create a new task with column, priority, and due date
- **`update_task`** — Update a task's status, column, priority, or due date

### Folders
- **`list_folders`** — List all folders in the vault hierarchy
- **`create_folder`** — Create a new folder with optional parent

### Knowledge Graph
- **`get_knowledge_graph`** — Get the complete graph: nodes, wiki-link edges, tag-shared edges
- **`search_vault_context`** — Search with RAG-ready context chunks, tags, and linked notes
- **`get_vault_context`** — Get the vault formatted for AI system prompt injection
- **`export_vault`** — Export the entire vault as structured JSON
- **`get_note_with_connections`** — Get a note with outgoing links, backlinks, and shared tags

### AI (Ollama)
- **`ai_chat`** — Send a message to Tesserin's local AI (Ollama)
- **`ai_summarize`** — Summarize text using the local AI
- **`ai_generate_tags`** — Generate suggested tags for content

### Utility
- **`list_templates`** — List all reusable note templates
- **`get_vault_summary`** — Quick vault stats: note/tag/task/folder counts + recent notes
- **`check_health`** — Verify the Tesserin API server is running and accessible

## Prerequisites

- Docker Desktop with MCP Toolkit enabled
- Docker MCP CLI plugin (`docker mcp` command)
- Tesserin desktop app running with the API server enabled (Settings → API)
- A Tesserin API key (generated from Settings → API in the desktop app)

## Installation

See the step-by-step instructions provided with the files.

## Usage Examples

In Claude Desktop, you can ask:

- "Show me all my notes in Tesserin"
- "Search my vault for notes about machine learning"
- "Create a new note titled 'Meeting Notes — Sprint 42' with agenda items"
- "What are my current tasks and their priorities?"
- "Show me the knowledge graph of my vault"
- "Summarize the note about quantum computing"
- "Find all notes connected to my 'Research' note"
- "Create a task 'Review PR #123' with high priority due tomorrow"
- "Export my entire vault as JSON"
- "What tags do I have in my vault?"
- "Create a folder called 'Projects' under my root"
- "Ask SAM to brainstorm ideas about productivity systems"

## Architecture

```
Claude Desktop → MCP Gateway → Tesserin MCP Server (Docker) → Tesserin REST API → SQLite (Local)
                                       ↓
                               Docker Desktop Secrets
                              (TESSERIN_API_TOKEN)
```

The MCP server runs as a Docker container and communicates with the Tesserin
desktop app's REST API over the host network. All data stays local — the
Docker container has no persistent storage and acts as a stateless bridge.

### Data Flow

1. Claude Desktop sends a tool call via MCP protocol (stdio)
2. Docker MCP Gateway routes it to the Tesserin MCP container
3. The Python MCP server translates the call to an HTTP request
4. Tesserin's REST API authenticates with the API key and executes against SQLite
5. Results flow back through the same chain to Claude Desktop

### Security

- API key authentication on every request (Bearer token)
- Container runs as non-root user (mcpuser, UID 1000)
- API server only binds to 127.0.0.1 (localhost)
- Rate limiting: 60 requests/minute per client
- Docker Desktop Secrets for API key storage (never in plaintext)
- No persistent storage in the container

## Development

### Local Testing

```bash
# Set environment variables for testing
export TESSERIN_API_TOKEN="tsk_your_api_key_here"
export TESSERIN_API_URL="http://localhost:9960"

# Run directly
python tesserin_server.py

# Test MCP protocol
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python tesserin_server.py
```

### Adding New Tools

1. Add the function to `tesserin_server.py`
2. Decorate with `@mcp.tool()`
3. Use SINGLE-LINE docstrings only
4. Use empty string defaults (`param: str = ""`) never None
5. Return a formatted string with emoji indicators
6. Update the catalog entry with the new tool name
7. Rebuild the Docker image: `docker build -t tesserin-mcp-server .`

### Project Structure

```
tesserin-mcp-server/
├── Dockerfile              # Python 3.11-slim container
├── requirements.txt        # mcp[cli], httpx
├── tesserin_server.py      # MCP server (all tools)
├── readme.txt              # This file
└── CLAUDE.md               # Implementation details
```

## Troubleshooting

### "Cannot connect to Tesserin"
1. Make sure Tesserin desktop app is running
2. Enable the API server: Settings → API → Enable API Server
3. Check the port (default: 9960): Settings → API → Port
4. From Docker, the host is `host.docker.internal` not `localhost`

### "Invalid or expired API key"
1. Generate a new API key: Settings → API → Generate Key
2. Set it as a Docker MCP secret: `docker mcp secret set TESSERIN_API_TOKEN="tsk_..."`

### "Rate limit exceeded"
The API allows 60 requests/minute. Wait a moment and try again.

### "Ollama AI not responding"
AI tools require Ollama running locally. Install from https://ollama.ai and
pull a model: `ollama pull llama3.2`

## License

MIT — same as Tesserin.
