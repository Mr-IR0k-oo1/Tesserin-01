"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  FiArrowRight,
  FiEdit3,
  FiGitBranch,
  FiKey,
  FiCpu,
} from "react-icons/fi"
import { TesserinLogo } from "./tesserin-logo"
import { useTesserinTheme } from "./theme-provider"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ONBOARDED_KEY = "tesserin:onboarded"

export const ONBOARDING_SAMPLE_CONTENT = `# Welcome to Tesserin ✦

> Your AI-powered knowledge workspace — local-first, endlessly powerful.

## What you can do

- 📝 **Write** — Markdown editor with vim mode, auto-save, and templates
- 🕸️ **Graph** — visualise connections between notes as an interactive force graph
- 🤖 **SAM** — chat with your local AI powered by Ollama (runs 100% offline)
- 🎨 **Canvas** — freeform drawing and whiteboarding with Excalidraw
- 🔌 **MCP** — connect Claude, Cursor, and VS Code Copilot to your vault via Docker

## Getting Started

Try creating a second note and linking back to this one with [[wiki links]] — the graph updates in real time.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | Ctrl+K |
| Export | Ctrl+E |
| Templates | Ctrl+T |
| Backlinks | Ctrl+Shift+B |
| Daily Note | Ctrl+Shift+D |
| Split pane | Ctrl+\\ |

## Connect your AI

1. Install [Ollama](https://ollama.ai) and pull a model: \`ollama pull llama3.2\`
2. Open **Settings → AI** and click **Test Connection**
3. Open the SAM chat (the ✦ button, bottom-right) and start chatting

---

*Made with ✦ for knowledge workers · 100% local · MIT License*`

/* ------------------------------------------------------------------ */
/*  Feature cards                                                       */
/* ------------------------------------------------------------------ */

const FEATURES: Array<{
  icon: React.ReactNode
  title: string
  desc: string
}> = [
  {
    icon: <FiEdit3 size={20} />,
    title: "Markdown Editor",
    desc: "Write with syntax highlighting, wiki-links, and auto-save.",
  },
  {
    icon: <FiGitBranch size={20} />,
    title: "Knowledge Graph",
    desc: "Watch connections between your notes form in real time.",
  },
  {
    icon: <FiCpu size={20} />,
    title: "SAM — Local AI",
    desc: "Ask questions, summarise, generate tags. 100% offline.",
  },
  {
    icon: <FiKey size={20} />,
    title: "API & MCP",
    desc: "Connect Claude, Cursor, and VS Code Copilot to your vault.",
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface OnboardingWelcomeProps {
  onDone: (navigate?: "notes" | "graph" | "settings") => void
}

/**
 * OnboardingWelcome
 *
 * Full-screen first-run overlay shown when the vault is empty and the
 * user has not previously dismissed onboarding.
 *
 * "Create your first note" creates a sample note with Markdown content
 * and navigates to the Notes tab. "Skip" just dismisses the overlay.
 *
 * State is persisted in localStorage under `tesserin:onboarded`.
 */
export function OnboardingWelcome({ onDone }: OnboardingWelcomeProps) {
  const { isDark } = useTesserinTheme()
  const gold = isDark ? "#FACC15" : "#d4a829"
  const textMuted = isDark
    ? "rgba(255,255,255,0.4)"
    : "rgba(44,42,38,0.55)"

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDED_KEY, "true")
    onDone("notes")
  }

  const handleSkip = () => {
    localStorage.setItem(ONBOARDED_KEY, "true")
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto p-4"
      style={{
        backgroundColor: isDark
          ? "rgba(5,5,5,0.88)"
          : "rgba(248,246,241,0.88)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl p-8 flex flex-col items-center"
        style={{
          background: isDark ? "#0c0c0c" : "#fdfcf8",
          border: `1px solid ${
            isDark
              ? "rgba(250,204,21,0.14)"
              : "rgba(212,168,41,0.2)"
          }`,
          boxShadow: `0 40px 100px ${
            isDark
              ? "rgba(0,0,0,0.7)"
              : "rgba(100,80,30,0.12)"
          }`,
        }}
      >
        {/* Top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 rounded-full pointer-events-none"
          style={{
            width: 240,
            height: 100,
            background: `radial-gradient(ellipse, ${
              isDark
                ? "rgba(250,204,21,0.1)"
                : "rgba(212,168,41,0.07)"
            } 0%, transparent 70%)`,
          }}
        />

        {/* Logo + heading */}
        <TesserinLogo size={52} animated />
        <h1
          className="mt-4 text-2xl font-bold tracking-wide"
          style={{ color: gold }}
        >
          Welcome to Tesserin
        </h1>
        <p
          className="mt-2 text-sm text-center max-w-sm leading-relaxed"
          style={{ color: textMuted }}
        >
          Your knowledge workspace. Write, connect, and explore ideas —
          everything stays on your machine.
        </p>

        {/* Feature cards */}
        <div className="mt-7 grid grid-cols-2 gap-2.5 w-full">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-3.5 rounded-xl flex items-start gap-3"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(0,0,0,0.025)",
                border: `1px solid ${
                  isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)"
                }`,
              }}
            >
              <span style={{ color: gold, marginTop: 1, flexShrink: 0 }}>
                {f.icon}
              </span>
              <div>
                <div
                  className="text-[11px] font-bold mb-0.5"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.85)" : "#1a1a1a",
                  }}
                >
                  {f.title}
                </div>
                <div
                  className="text-[10px] leading-relaxed"
                  style={{ color: textMuted }}
                >
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="mt-7 flex items-center gap-3 w-full">
          <button
            onClick={handleGetStarted}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)",
              color: "#1a1a1a",
              boxShadow: "0 0 28px rgba(250,204,21,0.28)",
            }}
          >
            Create your first note
            <FiArrowRight size={15} />
          </button>
          <button
            onClick={handleSkip}
            className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:brightness-105 active:scale-[0.98]"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.04)",
              border: `1px solid ${
                isDark
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.07)"
              }`,
              color: textMuted,
            }}
          >
            Skip
          </button>
        </div>

        <p
          className="mt-5 text-[9px] text-center"
          style={{
            color: isDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(44,42,38,0.2)",
          }}
        >
          100% local · your data never leaves your machine · MIT License
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Returns true once (after DB loading is done) if the vault is empty
 * and the user has never been onboarded before.
 */
export function useOnboarding(noteCount: number, isLoading: boolean) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (isLoading || checkedRef.current) return
    checkedRef.current = true
    if (
      noteCount === 0 &&
      localStorage.getItem(ONBOARDED_KEY) !== "true"
    ) {
      setShowOnboarding(true)
    }
  }, [isLoading, noteCount])

  return { showOnboarding, dismissOnboarding: () => setShowOnboarding(false) }
}
