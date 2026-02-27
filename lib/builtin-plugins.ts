/**
 * Built-in Tesserin Plugins
 *
 * These ship with Tesserin and demonstrate the plugin API.
 * Users can disable them; developers can study them as reference.
 */

import React from "react"
import type { TesserinPlugin, TesserinPluginAPI } from "./plugin-system"
import { WORKSPACE_PLUGINS } from "./workspace-plugins"

/* ================================================================== */
/*  1. Word Count Plugin                                               */
/* ================================================================== */

export const wordCountPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.word-count",
    name: "Word Count",
    version: "1.0.0",
    description: "Shows live word, character, and reading time stats in the status bar.",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    api.registerStatusBarWidget({
      id: "word-count",
      align: "right",
      priority: 10,
      component: function WordCountWidget() {
        const note = api.vault.getSelected()
        if (!note) return null

        const text = note.content.replace(/^#.*$/gm, "").trim()
        const words = text.split(/\s+/).filter(Boolean).length
        const chars = text.length
        const readMin = Math.max(1, Math.ceil(words / 200))

        return React.createElement("div", {
          className: "flex items-center gap-3 text-[11px]",
          style: { color: "var(--text-tertiary)" },
        },
          React.createElement("span", null, `${words} words`),
          React.createElement("span", { style: { opacity: 0.3 } }, "·"),
          React.createElement("span", null, `${chars} chars`),
          React.createElement("span", { style: { opacity: 0.3 } }, "·"),
          React.createElement("span", null, `${readMin} min read`),
        )
      },
    })

    api.registerCommand({
      id: "show-word-count",
      label: "Show Word Count",
      category: "Editor",
      execute() {
        const note = api.vault.getSelected()
        if (!note) {
          api.ui.showNotice("No note selected")
          return
        }
        const words = note.content.split(/\s+/).filter(Boolean).length
        api.ui.showNotice(`${words} words in "${note.title}"`)
      },
    })
  },
}

/* ================================================================== */
/*  2. Daily Quote Plugin                                              */
/* ================================================================== */

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Knowledge is of no value unless you put it into practice.", author: "Anton Chekhov" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Research is formalized curiosity. It is poking and prying with a purpose.", author: "Zora Neale Hurston" },
  { text: "Writing is thinking. To write well is to think clearly.", author: "David McCullough" },
  { text: "The art of writing is the art of discovering what you believe.", author: "Gustave Flaubert" },
  { text: "All models are wrong, but some are useful.", author: "George E.P. Box" },
  { text: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
  { text: "The purpose of writing is to inflate weak ideas, obscure pure reasoning, and inhibit clarity.", author: "Calvin (Bill Watterson)" },
]

export const dailyQuotePlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.daily-quote",
    name: "Daily Quote",
    version: "1.0.0",
    description: "Shows an inspirational quote for researchers in the status bar.",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    const todayIndex = new Date().getDate() % QUOTES.length
    const quote = QUOTES[todayIndex]

    api.registerStatusBarWidget({
      id: "daily-quote",
      align: "center",
      priority: 50,
      component: function DailyQuoteWidget() {
        return React.createElement("div", {
          className: "text-[10px] italic truncate max-w-md",
          style: { color: "var(--text-tertiary)", opacity: 0.7 },
          title: `— ${quote.author}`,
        },
          `"${quote.text}" — ${quote.author}`,
        )
      },
    })
  },
}

/* ================================================================== */
/*  3. Backlinks Plugin                                                */
/* ================================================================== */

export const backlinksPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.backlinks",
    name: "Backlinks",
    version: "1.0.0",
    description: "Shows which notes link to the currently selected note via [[wiki-links]].",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    api.registerCommand({
      id: "show-backlinks",
      label: "Show Backlinks",
      category: "Notes",
      shortcut: "Ctrl+Shift+B",
      execute() {
        const note = api.vault.getSelected()
        if (!note) {
          api.ui.showNotice("No note selected")
          return
        }

        const allNotes = api.vault.list()
        const backlinks = allNotes.filter((n) => {
          if (n.id === note.id) return false
          const regex = /\[\[([^\]]+)\]\]/g
          let match: RegExpExecArray | null
          while ((match = regex.exec(n.content)) !== null) {
            if (match[1].trim().toLowerCase() === note.title.toLowerCase()) return true
          }
          return false
        })

        if (backlinks.length === 0) {
          api.ui.showNotice(`No backlinks found for "${note.title}"`)
        } else {
          api.ui.showNotice(`${backlinks.length} backlinks: ${backlinks.map((n) => n.title).join(", ")}`)
        }
      },
    })
  },
}

/* ================================================================== */
/*  All built-in plugins                                               */
/* ================================================================== */

/** Core plugins — always active */
export const BUILT_IN_PLUGINS: TesserinPlugin[] = [
  wordCountPlugin,
  dailyQuotePlugin,
  backlinksPlugin,
]

/** Optional workspace plugins — enabled/disabled by user in Settings → Plugins */
export { WORKSPACE_PLUGINS } from "./workspace-plugins"
