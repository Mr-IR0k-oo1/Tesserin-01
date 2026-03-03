#!/usr/bin/env python3
"""Simple Tesserin MCP Server - AI-native knowledge workspace bridge for Claude Desktop via Docker MCP."""
import os
import sys
import json
import logging
from datetime import datetime, timezone
import httpx
from mcp.server.fastmcp import FastMCP

# Configure logging to stderr
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("tesserin-server")

# Initialize MCP server - NO PROMPT PARAMETER!
mcp = FastMCP("tesserin")

# Configuration
TESSERIN_API_TOKEN = os.environ.get("TESSERIN_API_TOKEN", "")
TESSERIN_API_URL = os.environ.get("TESSERIN_API_URL", "http://host.docker.internal:9960")
REQUEST_TIMEOUT = 15


# === UTILITY FUNCTIONS ===

def get_headers():
    """Build auth headers for Tesserin API requests."""
    return {
        "Authorization": f"Bearer {TESSERIN_API_TOKEN}",
        "Content-Type": "application/json",
    }


async def api_get(endpoint: str = ""):
    """Make a GET request to the Tesserin REST API."""
    url = f"{TESSERIN_API_URL}{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers(), timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()


async def api_post(endpoint: str = "", body: dict = None):
    """Make a POST request to the Tesserin REST API."""
    url = f"{TESSERIN_API_URL}{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=get_headers(), json=body or {}, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()


async def api_put(endpoint: str = "", body: dict = None):
    """Make a PUT request to the Tesserin REST API."""
    url = f"{TESSERIN_API_URL}{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=get_headers(), json=body or {}, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()


async def api_delete(endpoint: str = ""):
    """Make a DELETE request to the Tesserin REST API."""
    url = f"{TESSERIN_API_URL}{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=get_headers(), timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()


def format_note(note: dict) -> str:
    """Format a single note for display."""
    title = note.get("title", "Untitled")
    nid = note.get("id", "unknown")
    content = note.get("content", "")
    created = note.get("created_at", "")
    updated = note.get("updated_at", "")
    pinned = "📌 " if note.get("is_pinned") else ""
    archived = "📦 " if note.get("is_archived") else ""
    snippet = content[:300] + "…" if len(content) > 300 else content
    return f"{pinned}{archived}**{title}**\nID: {nid}\nCreated: {created} | Updated: {updated}\n\n{snippet}"


def format_notes_list(notes: list) -> str:
    """Format a list of notes as a readable summary."""
    if not notes:
        return "📭 No notes found."
    lines = []
    for i, n in enumerate(notes, 1):
        pinned = "📌 " if n.get("is_pinned") else ""
        title = n.get("title", "Untitled")
        nid = n.get("id", "?")
        updated = n.get("updated_at", "")
        lines.append(f"{i}. {pinned}**{title}** (id: {nid}) — updated {updated}")
    return f"📝 {len(notes)} note(s):\n\n" + "\n".join(lines)


def format_tasks_list(tasks: list) -> str:
    """Format a list of tasks for display."""
    if not tasks:
        return "📭 No tasks found."
    priority_map = {0: "—", 1: "🟢 Low", 2: "🟡 Medium", 3: "🔴 High"}
    lines = []
    for i, t in enumerate(tasks, 1):
        title = t.get("title", "Untitled")
        tid = t.get("id", "?")
        status = t.get("status", "backlog")
        pri = priority_map.get(t.get("priority", 0), "—")
        due = t.get("due_date") or "No due date"
        lines.append(f"{i}. **{title}** (id: {tid})\n   Status: {status} | Priority: {pri} | Due: {due}")
    return f"✅ {len(tasks)} task(s):\n\n" + "\n".join(lines)


# === MCP TOOLS — NOTES ===

@mcp.tool()
async def list_notes() -> str:
    """List all notes in the Tesserin vault with titles, IDs, and timestamps."""
    logger.info("Executing list_notes")
    try:
        data = await api_get("/api/notes")
        notes = data.get("notes", [])
        return format_notes_list(notes)
    except httpx.HTTPStatusError as e:
        logger.error(f"API error: {e}")
        return f"❌ API Error ({e.response.status_code}): Could not list notes. Is Tesserin running with the API server enabled?"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def get_note(note_id: str = "") -> str:
    """Get the full content of a specific note by its ID."""
    logger.info(f"Executing get_note with id={note_id}")
    if not note_id.strip():
        return "❌ Error: note_id is required"
    try:
        data = await api_get(f"/api/notes/{note_id.strip()}")
        note = data.get("note", {})
        if not note:
            return f"❌ Note not found: {note_id}"
        return f"📄 Note Details:\n\n{format_note(note)}"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Note not found: {note_id}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def search_notes(query: str = "") -> str:
    """Search notes by title or content and return matching results with snippets."""
    logger.info(f"Executing search_notes with query={query}")
    if not query.strip():
        return "❌ Error: query is required"
    try:
        data = await api_get(f"/api/notes/search/{query.strip()}")
        results = data.get("results", [])
        if not results:
            return f"🔍 No notes found matching: \"{query}\""
        lines = []
        for i, r in enumerate(results, 1):
            title = r.get("title", "Untitled")
            rid = r.get("id", "?")
            snippet = r.get("snippet", "")[:150]
            lines.append(f"{i}. **{title}** (id: {rid})\n   {snippet}")
        return f"🔍 {len(results)} result(s) for \"{query}\":\n\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def create_note(title: str = "", content: str = "", folder_id: str = "") -> str:
    """Create a new markdown note in the Tesserin vault."""
    logger.info(f"Executing create_note with title={title}")
    if not title.strip():
        return "❌ Error: title is required"
    try:
        body = {"title": title.strip(), "content": content}
        if folder_id.strip():
            body["folderId"] = folder_id.strip()
        data = await api_post("/api/notes", body)
        note = data.get("note", {})
        nid = note.get("id", "unknown")
        return f"✅ Note created successfully!\n\n📄 Title: {title}\n🆔 ID: {nid}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error creating note: {str(e)}"


@mcp.tool()
async def update_note(note_id: str = "", title: str = "", content: str = "") -> str:
    """Update an existing note's title or content by its ID."""
    logger.info(f"Executing update_note with id={note_id}")
    if not note_id.strip():
        return "❌ Error: note_id is required"
    try:
        body = {}
        if title.strip():
            body["title"] = title.strip()
        if content.strip():
            body["content"] = content
        if not body:
            return "❌ Error: provide at least a new title or content"
        data = await api_put(f"/api/notes/{note_id.strip()}", body)
        return f"✅ Note updated successfully (id: {note_id})"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Note not found: {note_id}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def delete_note(note_id: str = "") -> str:
    """Delete a note from the vault by its ID."""
    logger.info(f"Executing delete_note with id={note_id}")
    if not note_id.strip():
        return "❌ Error: note_id is required"
    try:
        await api_delete(f"/api/notes/{note_id.strip()}")
        return f"✅ Note deleted successfully (id: {note_id})"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Note not found: {note_id}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — TAGS ===

@mcp.tool()
async def list_tags() -> str:
    """List all tags in the Tesserin vault."""
    logger.info("Executing list_tags")
    try:
        data = await api_get("/api/tags")
        tags = data.get("tags", [])
        if not tags:
            return "🏷️ No tags found."
        lines = [f"- **{t.get('name', '?')}** (id: {t.get('id', '?')}, color: {t.get('color', '#6366f1')})" for t in tags]
        return f"🏷️ {len(tags)} tag(s):\n\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def create_tag(name: str = "", color: str = "#6366f1") -> str:
    """Create a new tag in the vault with a name and optional hex color."""
    logger.info(f"Executing create_tag with name={name}")
    if not name.strip():
        return "❌ Error: name is required"
    try:
        body = {"name": name.strip()}
        if color.strip():
            body["color"] = color.strip()
        data = await api_post("/api/tags", body)
        tag = data.get("tag", {})
        return f"✅ Tag created: **{tag.get('name', name)}** (id: {tag.get('id', '?')}, color: {tag.get('color', color)})"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — TASKS ===

@mcp.tool()
async def list_tasks() -> str:
    """List all kanban tasks in the Tesserin vault with status, priority, and due dates."""
    logger.info("Executing list_tasks")
    try:
        data = await api_get("/api/tasks")
        tasks = data.get("tasks", [])
        return format_tasks_list(tasks)
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def create_task(title: str = "", column_id: str = "backlog", priority: str = "0", due_date: str = "", note_id: str = "") -> str:
    """Create a new kanban task with title, column, priority (0-3), and optional due date."""
    logger.info(f"Executing create_task with title={title}")
    if not title.strip():
        return "❌ Error: title is required"
    try:
        pri = int(priority) if priority.strip() else 0
    except ValueError:
        return f"❌ Error: invalid priority value '{priority}'. Use 0=none, 1=low, 2=medium, 3=high"
    try:
        body = {"title": title.strip(), "columnId": column_id.strip() or "backlog", "priority": pri}
        if due_date.strip():
            body["dueDate"] = due_date.strip()
        if note_id.strip():
            body["noteId"] = note_id.strip()
        data = await api_post("/api/tasks", body)
        task = data.get("task", {})
        return f"✅ Task created: **{task.get('title', title)}** (id: {task.get('id', '?')})\n   Column: {column_id} | Priority: {pri}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def update_task(task_id: str = "", title: str = "", status: str = "", column_id: str = "", priority: str = "", due_date: str = "") -> str:
    """Update a kanban task's properties like title, status, column, priority, or due date."""
    logger.info(f"Executing update_task with id={task_id}")
    if not task_id.strip():
        return "❌ Error: task_id is required"
    try:
        body = {}
        if title.strip():
            body["title"] = title.strip()
        if status.strip():
            body["status"] = status.strip()
        if column_id.strip():
            body["columnId"] = column_id.strip()
        if priority.strip():
            try:
                body["priority"] = int(priority)
            except ValueError:
                return f"❌ Error: invalid priority value '{priority}'"
        if due_date.strip():
            body["dueDate"] = due_date.strip()
        if not body:
            return "❌ Error: provide at least one field to update"
        data = await api_put(f"/api/tasks/{task_id.strip()}", body)
        return f"✅ Task updated successfully (id: {task_id})"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Task not found: {task_id}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — FOLDERS ===

@mcp.tool()
async def list_folders() -> str:
    """List all folders in the Tesserin vault hierarchy."""
    logger.info("Executing list_folders")
    try:
        data = await api_get("/api/folders")
        folders = data.get("folders", [])
        if not folders:
            return "📁 No folders found."
        lines = [f"- **{f.get('name', '?')}** (id: {f.get('id', '?')}, parent: {f.get('parent_id', 'root')})" for f in folders]
        return f"📁 {len(folders)} folder(s):\n\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def create_folder(name: str = "", parent_id: str = "") -> str:
    """Create a new folder in the vault hierarchy with optional parent folder."""
    logger.info(f"Executing create_folder with name={name}")
    if not name.strip():
        return "❌ Error: name is required"
    try:
        body = {"name": name.strip()}
        if parent_id.strip():
            body["parentId"] = parent_id.strip()
        data = await api_post("/api/folders", body)
        folder = data.get("folder", {})
        return f"✅ Folder created: **{folder.get('name', name)}** (id: {folder.get('id', '?')})"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — KNOWLEDGE GRAPH ===

@mcp.tool()
async def get_knowledge_graph() -> str:
    """Get the complete knowledge graph with all note nodes, wiki-link edges, and tag-shared edges."""
    logger.info("Executing get_knowledge_graph")
    try:
        data = await api_get("/api/knowledge/graph")
        graph = data.get("graph", {})
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        meta = graph.get("metadata", {})
        summary = f"🕸️ Knowledge Graph:\n\n"
        summary += f"📊 Stats: {meta.get('noteCount', 0)} notes | {meta.get('edgeCount', 0)} edges | {meta.get('tagCount', 0)} tags | {meta.get('folderCount', 0)} folders\n\n"
        if nodes:
            summary += "**Top Nodes (by connections):**\n"
            sorted_nodes = sorted(nodes, key=lambda n: n.get("linkCount", 0), reverse=True)[:15]
            for n in sorted_nodes:
                tags = ", ".join(n.get("tags", [])[:3]) or "no tags"
                summary += f"- **{n.get('title', '?')}** — {n.get('linkCount', 0)} connections [{tags}]\n"
        if edges:
            wiki_links = [e for e in edges if e.get("type") == "wiki-link"]
            tag_shared = [e for e in edges if e.get("type") == "tag-shared"]
            summary += f"\n**Edges:** {len(wiki_links)} wiki-links | {len(tag_shared)} tag-shared connections"
        return summary
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def search_vault_context(query: str = "", max_chunks: str = "10") -> str:
    """Search the vault and return context-rich RAG chunks with note content, tags, and linked notes."""
    logger.info(f"Executing search_vault_context with query={query}")
    if not query.strip():
        return "❌ Error: query is required"
    try:
        mc = int(max_chunks) if max_chunks.strip() else 10
    except ValueError:
        mc = 10
    try:
        data = await api_post("/api/knowledge/search", {"query": query.strip(), "maxChunks": mc})
        chunks = data.get("chunks", [])
        if not chunks:
            return f"🔍 No vault context found for: \"{query}\""
        result = f"🔍 {len(chunks)} context chunk(s) for \"{query}\":\n\n"
        for i, c in enumerate(chunks, 1):
            title = c.get("noteTitle", "?")
            content = c.get("content", "")[:400]
            tags = ", ".join(c.get("tags", [])) or "none"
            links = ", ".join(c.get("linkedNotes", [])) or "none"
            result += f"**{i}. {title}** (relevance: {c.get('relevance', 0):.1f})\n"
            result += f"   Tags: {tags} | Links: {links}\n"
            result += f"   {content}\n\n"
        return result
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def get_vault_context(max_notes: str = "50") -> str:
    """Get the vault formatted as a text block suitable for AI context injection."""
    logger.info("Executing get_vault_context")
    try:
        data = await api_get("/api/knowledge/context")
        context = data.get("context", "")
        if not context:
            return "📭 Vault is empty — no context available."
        return f"📚 Vault Context:\n\n{context}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def export_vault() -> str:
    """Export the complete vault with all notes, tags, folders, tasks, and the knowledge graph as JSON."""
    logger.info("Executing export_vault")
    try:
        data = await api_get("/api/knowledge/export")
        vault = data.get("vault", {})
        graph = data.get("graph", {})
        notes_count = len(vault.get("notes", []))
        tags_count = len(vault.get("tags", []))
        folders_count = len(vault.get("folders", []))
        tasks_count = len(vault.get("tasks", []))
        edges_count = len(graph.get("edges", []))
        summary = f"📦 Vault Export Complete:\n\n"
        summary += f"- 📝 {notes_count} notes\n"
        summary += f"- 🏷️ {tags_count} tags\n"
        summary += f"- 📁 {folders_count} folders\n"
        summary += f"- ✅ {tasks_count} tasks\n"
        summary += f"- 🕸️ {edges_count} knowledge graph edges\n\n"
        summary += f"**Full JSON:**\n```json\n{json.dumps(data, indent=2)[:8000]}\n```"
        if len(json.dumps(data)) > 8000:
            summary += "\n\n⚠️ Output truncated — vault is large. Use specific tools to query individual items."
        return summary
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


@mcp.tool()
async def get_note_with_connections(note_id: str = "") -> str:
    """Get a note with its knowledge graph connections — outgoing links, backlinks, and shared tags."""
    logger.info(f"Executing get_note_with_connections with id={note_id}")
    if not note_id.strip():
        return "❌ Error: note_id is required"
    try:
        data = await api_get(f"/api/knowledge/note/{note_id.strip()}/connections")
        note = data.get("note", {})
        tags = data.get("tags", [])
        outgoing = data.get("outgoingLinks", [])
        incoming = data.get("incomingLinks", [])
        link_count = data.get("linkCount", 0)
        result = f"🔗 Note with Connections:\n\n"
        result += f"**{note.get('title', '?')}** (id: {note.get('id', '?')})\n\n"
        result += f"🏷️ Tags: {', '.join(tags) if tags else 'none'}\n"
        result += f"📊 Total connections: {link_count}\n\n"
        if outgoing:
            result += f"**→ Outgoing Links ({len(outgoing)}):**\n"
            for link in outgoing:
                result += f"  - [[{link}]]\n"
        if incoming:
            result += f"\n**← Incoming Links / Backlinks ({len(incoming)}):**\n"
            for link in incoming:
                result += f"  - [[{link}]]\n"
        if not outgoing and not incoming:
            result += "📭 No connections found — this is an isolated note."
        return result
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return f"❌ Note not found: {note_id}"
        return f"❌ API Error ({e.response.status_code}): {str(e)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — VAULT SUMMARY ===

@mcp.tool()
async def get_vault_summary() -> str:
    """Get a quick summary of the Tesserin vault: note count, tag count, task count, and recent notes."""
    logger.info("Executing get_vault_summary")
    try:
        data = await api_get("/api/vault/summary")
        result = f"📊 Tesserin Vault Summary:\n\n"
        result += f"- 📝 Notes: {data.get('noteCount', 0)}\n"
        result += f"- 🏷️ Tags: {data.get('tagCount', 0)}\n"
        result += f"- ✅ Tasks: {data.get('taskCount', 0)}\n"
        result += f"- 📁 Folders: {data.get('folderCount', 0)}\n\n"
        recent = data.get("recentNotes", [])
        if recent:
            result += "**Recent Notes:**\n"
            for n in recent:
                result += f"  - {n.get('title', '?')} (updated: {n.get('updated_at', '?')})\n"
        return result
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — AI ===

@mcp.tool()
async def ai_chat(message: str = "", model: str = "") -> str:
    """Send a message to Tesserin's local AI (Ollama) and get a response."""
    logger.info(f"Executing ai_chat with message length={len(message)}")
    if not message.strip():
        return "❌ Error: message is required"
    try:
        body = {"messages": [{"role": "user", "content": message.strip()}]}
        if model.strip():
            body["model"] = model.strip()
        data = await api_post("/api/ai/chat", body)
        result = data.get("result", {})
        content = result.get("content", "No response from AI")
        return f"🤖 AI Response:\n\n{content}"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            return "❌ Error: invalid message format"
        return f"❌ AI Error ({e.response.status_code}): Is Ollama running?"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}. Make sure Ollama is running locally."


@mcp.tool()
async def ai_summarize(text: str = "", model: str = "") -> str:
    """Summarize text using Tesserin's local AI (Ollama)."""
    logger.info(f"Executing ai_summarize with text length={len(text)}")
    if not text.strip():
        return "❌ Error: text is required"
    try:
        body = {"text": text.strip()}
        if model.strip():
            body["model"] = model.strip()
        data = await api_post("/api/ai/summarize", body)
        summary = data.get("summary", "No summary generated")
        return f"📝 Summary:\n\n{summary}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}. Make sure Ollama is running locally."


@mcp.tool()
async def ai_generate_tags(text: str = "", model: str = "") -> str:
    """Generate suggested tags for a piece of text using Tesserin's local AI."""
    logger.info(f"Executing ai_generate_tags with text length={len(text)}")
    if not text.strip():
        return "❌ Error: text is required"
    try:
        body = {"text": text.strip()}
        if model.strip():
            body["model"] = model.strip()
        data = await api_post("/api/ai/generate-tags", body)
        tags = data.get("tags", [])
        if not tags:
            return "🏷️ No tags could be generated for this text."
        return f"🏷️ Suggested tags: {', '.join(tags)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}. Make sure Ollama is running locally."


# === MCP TOOLS — TEMPLATES ===

@mcp.tool()
async def list_templates() -> str:
    """List all reusable note templates in the Tesserin vault."""
    logger.info("Executing list_templates")
    try:
        data = await api_get("/api/templates")
        templates = data.get("templates", [])
        if not templates:
            return "📋 No templates found."
        lines = []
        for t in templates:
            name = t.get("name", "?")
            tid = t.get("id", "?")
            cat = t.get("category", "general")
            lines.append(f"- **{name}** (id: {tid}, category: {cat})")
        return f"📋 {len(templates)} template(s):\n\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === MCP TOOLS — HEALTH ===

@mcp.tool()
async def check_health() -> str:
    """Check if the Tesserin API server is running and accessible."""
    logger.info("Executing check_health")
    try:
        data = await api_get("/api/health")
        status = data.get("status", "unknown")
        version = data.get("version", "?")
        caps = ", ".join(data.get("capabilities", []))
        mcp_info = data.get("mcp", {})
        result = f"⚡ Tesserin Health Check:\n\n"
        result += f"- Status: {'✅ OK' if status == 'ok' else '❌ ' + status}\n"
        result += f"- Version: {version}\n"
        result += f"- Timestamp: {data.get('timestamp', '?')}\n"
        result += f"- Capabilities: {caps}\n"
        result += f"- MCP Server: {mcp_info.get('server', '?')}\n"
        result += f"- MCP Transports: {', '.join(mcp_info.get('transport', []))}\n"
        result += f"- Docker MCP: {'✅' if mcp_info.get('dockerMcp') else '❌'}"
        return result
    except httpx.ConnectError:
        return f"❌ Cannot connect to Tesserin at {TESSERIN_API_URL}. Make sure:\n1. Tesserin desktop app is running\n2. API server is enabled (Settings → API)\n3. URL is correct (current: {TESSERIN_API_URL})"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"❌ Error: {str(e)}"


# === SERVER STARTUP ===
if __name__ == "__main__":
    logger.info("Starting Tesserin MCP server...")

    if not TESSERIN_API_TOKEN:
        logger.warning("TESSERIN_API_TOKEN not set — API calls will fail. Generate a key in Tesserin Settings → API.")

    logger.info(f"Tesserin API URL: {TESSERIN_API_URL}")

    try:
        mcp.run(transport='stdio')
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)
