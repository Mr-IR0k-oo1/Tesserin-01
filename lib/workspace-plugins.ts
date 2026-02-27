/**
 * Workspace Plugins
 *
 * Optional workspace tabs that ship with Tesserin but are disabled by default.
 * Users can enable them from Settings → Plugins.
 *
 * - Kanban: Drag-and-drop task board
 * - Daily Notes: Journaling with templates
 * - Timeline: Chronological note browser
 */

import React from "react"
import { FiGrid, FiCalendar, FiClock } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "./plugin-system"

/* ================================================================== */
/*  Kanban Plugin                                                      */
/* ================================================================== */

const LazyKanbanView = React.lazy(() =>
  import("@/components/tesserin/workspace/kanban-view").then((m) => ({ default: m.KanbanView }))
)

function KanbanPanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Kanban…") },
    React.createElement(LazyKanbanView)
  )
}

export const kanbanPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.kanban",
    name: "Kanban Board",
    version: "1.0.0",
    description: "A drag-and-drop task board for visual project management.",
    author: "Tesserin",
    icon: React.createElement(FiGrid, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "kanban",
      label: "Kanban",
      icon: React.createElement(FiGrid, { size: 18 }),
      component: KanbanPanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-kanban",
      label: "Open Kanban Board",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("kanban")
      },
    })
  },
}

/* ================================================================== */
/*  Daily Notes Plugin                                                 */
/* ================================================================== */

const LazyDailyNotes = React.lazy(() =>
  import("@/components/tesserin/workspace/daily-notes").then((m) => ({ default: m.DailyNotes }))
)

function DailyNotesPanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Daily Notes…") },
    React.createElement(LazyDailyNotes)
  )
}

export const dailyNotesPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.daily-notes",
    name: "Daily Notes",
    version: "1.0.0",
    description: "Journaling with templates — auto-creates a note for each day.",
    author: "Tesserin",
    icon: React.createElement(FiCalendar, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "daily",
      label: "Daily",
      icon: React.createElement(FiCalendar, { size: 18 }),
      component: DailyNotesPanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-daily-notes",
      label: "Open Daily Notes",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("daily")
      },
    })
  },
}

/* ================================================================== */
/*  Timeline Plugin                                                    */
/* ================================================================== */

const LazyTimelineView = React.lazy(() =>
  import("@/components/tesserin/workspace/timeline-view").then((m) => ({ default: m.TimelineView }))
)

function TimelinePanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Timeline…") },
    React.createElement(LazyTimelineView)
  )
}

export const timelinePlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.timeline",
    name: "Timeline",
    version: "1.0.0",
    description: "Browse your notes chronologically and track writing activity.",
    author: "Tesserin",
    icon: React.createElement(FiClock, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "timeline",
      label: "Timeline",
      icon: React.createElement(FiClock, { size: 18 }),
      component: TimelinePanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-timeline",
      label: "Open Timeline",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("timeline")
      },
    })
  },
}

/* ================================================================== */
/*  All workspace plugins                                              */
/* ================================================================== */

export const WORKSPACE_PLUGINS: TesserinPlugin[] = [
  kanbanPlugin,
  dailyNotesPlugin,
  timelinePlugin,
]
