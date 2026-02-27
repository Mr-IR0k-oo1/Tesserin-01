"use client"
import React, { useEffect, useRef } from "react"
import { Terminal as XTerminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"

interface CodeTerminalProps {
  cwd?: string
  isDark: boolean
}

const DARK_THEME = {
  background: "#0a0a0a",
  foreground: "#e0e0e0",
  cursor: "#eab308",
  selectionBackground: "rgba(234, 179, 8, 0.25)",
  black: "#1a1a1a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e0e0e0",
  brightBlack: "#666666",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde68a",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
}

const LIGHT_THEME = {
  background: "#fafafa",
  foreground: "#1a1c20",
  cursor: "#ca8a04",
  selectionBackground: "rgba(234, 179, 8, 0.15)",
  black: "#1a1c20",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  blue: "#2563eb",
  magenta: "#9333ea",
  cyan: "#0891b2",
  white: "#f5f5f4",
  brightBlack: "#94a3b8",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#3b82f6",
  brightMagenta: "#a855f7",
  brightCyan: "#06b6d4",
  brightWhite: "#ffffff",
}

export function CodeTerminal({ cwd, isDark }: CodeTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const termIdRef = useRef<string | null>(null)
  const cleanupRef = useRef<Array<() => void>>([])

  // Create terminal and spawn PTY — only when cwd changes (or on first mount)
  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerminal({
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      cursorBlink: true,
      cursorStyle: "bar",
      allowProposedApi: true,
      theme: isDark ? DARK_THEME : LIGHT_THEME,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    requestAnimationFrame(() => {
      try { fitAddon.fit() } catch {}
    })

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Spawn PTY in Electron
    const api = window.tesserin
    if (api?.terminal) {
      api.terminal.spawn(cwd).then(({ id }) => {
        termIdRef.current = id

        const offData = api.terminal!.onData(id, (data) => {
          term.write(data)
        })
        cleanupRef.current.push(offData)

        const offExit = api.terminal!.onExit(id, () => {
          term.write("\r\n\x1b[33m[Process exited]\x1b[0m\r\n")
        })
        cleanupRef.current.push(offExit)

        const dataDisposable = term.onData((data) => {
          api.terminal!.write(id, data)
        })
        cleanupRef.current.push(() => dataDisposable.dispose())

        const resizeDisposable = term.onResize(({ cols, rows }) => {
          api.terminal!.resize(id, cols, rows)
        })
        cleanupRef.current.push(() => resizeDisposable.dispose())
      }).catch((err) => {
        term.write(`\x1b[31mFailed to spawn shell: ${err}\x1b[0m\r\n`)
      })
    } else {
      term.write("Terminal not available (running in browser mode)\r\n")
    }

    const observer = new ResizeObserver(() => {
      try { fitAddon.fit() } catch {}
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
      if (termIdRef.current && api?.terminal) {
        api.terminal.kill(termIdRef.current)
      }
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      termIdRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd]) // Only recreate when cwd changes, NOT on theme change

  // Update theme without recreating terminal
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = isDark ? DARK_THEME : LIGHT_THEME
    }
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ padding: "4px 0 0 4px" }}
    />
  )
}
