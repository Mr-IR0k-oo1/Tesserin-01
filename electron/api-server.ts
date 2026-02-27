/**
 * Tesserin REST API Server
 *
 * Exposes vault capabilities over HTTP with API key authentication.
 * Any external agent, script, or integration can interact with Tesserin
 * by generating an API key from Settings → API.
 *
 * All endpoints require the header: Authorization: Bearer <api-key>
 */

import http from "http"
import { randomBytes, timingSafeEqual } from "crypto"
import * as db from "./database"
import * as ai from "./ai-service"

/* ================================================================== */
/*  API Key Management                                                 */
/* ================================================================== */

export interface ApiKey {
  id: string
  name: string
  key_hash: string
  prefix: string
  permissions: string // JSON array of permission strings
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: number
}

/**
 * Generate a cryptographically secure API key.
 * Returns the raw key (shown once) and the hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; prefix: string } {
  const bytes = randomBytes(32)
  const rawKey = `tsk_${bytes.toString("hex")}`
  const prefix = rawKey.substring(0, 11) // "tsk_" + first 7 hex chars
  // Store a SHA-256 hash so raw keys are never persisted
  const { createHash } = require("crypto")
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  return { rawKey, keyHash, prefix }
}

/**
 * Verify an API key against stored hashes using constant-time comparison.
 */
function verifyApiKey(rawKey: string): ApiKey | null {
  const { createHash } = require("crypto")
  const inputHash = createHash("sha256").update(rawKey).digest("hex")
  const keys = db.listApiKeys()

  for (const key of keys) {
    if (key.is_revoked) continue
    if (key.expires_at && new Date(key.expires_at) < new Date()) continue

    try {
      const storedBuf = Buffer.from(key.key_hash, "hex")
      const inputBuf = Buffer.from(inputHash, "hex")
      if (storedBuf.length === inputBuf.length && timingSafeEqual(storedBuf, inputBuf)) {
        // Update last_used_at
        db.touchApiKey(key.id)
        return key
      }
    } catch {
      continue
    }
  }
  return null
}

/* ================================================================== */
/*  HTTP Server                                                        */
/* ================================================================== */

let server: http.Server | null = null
let currentPort = 9960

/**
 * Parse JSON body from incoming request with size limit.
 */
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const MAX_BODY = 5 * 1024 * 1024 // 5MB limit

    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        req.destroy()
        reject(new Error("Request body too large"))
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8")
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error("Invalid JSON"))
      }
    })
    req.on("error", reject)
  })
}

/**
 * Send a JSON response.
 */
function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  })
  res.end(body)
}

/**
 * Extract route parameters from URL patterns like /api/notes/:id
 */
function matchRoute(
  pattern: string,
  url: string
): Record<string, string> | null {
  const patternParts = pattern.split("/")
  const urlParts = url.split("/")
  if (patternParts.length !== urlParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = decodeURIComponent(urlParts[i])
    } else if (patternParts[i] !== urlParts[i]) {
      return null
    }
  }
  return params
}

/**
 * Parse permissions from API key.
 */
function hasPermission(apiKey: ApiKey, permission: string): boolean {
  try {
    const perms = JSON.parse(apiKey.permissions) as string[]
    return perms.includes("*") || perms.includes(permission)
  } catch {
    return false
  }
}

/* ================================================================== */
/*  Route handlers                                                     */
/* ================================================================== */

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  apiKey: ApiKey
) => Promise<void>

interface Route {
  method: string
  pattern: string
  permission: string
  handler: RouteHandler
}

const routes: Route[] = [
  // ── Notes ──────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/notes",
    permission: "notes:read",
    handler: async (_req, res) => {
      const notes = db.listNotes()
      json(res, 200, { notes })
    },
  },
  {
    method: "GET",
    pattern: "/api/notes/:id",
    permission: "notes:read",
    handler: async (_req, res, params) => {
      const note = db.getNote(params.id)
      if (!note) return json(res, 404, { error: "Note not found" })
      json(res, 200, { note })
    },
  },
  {
    method: "POST",
    pattern: "/api/notes",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.title || typeof body.title !== "string") {
        return json(res, 400, { error: "title is required" })
      }
      const note = db.createNote({
        title: body.title,
        content: body.content || "",
        folderId: body.folderId,
      })
      json(res, 201, { note })
    },
  },
  {
    method: "PUT",
    pattern: "/api/notes/:id",
    permission: "notes:write",
    handler: async (req, res, params) => {
      const existing = db.getNote(params.id)
      if (!existing) return json(res, 404, { error: "Note not found" })
      const body = await parseBody(req)
      const note = db.updateNote(params.id, {
        title: body.title,
        content: body.content,
        folderId: body.folderId,
        isPinned: body.isPinned,
        isArchived: body.isArchived,
      })
      json(res, 200, { note })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/notes/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      const existing = db.getNote(params.id)
      if (!existing) return json(res, 404, { error: "Note not found" })
      db.deleteNote(params.id)
      json(res, 200, { message: "Note deleted" })
    },
  },
  {
    method: "GET",
    pattern: "/api/notes/search/:query",
    permission: "notes:read",
    handler: async (_req, res, params) => {
      const results = db.searchNotes(params.query)
      json(res, 200, {
        results: results.map((n: any) => ({
          id: n.id,
          title: n.title,
          snippet: n.content?.substring(0, 200),
          updated_at: n.updated_at,
        })),
      })
    },
  },

  // ── Tags ───────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/tags",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { tags: db.listTags() })
    },
  },
  {
    method: "POST",
    pattern: "/api/tags",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.name || typeof body.name !== "string") {
        return json(res, 400, { error: "name is required" })
      }
      const tag = db.createTag(body.name, body.color)
      json(res, 201, { tag })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/tags/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      db.deleteTag(params.id)
      json(res, 200, { message: "Tag deleted" })
    },
  },

  // ── Folders ────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/folders",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { folders: db.listFolders() })
    },
  },
  {
    method: "POST",
    pattern: "/api/folders",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.name || typeof body.name !== "string") {
        return json(res, 400, { error: "name is required" })
      }
      const folder = db.createFolder(body.name, body.parentId)
      json(res, 201, { folder })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/folders/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      db.deleteFolder(params.id)
      json(res, 200, { message: "Folder deleted" })
    },
  },

  // ── Tasks ──────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/tasks",
    permission: "tasks:read",
    handler: async (_req, res) => {
      json(res, 200, { tasks: db.listTasks() })
    },
  },
  {
    method: "POST",
    pattern: "/api/tasks",
    permission: "tasks:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.title || typeof body.title !== "string") {
        return json(res, 400, { error: "title is required" })
      }
      const task = db.createTask({
        title: body.title,
        noteId: body.noteId,
        columnId: body.columnId,
        priority: body.priority,
        dueDate: body.dueDate,
      })
      json(res, 201, { task })
    },
  },
  {
    method: "PUT",
    pattern: "/api/tasks/:id",
    permission: "tasks:write",
    handler: async (req, res, params) => {
      const body = await parseBody(req)
      const task = db.updateTask(params.id, body)
      if (!task) return json(res, 404, { error: "Task not found" })
      json(res, 200, { task })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/tasks/:id",
    permission: "tasks:write",
    handler: async (_req, res, params) => {
      db.deleteTask(params.id)
      json(res, 200, { message: "Task deleted" })
    },
  },

  // ── Templates ──────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/templates",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { templates: db.listTemplates() })
    },
  },

  // ── AI ─────────────────────────────────────────────────────────────
  {
    method: "POST",
    pattern: "/api/ai/chat",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!Array.isArray(body.messages)) {
        return json(res, 400, { error: "messages array is required" })
      }
      const result = await ai.chat(body.messages, body.model)
      json(res, 200, { result })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/summarize",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.text || typeof body.text !== "string") {
        return json(res, 400, { error: "text is required" })
      }
      const summary = await ai.summarize(body.text, body.model)
      json(res, 200, { summary })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/generate-tags",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.text || typeof body.text !== "string") {
        return json(res, 400, { error: "text is required" })
      }
      const tags = await ai.generateTags(body.text, body.model)
      json(res, 200, { tags })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/suggest-links",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.content || !Array.isArray(body.existingTitles)) {
        return json(res, 400, { error: "content and existingTitles are required" })
      }
      const links = await ai.suggestLinks(body.content, body.existingTitles, body.model)
      json(res, 200, { links })
    },
  },

  // ── Vault Summary ──────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/vault/summary",
    permission: "notes:read",
    handler: async (_req, res) => {
      const notes = db.listNotes()
      const tags = db.listTags()
      const tasks = db.listTasks()
      const folders = db.listFolders()
      json(res, 200, {
        noteCount: notes.length,
        tagCount: tags.length,
        taskCount: tasks.length,
        folderCount: folders.length,
        recentNotes: notes.slice(0, 10).map((n: any) => ({
          id: n.id,
          title: n.title,
          updated_at: n.updated_at,
        })),
      })
    },
  },

  // ── Health ─────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/health",
    permission: "*",
    handler: async (_req, res) => {
      json(res, 200, {
        status: "ok",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      })
    },
  },
]

/* ================================================================== */
/*  Server lifecycle                                                   */
/* ================================================================== */

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  // CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  // Parse URL (strip query string)
  const urlPath = (req.url || "/").split("?")[0]
  const method = (req.method || "GET").toUpperCase()

  // Authenticate — require API key for all routes
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  if (!token) {
    json(res, 401, { error: "Missing API key. Use header: Authorization: Bearer <your-api-key>" })
    return
  }

  const apiKey = verifyApiKey(token)
  if (!apiKey) {
    json(res, 401, { error: "Invalid or expired API key" })
    return
  }

  // Route matching
  for (const route of routes) {
    if (route.method !== method) continue
    const params = matchRoute(route.pattern, urlPath)
    if (!params) continue

    // Check permissions
    if (route.permission !== "*" && !hasPermission(apiKey, route.permission)) {
      json(res, 403, { error: `Missing permission: ${route.permission}` })
      return
    }

    route
      .handler(req, res, params, apiKey)
      .catch((err) => {
        console.error("[API] Handler error:", err)
        json(res, 500, { error: "Internal server error" })
      })
    return
  }

  json(res, 404, { error: "Not found" })
}

/**
 * Start the API server on the specified port.
 * Only binds to 127.0.0.1 for security (local access only).
 */
export function startApiServer(port: number = 9960): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) {
      // Already running, stop first
      stopApiServer()
    }

    currentPort = port
    server = http.createServer(handleRequest)

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[API] Port ${port} in use, trying ${port + 1}`)
        server = null
        startApiServer(port + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })

    server.listen(port, "127.0.0.1", () => {
      currentPort = port
      console.log(`[API] Tesserin REST API server listening on http://127.0.0.1:${port}`)
      resolve(port)
    })
  })
}

/**
 * Stop the API server.
 */
export function stopApiServer(): void {
  if (server) {
    server.close()
    server = null
    console.log("[API] Server stopped")
  }
}

/**
 * Get the current server status.
 */
export function getApiServerStatus(): { running: boolean; port: number } {
  return {
    running: server !== null && server.listening,
    port: currentPort,
  }
}
