"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  FiPackage, FiSearch, FiDownload, FiTrash2, FiCheck,
  FiStar, FiUser, FiTag, FiChevronRight, FiZap, FiFilter,
  FiGrid, FiList, FiRefreshCw, FiExternalLink, FiClock,
} from "react-icons/fi"
import { SkeuoPanel } from "../core/skeuo-panel"
import { usePluginAPI } from "../core/plugin-provider"
import { COMMUNITY_PLUGINS } from "@/lib/community-plugins"
import { pluginRegistry, usePlugins } from "@/lib/plugin-system"
import type { TesserinPlugin, TesserinPluginAPI } from "@/lib/plugin-system"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = "grid" | "list"
type FilterCategory = "all" | "productivity" | "writing" | "knowledge" | "tools"

interface PluginMeta {
  plugin: TesserinPlugin
  category: FilterCategory
  downloads: number
  rating: number
}

/* ------------------------------------------------------------------ */
/*  Plugin metadata registry                                           */
/* ------------------------------------------------------------------ */

const PLUGIN_META: PluginMeta[] = [
  { plugin: COMMUNITY_PLUGINS[0], category: "productivity", downloads: 12400, rating: 4.8 },
  { plugin: COMMUNITY_PLUGINS[1], category: "knowledge",    downloads: 8700,  rating: 4.5 },
  { plugin: COMMUNITY_PLUGINS[2], category: "knowledge",    downloads: 9200,  rating: 4.7 },
  { plugin: COMMUNITY_PLUGINS[3], category: "knowledge",    downloads: 6800,  rating: 4.3 },
  { plugin: COMMUNITY_PLUGINS[4], category: "writing",      downloads: 5400,  rating: 4.4 },
  { plugin: COMMUNITY_PLUGINS[5], category: "productivity", downloads: 11300, rating: 4.6 },
  { plugin: COMMUNITY_PLUGINS[6], category: "writing",      downloads: 7100,  rating: 4.5 },
  { plugin: COMMUNITY_PLUGINS[7], category: "tools",        downloads: 4200,  rating: 4.2 },
  { plugin: COMMUNITY_PLUGINS[8], category: "tools",        downloads: 6300,  rating: 4.1 },
  { plugin: COMMUNITY_PLUGINS[9], category: "tools",        downloads: 3800,  rating: 4.0 },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    productivity: { bg: "rgba(250,204,21,0.1)", text: "#facc15" },
    writing:      { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
    knowledge:    { bg: "rgba(168,85,247,0.1)", text: "#a855f7" },
    tools:        { bg: "rgba(34,197,94,0.1)",  text: "#22c55e" },
    all:          { bg: "rgba(255,255,255,0.05)", text: "var(--text-tertiary)" },
  }
  const c = colors[category] || colors.all
  return (
    <span
      className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-lg"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {category}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          size={10}
          style={{
            color: i <= Math.round(rating) ? "#facc15" : "var(--text-tertiary)",
            fill: i <= Math.round(rating) ? "#facc15" : "none",
            opacity: i <= Math.round(rating) ? 1 : 0.3,
          }}
        />
      ))}
      <span className="text-[9px] ml-1" style={{ color: "var(--text-tertiary)" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Plugin Card (Grid mode)                                            */
/* ------------------------------------------------------------------ */

function PluginCard({
  meta, isInstalled, onToggle,
}: {
  meta: PluginMeta
  isInstalled: boolean
  onToggle: (pluginId: string, install: boolean) => void
}) {
  const { plugin, category, downloads, rating } = meta
  const m = plugin.manifest

  return (
    <div
      className="group rounded-2xl p-4 transition-all duration-200 hover:brightness-110 flex flex-col gap-3"
      style={{
        background: isInstalled
          ? "linear-gradient(135deg, rgba(250,204,21,0.04), rgba(250,204,21,0.01))"
          : "var(--bg-panel-inset)",
        border: `1px solid ${isInstalled ? "rgba(250,204,21,0.15)" : "var(--border-dark)"}`,
        boxShadow: isInstalled ? "0 0 20px rgba(250,204,21,0.05)" : "var(--input-inner-shadow)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: isInstalled ? "rgba(250,204,21,0.08)" : "var(--bg-panel)",
            border: `1px solid ${isInstalled ? "rgba(250,204,21,0.2)" : "var(--border-dark)"}`,
            boxShadow: isInstalled ? "0 0 12px rgba(250,204,21,0.1)" : "var(--card-shadow-light)",
          }}
        >
          {m.icon || <FiPackage size={18} style={{ color: "var(--accent-primary)" }} />}
        </div>
        <CategoryBadge category={category} />
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          {m.name}
        </div>
        <div className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
          {m.description}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[9px]" style={{ color: "var(--text-tertiary)" }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FiUser size={9} /> {m.author}
          </span>
          <span className="flex items-center gap-1">
            <FiDownload size={9} /> {formatCount(downloads)}
          </span>
        </div>
        <StarRating rating={rating} />
      </div>

      {/* Version + Action */}
      <div className="flex items-center justify-between pt-1">
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded-lg"
          style={{
            backgroundColor: "var(--bg-panel)",
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-dark)",
          }}
        >
          v{m.version}
        </span>

        <button
          onClick={() => onToggle(m.id, !isInstalled)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: isInstalled
              ? "rgba(239,68,68,0.1)"
              : "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))",
            color: isInstalled ? "#ef4444" : "var(--bg-app)",
            border: `1px solid ${isInstalled ? "rgba(239,68,68,0.2)" : "transparent"}`,
          }}
        >
          {isInstalled ? (
            <>
              <FiTrash2 size={10} /> Uninstall
            </>
          ) : (
            <>
              <FiDownload size={10} /> Install
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Plugin Row (List mode)                                             */
/* ------------------------------------------------------------------ */

function PluginRow({
  meta, isInstalled, onToggle,
}: {
  meta: PluginMeta
  isInstalled: boolean
  onToggle: (pluginId: string, install: boolean) => void
}) {
  const { plugin, category, downloads, rating } = meta
  const m = plugin.manifest

  return (
    <div
      className="flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-200 hover:brightness-110"
      style={{
        background: isInstalled
          ? "linear-gradient(135deg, rgba(250,204,21,0.03), transparent)"
          : "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isInstalled ? "rgba(250,204,21,0.08)" : "var(--bg-panel-inset)",
          border: `1px solid ${isInstalled ? "rgba(250,204,21,0.2)" : "var(--border-dark)"}`,
        }}
      >
        {m.icon || <FiPackage size={16} style={{ color: "var(--accent-primary)" }} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {m.name}
          </span>
          <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            v{m.version}
          </span>
          <CategoryBadge category={category} />
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {m.description}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-center" style={{ minWidth: 48 }}>
          <div className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            {formatCount(downloads)}
          </div>
          <div className="text-[8px]" style={{ color: "var(--text-tertiary)" }}>downloads</div>
        </div>
        <StarRating rating={rating} />
      </div>

      {/* Action */}
      <button
        onClick={() => onToggle(m.id, !isInstalled)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
        style={{
          background: isInstalled
            ? "rgba(239,68,68,0.1)"
            : "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))",
          color: isInstalled ? "#ef4444" : "var(--bg-app)",
          border: `1px solid ${isInstalled ? "rgba(239,68,68,0.2)" : "transparent"}`,
          minWidth: 90,
          justifyContent: "center",
        }}
      >
        {isInstalled ? (
          <>
            <FiTrash2 size={10} /> Uninstall
          </>
        ) : (
          <>
            <FiDownload size={10} /> Install
          </>
        )}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CommunityPluginsPanel() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterCategory>("all")
  const [view, setView] = useState<ViewMode>("grid")
  const [installed, setInstalled] = useState<Record<string, boolean>>({})
  const createAPI = usePluginAPI()
  const { plugins: registeredPlugins } = usePlugins()

  // Sync installed state from the registry (reactive to actual plugin state)
  useEffect(() => {
    const state: Record<string, boolean> = {}
    for (const meta of PLUGIN_META) {
      const id = meta.plugin.manifest.id
      const entry = registeredPlugins.find((p) => p.id === id)
      state[id] = entry?.enabled ?? false
    }
    setInstalled(state)
  }, [registeredPlugins])

  // Install / uninstall toggle using the real shared API factory
  const togglePlugin = useCallback(async (pluginId: string, install: boolean) => {
    const key = `tesserin:plugin:${pluginId}`
    localStorage.setItem(key, String(install))
    setInstalled((prev) => ({ ...prev, [pluginId]: install }))

    const plugin = COMMUNITY_PLUGINS.find((p) => p.manifest.id === pluginId)
    if (!plugin) return

    if (install) {
      // Register if not already registered, then activate with real API
      const isRegistered = pluginRegistry.snapshotPlugins.some((p) => p.id === pluginId)
      if (!isRegistered) {
        pluginRegistry.register(plugin)
      }
      await pluginRegistry.activate(pluginId, createAPI)
    } else {
      await pluginRegistry.deactivate(pluginId)
    }
  }, [createAPI])

  // Filter and search
  const filtered = useMemo(() => {
    return PLUGIN_META.filter((meta) => {
      const m = meta.plugin.manifest
      const matchesSearch = search === "" ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase()) ||
        m.author.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === "all" || meta.category === filter
      return matchesSearch && matchesFilter
    })
  }, [search, filter])

  const installedCount = Object.values(installed).filter(Boolean).length

  const FILTER_TABS: { id: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { id: "all",          label: "All",          icon: <FiGrid size={12} /> },
    { id: "productivity", label: "Productivity", icon: <FiZap size={12} /> },
    { id: "writing",      label: "Writing",      icon: <FiTag size={12} /> },
    { id: "knowledge",    label: "Knowledge",    icon: <FiStar size={12} /> },
    { id: "tools",        label: "Tools",        icon: <FiPackage size={12} /> },
  ]

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Community Plugins
            </h2>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              Browse, install, and manage community-contributed plugins.{" "}
              <span style={{ color: "var(--accent-primary)" }}>{installedCount} installed</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-dark)",
                backgroundColor: "var(--bg-panel-inset)",
              }}
            >
              <button
                onClick={() => setView("grid")}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: view === "grid" ? "rgba(250,204,21,0.1)" : "transparent",
                  color: view === "grid" ? "var(--accent-primary)" : "var(--text-tertiary)",
                }}
              >
                <FiGrid size={13} />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: view === "list" ? "rgba(250,204,21,0.1)" : "transparent",
                  color: view === "list" ? "var(--accent-primary)" : "var(--text-tertiary)",
                }}
              >
                <FiList size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <FiSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins by name, description, or author…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 focus:ring-1"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              border: "1px solid var(--border-dark)",
              color: "var(--text-primary)",
              boxShadow: "var(--input-inner-shadow)",
            }}
          />
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200"
              style={{
                backgroundColor: filter === tab.id ? "rgba(250,204,21,0.1)" : "var(--bg-panel-inset)",
                color: filter === tab.id ? "var(--accent-primary)" : "var(--text-tertiary)",
                border: `1px solid ${filter === tab.id ? "rgba(250,204,21,0.2)" : "var(--border-dark)"}`,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "all" && (
                <span className="ml-0.5 text-[8px]" style={{ opacity: 0.6 }}>
                  {PLUGIN_META.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plugin list ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin" style={{ scrollbarColor: "var(--border-dark) transparent" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FiSearch size={32} style={{ color: "var(--text-tertiary)", opacity: 0.3 }} />
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              No plugins matching &ldquo;{search}&rdquo;
            </div>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((meta) => (
              <PluginCard
                key={meta.plugin.manifest.id}
                meta={meta}
                isInstalled={installed[meta.plugin.manifest.id] ?? false}
                onToggle={togglePlugin}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((meta) => (
              <PluginRow
                key={meta.plugin.manifest.id}
                meta={meta}
                isInstalled={installed[meta.plugin.manifest.id] ?? false}
                onToggle={togglePlugin}
              />
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="text-center py-8">
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>
            {PLUGIN_META.length} community plugins available · Want to contribute?{" "}
            <span style={{ color: "var(--accent-primary)" }}>See CONTRIBUTING.md</span>
          </div>
        </div>
      </div>
    </div>
  )
}
