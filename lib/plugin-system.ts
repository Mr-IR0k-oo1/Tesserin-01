/**
 * Tesserin Plugin System
 *
 * A sandboxed, event-driven plugin architecture that lets third-party
 * (or first-party) extensions hook into every layer of Tesserin:
 *
 * - Register commands (appear in command palette)
 * - Add sidebar panels / workspace views
 * - Hook note lifecycle events (create, update, delete)
 * - Add markdown post-processors
 * - Register custom code-block renderers
 * - Add status-bar widgets
 * - Extend SAM with custom tools
 *
 * Plugins are JavaScript objects conforming to the TesserinPlugin interface.
 * They are loaded at runtime and can be enabled/disabled via Settings.
 */

import React from "react"

/* ================================================================== */
/*  Core types                                                         */
/* ================================================================== */

/** Metadata every plugin must declare */
export interface PluginManifest {
  /** Unique reverse-domain ID, e.g. "com.tesserin.word-count" */
  id: string
  /** Human-readable name */
  name: string
  /** Semver string */
  version: string
  /** Short description */
  description: string
  /** Author name */
  author: string
  /** Minimum Tesserin version required */
  minAppVersion?: string
  /** Optional homepage / repo URL */
  url?: string
  /** Icon React node (optional) */
  icon?: React.ReactNode
  /**
   * Permissions the plugin requests.
   * Built-in plugins automatically get all permissions.
   * Third-party plugins must declare what they need.
   */
  permissions?: PluginPermission[]
}

export type PluginPermission =
  | "vault:read"       // list, get, search notes
  | "vault:write"      // create, update, delete notes
  | "settings:read"
  | "settings:write"
  | "ui:notify"        // show notices / navigate tabs
  | "commands"         // register commands
  | "panels"           // register panels
  | "sam:tools"        // register SAM tools
  | "events"           // subscribe to events

/** Events plugins can subscribe to */
export type PluginEventType =
  | "note:created"
  | "note:updated"
  | "note:deleted"
  | "note:selected"
  | "vault:loaded"
  | "search:query"
  | "command:executed"
  | "theme:changed"
  | "app:ready"
  | "app:beforeQuit"

export interface PluginEvent {
  type: PluginEventType
  data?: unknown
  timestamp: number
}

export type PluginEventHandler = (event: PluginEvent) => void | Promise<void>

/** A command registered by a plugin */
export interface PluginCommand {
  /** Unique command ID within the plugin, e.g. "toggle-word-count" */
  id: string
  /** Display label in the command palette */
  label: string
  /** Optional category for grouping */
  category?: string
  /** Keyboard shortcut hint (display only) */
  shortcut?: string
  /** Optional icon */
  icon?: React.ReactNode
  /** The handler to execute */
  execute: () => void | Promise<void>
}

/** A sidebar or workspace panel contributed by a plugin */
export interface PluginPanel {
  /** Panel ID */
  id: string
  /** Tab label */
  label: string
  /** Tab icon */
  icon: React.ReactNode
  /** The React component to render */
  component: React.ComponentType
  /** Where to show: workspace tab or sidebar panel */
  location: "workspace" | "sidebar" | "statusbar"
}

/** A status bar widget */
export interface StatusBarWidget {
  id: string
  /** React component rendering the widget inline */
  component: React.ComponentType
  /** left | center | right alignment */
  align?: "left" | "center" | "right"
  /** Sort priority (lower = further left) */
  priority?: number
}

/** A markdown post-processor (runs after rendering) */
export type MarkdownProcessor = (
  content: string,
  element: HTMLElement,
) => void | Promise<void>

/** A custom code-block renderer (```lang → custom component) */
export interface CodeBlockRenderer {
  /** The language identifier, e.g. "chart", "mermaid", "dataview" */
  language: string
  /** React component receiving the raw code-block content */
  component: React.ComponentType<{ code: string }>
}

/** A SAM tool that plugins can register */
export interface SAMTool {
  /** Tool name, e.g. "web-search" */
  name: string
  /** Short description shown to SAM in context */
  description: string
  /** Parameter schema */
  parameters?: Record<string, { type: string; description: string; required?: boolean }>
  /** Execute the tool and return a result string */
  execute: (params: Record<string, unknown>) => Promise<string>
}

/* ================================================================== */
/*  Plugin API — what the plugin receives to interact with Tesserin    */
/* ================================================================== */

export interface TesserinPluginAPI {
  /** Register commands */
  registerCommand(command: PluginCommand): void
  /** Register a panel (workspace tab, sidebar, or statusbar widget) */
  registerPanel(panel: PluginPanel): void
  /** Register a status-bar widget */
  registerStatusBarWidget(widget: StatusBarWidget): void
  /** Register a markdown post-processor */
  registerMarkdownProcessor(processor: MarkdownProcessor): void
  /** Register a custom code-block renderer */
  registerCodeBlockRenderer(renderer: CodeBlockRenderer): void
  /** Register a SAM tool */
  registerSAMTool(tool: SAMTool): void
  /** Subscribe to plugin events */
  on(event: PluginEventType, handler: PluginEventHandler): void
  /** Unsubscribe from events */
  off(event: PluginEventType, handler: PluginEventHandler): void

  /** Notes CRUD (read-only + append helpers for safety) */
  vault: {
    list(): Array<{ id: string; title: string; content: string; createdAt: string; updatedAt: string }>
    get(id: string): { id: string; title: string; content: string } | undefined
    getSelected(): { id: string; title: string; content: string } | null
    search(query: string): Array<{ id: string; title: string; content: string }>
    create(title: string, content?: string): string
    update(id: string, updates: { title?: string; content?: string }): void
    delete(id: string): void
    selectNote(id: string): void
  }

  /** Settings */
  settings: {
    get(key: string): string | null
    set(key: string, value: string): void
  }

  /** UI helpers */
  ui: {
    showNotice(message: string, duration?: number): void
    navigateToTab(tabId: string): void
  }
}

/* ================================================================== */
/*  Plugin interface                                                    */
/* ================================================================== */

/** The contract every plugin must implement */
export interface TesserinPlugin {
  /** Plugin metadata */
  manifest: PluginManifest
  /** Called when the plugin is activated */
  activate(api: TesserinPluginAPI): void | Promise<void>
  /** Called when the plugin is deactivated */
  deactivate?(): void | Promise<void>
}

/* ================================================================== */
/*  Plugin sandbox helpers                                             */
/* ================================================================== */

/** All permissions — granted to built-in plugins automatically. */
const ALL_PERMISSIONS: PluginPermission[] = [
  "vault:read", "vault:write", "settings:read", "settings:write",
  "ui:notify", "commands", "panels", "sam:tools", "events",
]

/** Simple per-plugin rate limiter: max `limit` calls per `windowMs`. */
class RateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>()
  private limit: number
  private windowMs: number

  constructor(limit = 120, windowMs = 60_000) {
    this.limit = limit
    this.windowMs = windowMs
  }

  check(pluginId: string): boolean {
    const now = Date.now()
    const entry = this.counts.get(pluginId)
    if (!entry || now >= entry.resetAt) {
      this.counts.set(pluginId, { count: 1, resetAt: now + this.windowMs })
      return true
    }
    if (entry.count >= this.limit) return false
    entry.count++
    return true
  }
}

const apiRateLimiter = new RateLimiter(120, 60_000)   // 120 calls / minute
const writeRateLimiter = new RateLimiter(30, 60_000)  // 30 mutations / minute

/** Wrap a function with rate-limit + permission check. */
function guarded<T extends (...args: any[]) => any>(
  pluginId: string,
  permission: PluginPermission,
  permissions: Set<PluginPermission>,
  fn: T,
  isWrite = false,
): T {
  return ((...args: any[]) => {
    if (!permissions.has(permission)) {
      throw new Error(`Plugin "${pluginId}" lacks permission "${permission}"`)
    }
    if (!apiRateLimiter.check(pluginId)) {
      throw new Error(`Plugin "${pluginId}" exceeded rate limit`)
    }
    if (isWrite && !writeRateLimiter.check(pluginId)) {
      throw new Error(`Plugin "${pluginId}" exceeded write rate limit`)
    }
    return fn(...args)
  }) as unknown as T
}

/** Permission-only guard (no rate limit) for cheap read accessors. */
function guardedRead<T extends (...args: any[]) => any>(
  pluginId: string,
  permission: PluginPermission,
  permissions: Set<PluginPermission>,
  fn: T,
): T {
  return ((...args: any[]) => {
    if (!permissions.has(permission)) {
      throw new Error(`Plugin "${pluginId}" lacks permission "${permission}"`)
    }
    return fn(...args)
  }) as unknown as T
}

/** Activation timeout (10 seconds). */
const ACTIVATE_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T> | void, ms: number, label: string): Promise<T | void> {
  if (!promise) return Promise.resolve()
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Plugin "${label}" activation timed out after ${ms}ms`)), ms),
    ),
  ])
}

/* ================================================================== */
/*  Plugin Registry (runtime store)                                    */
/* ================================================================== */

interface RegistryState {
  plugins: Map<string, { plugin: TesserinPlugin; enabled: boolean }>
  commands: Map<string, PluginCommand & { pluginId: string }>
  panels: Map<string, PluginPanel & { pluginId: string }>
  statusBarWidgets: Map<string, StatusBarWidget & { pluginId: string }>
  markdownProcessors: Array<{ pluginId: string; processor: MarkdownProcessor }>
  codeBlockRenderers: Map<string, CodeBlockRenderer & { pluginId: string }>
  samTools: Map<string, SAMTool & { pluginId: string }>
  eventListeners: Map<PluginEventType, Array<{ pluginId: string; handler: PluginEventHandler }>>
}

class PluginRegistry {
  private state: RegistryState = {
    plugins: new Map(),
    commands: new Map(),
    panels: new Map(),
    statusBarWidgets: new Map(),
    markdownProcessors: [],
    codeBlockRenderers: new Map(),
    samTools: new Map(),
    eventListeners: new Map(),
  }

  private listeners: Set<() => void> = new Set()

  /* ── Snapshot cache (must be referentially stable for useSyncExternalStore) ── */
  private _snapPlugins: ReturnType<PluginRegistry["getPlugins"]> = []
  private _snapCommands: ReturnType<PluginRegistry["getCommands"]> = []
  private _snapPanels: ReturnType<PluginRegistry["getPanels"]> = []
  private _snapWidgets: ReturnType<PluginRegistry["getStatusBarWidgets"]> = []

  private rebuildSnapshots() {
    this._snapPlugins = Array.from(this.state.plugins.entries()).map(([id, { plugin, enabled }]) => ({
      id,
      manifest: plugin.manifest,
      enabled,
    }))
    this._snapCommands = Array.from(this.state.commands.values())
    this._snapPanels = Array.from(this.state.panels.values())
    this._snapWidgets = Array.from(this.state.statusBarWidgets.values()).sort(
      (a, b) => (a.priority ?? 50) - (b.priority ?? 50),
    )
  }

  /* ── Subscription for React ── */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.rebuildSnapshots()
    this.listeners.forEach((fn) => fn())
  }

  /* ── Cached snapshot getters (stable references between notify calls) ── */
  get snapshotPlugins() { return this._snapPlugins }
  get snapshotCommands() { return this._snapCommands }
  get snapshotPanels() { return this._snapPanels }
  get snapshotWidgets() { return this._snapWidgets }

  /* ── Plugin management ── */

  register(plugin: TesserinPlugin) {
    this.state.plugins.set(plugin.manifest.id, { plugin, enabled: false })
    this.notify()
  }

  async activate(pluginId: string, apiFactory: (pluginId: string) => TesserinPluginAPI) {
    const entry = this.state.plugins.get(pluginId)
    if (!entry || entry.enabled) return

    const api = apiFactory(pluginId)
    // Freeze the API so plugins can't tamper with it
    Object.freeze(api)
    Object.freeze(api.vault)
    Object.freeze(api.settings)
    Object.freeze(api.ui)

    try {
      await withTimeout(
        entry.plugin.activate(api),
        ACTIVATE_TIMEOUT_MS,
        pluginId,
      )
    } catch (err) {
      console.error(`[Plugin] Failed to activate "${pluginId}":`, err)
      return
    }
    entry.enabled = true
    this.notify()
  }

  async deactivate(pluginId: string) {
    const entry = this.state.plugins.get(pluginId)
    if (!entry || !entry.enabled) return

    await entry.plugin.deactivate?.()
    entry.enabled = false

    // Clean up all registrations for this plugin
    for (const [key, cmd] of this.state.commands) {
      if (cmd.pluginId === pluginId) this.state.commands.delete(key)
    }
    for (const [key, panel] of this.state.panels) {
      if (panel.pluginId === pluginId) this.state.panels.delete(key)
    }
    for (const [key, w] of this.state.statusBarWidgets) {
      if (w.pluginId === pluginId) this.state.statusBarWidgets.delete(key)
    }
    this.state.markdownProcessors = this.state.markdownProcessors.filter((p) => p.pluginId !== pluginId)
    for (const [key, r] of this.state.codeBlockRenderers) {
      if (r.pluginId === pluginId) this.state.codeBlockRenderers.delete(key)
    }
    for (const [key, t] of this.state.samTools) {
      if (t.pluginId === pluginId) this.state.samTools.delete(key)
    }
    for (const [, handlers] of this.state.eventListeners) {
      const idx = handlers.findIndex((h) => h.pluginId === pluginId)
      if (idx !== -1) handlers.splice(idx, 1)
    }

    this.notify()
  }

  unregister(pluginId: string) {
    this.deactivate(pluginId)
    this.state.plugins.delete(pluginId)
    this.notify()
  }

  /* ── Registration helpers (called by plugin API) ── */

  addCommand(pluginId: string, command: PluginCommand) {
    const key = `${pluginId}:${command.id}`
    this.state.commands.set(key, { ...command, pluginId })
    this.notify()
  }

  addPanel(pluginId: string, panel: PluginPanel) {
    const key = `${pluginId}:${panel.id}`
    this.state.panels.set(key, { ...panel, pluginId })
    this.notify()
  }

  addStatusBarWidget(pluginId: string, widget: StatusBarWidget) {
    const key = `${pluginId}:${widget.id}`
    this.state.statusBarWidgets.set(key, { ...widget, pluginId })
    this.notify()
  }

  addMarkdownProcessor(pluginId: string, processor: MarkdownProcessor) {
    this.state.markdownProcessors.push({ pluginId, processor })
  }

  addCodeBlockRenderer(pluginId: string, renderer: CodeBlockRenderer) {
    // Plugin renderers don't overwrite built-in ones
    const key = `${pluginId}:${renderer.language}`
    this.state.codeBlockRenderers.set(key, { ...renderer, pluginId })
    this.notify()
  }

  addSAMTool(pluginId: string, tool: SAMTool) {
    const key = `${pluginId}:${tool.name}`
    this.state.samTools.set(key, { ...tool, pluginId })
    this.notify()
  }

  addEventListener(pluginId: string, event: PluginEventType, handler: PluginEventHandler) {
    if (!this.state.eventListeners.has(event)) {
      this.state.eventListeners.set(event, [])
    }
    this.state.eventListeners.get(event)!.push({ pluginId, handler })
  }

  removeEventListener(pluginId: string, event: PluginEventType, handler: PluginEventHandler) {
    const handlers = this.state.eventListeners.get(event)
    if (!handlers) return
    const idx = handlers.findIndex((h) => h.pluginId === pluginId && h.handler === handler)
    if (idx !== -1) handlers.splice(idx, 1)
  }

  /* ── Event emission ── */

  async emit(event: PluginEvent) {
    const handlers = this.state.eventListeners.get(event.type)
    if (!handlers) return
    for (const { handler } of handlers) {
      try {
        await handler(event)
      } catch (err) {
        console.error(`[Plugin Event Error] ${event.type}:`, err)
      }
    }
  }

  /* ── Getters ── */

  getPlugins() {
    return Array.from(this.state.plugins.entries()).map(([id, { plugin, enabled }]) => ({
      id,
      manifest: plugin.manifest,
      enabled,
    }))
  }

  getCommands(): Array<PluginCommand & { pluginId: string }> {
    return Array.from(this.state.commands.values())
  }

  getPanels(location?: "workspace" | "sidebar" | "statusbar"): Array<PluginPanel & { pluginId: string }> {
    const all = Array.from(this.state.panels.values())
    return location ? all.filter((p) => p.location === location) : all
  }

  getStatusBarWidgets(): Array<StatusBarWidget & { pluginId: string }> {
    return Array.from(this.state.statusBarWidgets.values()).sort(
      (a, b) => (a.priority ?? 50) - (b.priority ?? 50),
    )
  }

  getCodeBlockRenderer(language: string): CodeBlockRenderer | undefined {
    for (const [, renderer] of this.state.codeBlockRenderers) {
      if (renderer.language === language) return renderer
    }
    return undefined
  }

  getSAMTools(): Array<SAMTool & { pluginId: string }> {
    return Array.from(this.state.samTools.values())
  }
}

/* ── Singleton ── */
export const pluginRegistry = new PluginRegistry()

/** Create a permission-checked, rate-limited wrapper around a raw API. */
export function sandboxAPI(
  pluginId: string,
  rawApi: TesserinPluginAPI,
  manifest: PluginManifest,
): TesserinPluginAPI {
  // Built-in plugins (com.tesserin.*) get all permissions
  const isBuiltIn = pluginId.startsWith("com.tesserin.")
  const perms = new Set<PluginPermission>(isBuiltIn ? ALL_PERMISSIONS : (manifest.permissions ?? ["vault:read", "ui:notify", "commands", "events"]))

  return {
    registerCommand: guarded(pluginId, "commands", perms, rawApi.registerCommand),
    registerPanel: guarded(pluginId, "panels", perms, rawApi.registerPanel),
    registerStatusBarWidget: guarded(pluginId, "panels", perms, rawApi.registerStatusBarWidget),
    registerMarkdownProcessor: guarded(pluginId, "panels", perms, rawApi.registerMarkdownProcessor),
    registerCodeBlockRenderer: guarded(pluginId, "panels", perms, rawApi.registerCodeBlockRenderer),
    registerSAMTool: guarded(pluginId, "sam:tools", perms, rawApi.registerSAMTool),
    on: guarded(pluginId, "events", perms, rawApi.on),
    off: guarded(pluginId, "events", perms, rawApi.off),
    vault: {
      list: guarded(pluginId, "vault:read", perms, rawApi.vault.list),
      get: guarded(pluginId, "vault:read", perms, rawApi.vault.get),
      getSelected: guardedRead(pluginId, "vault:read", perms, rawApi.vault.getSelected),
      search: guarded(pluginId, "vault:read", perms, rawApi.vault.search),
      create: guarded(pluginId, "vault:write", perms, rawApi.vault.create, true),
      update: guarded(pluginId, "vault:write", perms, rawApi.vault.update, true),
      delete: guarded(pluginId, "vault:write", perms, rawApi.vault.delete, true),
      selectNote: guarded(pluginId, "vault:read", perms, rawApi.vault.selectNote),
    },
    settings: {
      get: guarded(pluginId, "settings:read", perms, rawApi.settings.get),
      set: guarded(pluginId, "settings:write", perms, rawApi.settings.set, true),
    },
    ui: {
      showNotice: guarded(pluginId, "ui:notify", perms, rawApi.ui.showNotice),
      navigateToTab: guarded(pluginId, "ui:notify", perms, rawApi.ui.navigateToTab),
    },
  }
}

/* ================================================================== */
/*  React hook                                                         */
/* ================================================================== */

import { useSyncExternalStore } from "react"

const subscribe = (cb: () => void) => pluginRegistry.subscribe(cb)
const getPlugins = () => pluginRegistry.snapshotPlugins
const getCommands = () => pluginRegistry.snapshotCommands
const getPanels = () => pluginRegistry.snapshotPanels
const getWidgets = () => pluginRegistry.snapshotWidgets

export function usePlugins() {
  const plugins = useSyncExternalStore(subscribe, getPlugins)
  const commands = useSyncExternalStore(subscribe, getCommands)
  const panels = useSyncExternalStore(subscribe, getPanels)
  const statusBarWidgets = useSyncExternalStore(subscribe, getWidgets)

  return { plugins, commands, panels, statusBarWidgets, registry: pluginRegistry }
}
