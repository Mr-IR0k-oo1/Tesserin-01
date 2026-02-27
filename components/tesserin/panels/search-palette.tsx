"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  FiSearch, FiFileText, FiPlus, FiCommand, FiHash, FiCalendar,
  FiLayout, FiX, FiCompass, FiCode, FiGrid, FiSettings,
  FiCpu, FiLink2, FiClock, FiColumns, FiZap, FiStar,
} from "react-icons/fi"
import { HiOutlineSparkles } from "react-icons/hi2"
import { useNotes } from "@/lib/notes-store"
import { FuzzySearchEngine, type FuzzyResult, type SearchableItem } from "@/lib/fuzzy-search"
import { usePlugins } from "@/lib/plugin-system"

/**
 * SearchPalette v2
 *
 * A unified command palette with:
 * - Fuzzy note search with ranked scoring & highlighted matches
 * - Plugin commands integration
 * - Tab navigation shortcuts
 * - Quick note creation
 * - Categorised result sections
 * - Keyboard navigation (↑/↓, Enter, Tab, Esc)
 */

interface SearchPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelectNote: (noteId: string) => void
  onNavigateTab?: (tabId: string) => void
  onOpenSplit?: () => void
}

interface SearchResult {
  id: string
  type: "note" | "command" | "create" | "tab" | "plugin" | "action"
  title: string
  subtitle?: string
  icon: React.ReactNode
  /** Category for section grouping */
  category: string
  /** Score for sorting within category */
  score: number
  action: () => void
  /** Highlighted title spans */
  highlights?: Array<{ start: number; length: number }>
}

/* ── Tab navigation items ── */
const TAB_ITEMS = [
  { id: "notes", icon: <FiFileText size={14} />, label: "Notes", subtitle: "Open note editor" },
  { id: "canvas", icon: <FiCompass size={14} />, label: "Canvas", subtitle: "Open whiteboard" },
  { id: "graph", icon: <FiCpu size={14} />, label: "Graph", subtitle: "Knowledge graph view" },
  { id: "code", icon: <FiCode size={14} />, label: "Code", subtitle: "Code editor" },
  { id: "sam", icon: <HiOutlineSparkles size={14} />, label: "SAM", subtitle: "AI assistant" },
  { id: "settings", icon: <FiSettings size={14} />, label: "Settings", subtitle: "App preferences" },
]

/* ── Built-in commands ── */
const BUILTIN_COMMANDS = [
  { id: "cmd-new-note", label: "New Note", subtitle: "Create a blank note", icon: <FiPlus size={14} />, category: "Actions" },
  { id: "cmd-split", label: "Open Split View", subtitle: "Side-by-side editing", icon: <FiColumns size={14} />, category: "Actions" },
  { id: "cmd-backlinks", label: "Show Backlinks", subtitle: "View incoming links", icon: <FiLink2 size={14} />, category: "Actions" },
]

/* ── Highlighted text renderer ── */
function HighlightedText({ text, highlights }: { text: string; highlights?: Array<{ start: number; length: number }> }) {
  if (!highlights || highlights.length === 0) {
    return <>{text}</>
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  const sorted = [...highlights].sort((a, b) => a.start - b.start)

  for (const hl of sorted) {
    if (hl.start > lastIndex) {
      parts.push(<span key={`t-${lastIndex}`}>{text.substring(lastIndex, hl.start)}</span>)
    }
    parts.push(
      <span
        key={`h-${hl.start}`}
        style={{ color: "var(--accent-primary)", fontWeight: 600 }}
      >
        {text.substring(hl.start, hl.start + hl.length)}
      </span>
    )
    lastIndex = hl.start + hl.length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.substring(lastIndex)}</span>)
  }

  return <>{parts}</>
}

/* ── Category order for display ── */
const CATEGORY_ORDER = ["Notes", "Actions", "Tabs", "Plugins"]

export function SearchPalette({ isOpen, onClose, onSelectNote, onNavigateTab, onOpenSplit }: SearchPaletteProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const { notes, addNote } = useNotes()
  const { commands: pluginCommands } = usePlugins()

  // Build fuzzy search engine, kept in sync with notes
  const fuzzyEngine = useMemo(() => {
    const items: SearchableItem[] = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }))
    return new FuzzySearchEngine(items)
  }, [notes])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    const allResults: SearchResult[] = []

    // Detect command mode (starting with ">")
    const isCommandMode = q.startsWith(">")
    const commandQuery = isCommandMode ? q.slice(1).trim() : q

    if (!q) {
      // Show recent notes + all commands when empty
      const recent = notes.slice(0, 5).map((n): SearchResult => ({
        id: n.id,
        type: "note",
        title: n.title,
        subtitle: `Updated ${new Date(n.updatedAt).toLocaleDateString()}`,
        icon: <FiFileText size={14} />,
        category: "Notes",
        score: 100,
        action: () => onSelectNote(n.id),
      }))
      allResults.push(...recent)

      BUILTIN_COMMANDS.forEach((cmd) => {
        allResults.push({
          id: cmd.id,
          type: "command",
          title: cmd.label,
          subtitle: cmd.subtitle,
          icon: cmd.icon,
          category: "Actions",
          score: 50,
          action: () => {
            if (cmd.id === "cmd-new-note") {
              const id = addNote()
              onSelectNote(id)
            } else if (cmd.id === "cmd-split") {
              onOpenSplit?.()
            }
          },
        })
      })

      TAB_ITEMS.forEach((tab) => {
        allResults.push({
          id: `tab-${tab.id}`,
          type: "tab",
          title: `Go to ${tab.label}`,
          subtitle: tab.subtitle,
          icon: tab.icon,
          category: "Tabs",
          score: 30,
          action: () => onNavigateTab?.(tab.id),
        })
      })

      return allResults
    }

    if (isCommandMode) {
      // Command-only mode
      BUILTIN_COMMANDS
        .filter((cmd) => !commandQuery || cmd.label.toLowerCase().includes(commandQuery))
        .forEach((cmd) => {
          allResults.push({
            id: cmd.id,
            type: "command",
            title: cmd.label,
            subtitle: cmd.subtitle,
            icon: cmd.icon,
            category: "Actions",
            score: 80,
            action: () => {
              if (cmd.id === "cmd-new-note") {
                const id = addNote()
                onSelectNote(id)
              } else if (cmd.id === "cmd-split") {
                onOpenSplit?.()
              }
            },
          })
        })

      pluginCommands
        .filter((cmd) => !commandQuery || cmd.label.toLowerCase().includes(commandQuery))
        .forEach((cmd) => {
          allResults.push({
            id: `plugin-${cmd.id}`,
            type: "plugin",
            title: cmd.label,
            subtitle: cmd.category || "Plugin",
            icon: cmd.icon || <FiZap size={14} />,
            category: "Plugins",
            score: 70,
            action: () => cmd.execute(),
          })
        })

      TAB_ITEMS
        .filter((tab) => !commandQuery || tab.label.toLowerCase().includes(commandQuery))
        .forEach((tab) => {
          allResults.push({
            id: `tab-${tab.id}`,
            type: "tab",
            title: `Go to ${tab.label}`,
            subtitle: tab.subtitle,
            icon: tab.icon,
            category: "Tabs",
            score: 60,
            action: () => onNavigateTab?.(tab.id),
          })
        })

      return allResults
    }

    // ── Full search mode (notes + commands + tabs) ──

    // Fuzzy note search
    const fuzzy: FuzzyResult[] = fuzzyEngine.search(query, 12)
    fuzzy.forEach((fr) => {
      allResults.push({
        id: fr.item.id,
        type: "note",
        title: fr.item.title,
        subtitle: fr.snippet || fr.item.content.substring(0, 80).replace(/[#\n]/g, " ").trim(),
        icon: <FiFileText size={14} />,
        category: "Notes",
        score: fr.score,
        highlights: fr.titleMatches,
        action: () => onSelectNote(fr.item.id),
      })
    })

    // "Create note" option if no exact match
    const hasExactMatch = notes.some((n) => n.title.toLowerCase() === q)
    if (!hasExactMatch && query.trim()) {
      allResults.push({
        id: "create-new",
        type: "create",
        title: `Create "${query.trim()}"`,
        subtitle: "New note",
        icon: <FiPlus size={14} />,
        category: "Actions",
        score: 10,
        action: () => {
          const id = addNote(query.trim())
          onSelectNote(id)
        },
      })
    }

    // Matching commands
    BUILTIN_COMMANDS
      .filter((cmd) => cmd.label.toLowerCase().includes(q))
      .forEach((cmd) => {
        allResults.push({
          id: cmd.id,
          type: "command",
          title: cmd.label,
          subtitle: cmd.subtitle,
          icon: cmd.icon,
          category: "Actions",
          score: 40,
          action: () => {
            if (cmd.id === "cmd-new-note") {
              const id = addNote()
              onSelectNote(id)
            } else if (cmd.id === "cmd-split") {
              onOpenSplit?.()
            }
          },
        })
      })

    // Plugin commands
    pluginCommands
      .filter((cmd) => cmd.label.toLowerCase().includes(q))
      .forEach((cmd) => {
        allResults.push({
          id: `plugin-${cmd.id}`,
          type: "plugin",
          title: cmd.label,
          subtitle: cmd.category || "Plugin",
          icon: cmd.icon || <FiZap size={14} />,
          category: "Plugins",
          score: 35,
          action: () => cmd.execute(),
        })
      })

    // Matching tabs
    TAB_ITEMS
      .filter((tab) => tab.label.toLowerCase().includes(q))
      .forEach((tab) => {
        allResults.push({
          id: `tab-${tab.id}`,
          type: "tab",
          title: `Go to ${tab.label}`,
          subtitle: tab.subtitle,
          icon: tab.icon,
          category: "Tabs",
          score: 20,
          action: () => onNavigateTab?.(tab.id),
        })
      })

    return allResults
  }, [query, notes, pluginCommands, fuzzyEngine, addNote, onSelectNote, onNavigateTab, onOpenSplit])

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: { category: string; items: SearchResult[] }[] = []
    const categoryMap = new Map<string, SearchResult[]>()

    for (const result of results) {
      const items = categoryMap.get(result.category) || []
      items.push(result)
      categoryMap.set(result.category, items)
    }

    for (const cat of CATEGORY_ORDER) {
      const items = categoryMap.get(cat)
      if (items && items.length > 0) {
        groups.push({ category: cat, items: items.sort((a, b) => b.score - a.score) })
      }
    }

    for (const [cat, items] of categoryMap) {
      if (!CATEGORY_ORDER.includes(cat) && items.length > 0) {
        groups.push({ category: cat, items: items.sort((a, b) => b.score - a.score) })
      }
    }

    return groups
  }, [results])

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    return groupedResults.flatMap((g) => g.items)
  }, [groupedResults])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && flatResults[activeIndex]) {
        e.preventDefault()
        flatResults[activeIndex].action()
        onClose()
      } else if (e.key === "Escape") {
        onClose()
      } else if (e.key === "Tab") {
        e.preventDefault()
        if (!query.startsWith(">")) {
          setQuery("> ")
        } else {
          setQuery("")
        }
      }
    },
    [flatResults, activeIndex, onClose, query],
  )

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector(`[data-index="${activeIndex}"]`)
      activeEl?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  if (!isOpen) return null

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-mid)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border-dark)" }}
        >
          <FiSearch size={18} style={{ color: query.startsWith(">") ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-base focus:outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder={query.startsWith(">") ? "Type a command..." : "Search notes, commands, tabs..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search"
          />
          <div className="flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus() }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <FiX size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-mid)",
              }}
              onClick={() => setQuery(query.startsWith(">") ? "" : "> ")}
              title="Toggle command mode (Tab)"
            >
              {query.startsWith(">") ? "Search" : "> Cmd"}
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[420px] overflow-y-auto custom-scrollbar py-1">
          {flatResults.length === 0 && query.trim() ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groupedResults.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div
                  className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
                >
                  {group.category}
                </div>

                {group.items.map((result) => {
                  flatIndex++
                  const idx = flatIndex
                  const isActive = idx === activeIndex

                  return (
                    <button
                      key={result.id}
                      data-index={idx}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                        color: isActive ? "#ffffff" : "var(--text-primary)",
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        result.action()
                        onClose()
                      }}
                    >
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor:
                            result.type === "create"
                              ? "var(--accent-primary)"
                              : result.type === "plugin"
                                ? "rgba(139, 92, 246, 0.15)"
                                : isActive ? "rgba(255, 255, 255, 0.1)" : "var(--bg-panel-inset)",
                          color:
                            result.type === "create"
                              ? "var(--text-on-accent)"
                              : result.type === "plugin"
                                ? "#a78bfa"
                                : isActive ? "#ffffff" : "var(--text-secondary)",
                        }}
                      >
                        {result.icon}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          <HighlightedText text={result.title} highlights={result.highlights} />
                        </div>
                        {result.subtitle && (
                          <div
                            className="text-xs truncate"
                            style={{ color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)" }}
                          >
                            {result.subtitle}
                          </div>
                        )}
                      </div>

                      {result.type === "note" && (
                        <FiHash size={12} style={{ color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)", opacity: isActive ? 0.8 : 0.5 }} />
                      )}
                      {result.type === "command" && (
                        <FiCommand size={12} style={{ color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)", opacity: isActive ? 0.8 : 0.5 }} />
                      )}
                      {result.type === "tab" && (
                        <FiLayout size={12} style={{ color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)", opacity: isActive ? 0.8 : 0.5 }} />
                      )}
                      {result.type === "plugin" && (
                        <FiZap size={12} style={{ color: "#a78bfa", opacity: isActive ? 0.8 : 0.5 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex items-center gap-4 text-[10px] border-t"
          style={{
            borderColor: "var(--border-dark)",
            color: "var(--text-tertiary)",
          }}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>Tab</kbd> Commands
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>esc</kbd> Close
          </span>
          <span className="ml-auto flex items-center gap-1 opacity-60">
            <FiStar size={10} /> {flatResults.length} results
          </span>
        </div>
      </div>
    </div>
  )
}
