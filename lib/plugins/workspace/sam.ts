/**
 * SAM Plugin — Offline AI (com.tesserin.sam)
 *
 * Extracts the built-in SAM (Semantic AI Model) assistant into an optional
 * workspace plugin.  When enabled the user gets:
 *   • A "SAM" workspace tab (full-screen chat + tool-use view)
 *   • A floating AI chat bubble anchored to the bottom-right corner
 *   • A keyboard command to open SAM from the command palette
 *
 * Users who rely on external agents via MCP can simply leave this plugin
 * disabled — it has zero runtime cost when off.
 */

import React from "react"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

// ── Lazy imports — code-split away from the core bundle ──────────────────────

const LazySAMNode = React.lazy(() =>
  import("@/components/tesserin/workspace/sam-node").then((m) => ({
    default: m.SAMNode,
  })),
)

const LazyFloatingAIChat = React.lazy(() =>
  import("@/components/tesserin/panels/floating-ai-chat").then((m) => ({
    default: m.FloatingAIChat,
  })),
)

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function SAMPanel() {
  return React.createElement(
    React.Suspense,
    {
      fallback: React.createElement(
        "div",
        {
          className: "flex items-center justify-center h-full",
          style: { color: "var(--text-tertiary)" },
        },
        "Loading SAM…",
      ),
    },
    React.createElement(LazySAMNode),
  )
}

/**
 * Floating chat widget — rendered inside the status-bar DOM slot but uses
 * `position: fixed` internally so it escapes the bar and sits at the
 * bottom-right corner of the viewport.
 */
function FloatingChatWidget() {
  return React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyFloatingAIChat),
  )
}

// ── SAM icon (scribbled sparkles) ─────────────────────────────────────────────

/** Inline SVG so the plugin has zero extra icon-library weight. */
function SparklesIcon({ size = 20 }: { size?: number }) {
  return React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
    },
    React.createElement("path", {
      d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09z",
    }),
    React.createElement("path", {
      d: "M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z",
    }),
  )
}

// ── Plugin definition ─────────────────────────────────────────────────────────

const samPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.sam",
    name: "Offline AI (SAM)",
    version: "1.0.0",
    description:
      "SAM — Semantic AI Model. A local, privacy-first AI assistant powered by Ollama. " +
      "Chat with your notes, auto-summarise content, and generate tags without sending " +
      "data to the cloud. No subscription required — just run Ollama locally.",
    author: "Tesserin",
    icon: React.createElement(SparklesIcon, { size: 16 }),
    permissions: [
      "vault:read",
      "vault:write",
      "settings:read",
      "settings:write",
      "ui:notify",
      "commands",
      "panels",
      "agent:tools",
      "ai:access",
      "events",
    ],
  },

  activate(api: TesserinPluginAPI) {
    // 1. Workspace tab — full SAM chat view
    api.registerPanel({
      id: "sam",
      label: "SAM",
      icon: React.createElement(SparklesIcon, { size: 18 }),
      component: SAMPanel,
      location: "workspace",
    })

    // 2. Floating chat bubble — renders as a fixed overlay via the status bar slot
    api.registerStatusBarWidget({
      id: "sam-floating-chat",
      component: FloatingChatWidget,
      align: "right",
      priority: 0,
    })

    // 3. Command palette entry
    api.registerCommand({
      id: "open-sam",
      label: "Open SAM — Offline AI",
      category: "AI",
      icon: React.createElement(SparklesIcon, { size: 14 }),
      execute() {
        api.ui.navigateToTab("sam")
      },
    })
  },
}

export default samPlugin
