"use client"

import React, { createContext, useContext, useCallback, useState, useEffect } from "react"
import { getSetting, setSetting } from "@/lib/storage-client"/**
 * TesserinThemeContext
 *
 * Provides a centralized, reactive theme toggle for the Tesserin
 * skeuomorphic design system. The two palettes are:
 *
 *  - **Ceramic White** (light) – soft shadows, warm inset panels
 *  - **Obsidian Black** (dark) – deep shadow depth, matte-black panels
 *
 * CSS custom properties are injected via a `<style>` block so that
 * every descendant can reference `var(--bg-app)`, `var(--accent-primary)`,
 * etc. without any build-time configuration.
 */

interface ThemeContextValue {
  /** `true` when the Obsidian (dark) palette is active */
  isDark: boolean
  /** Toggle between Ceramic White (Warm Ivory) and Obsidian Black */
  toggleTheme: () => void
  /** Explicitly set the theme string */
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => { },
  setTheme: () => { },
})

/** Hook to consume the Tesserin theme context */
export const useTesserinTheme = () => useContext(ThemeContext)

/* ------------------------------------------------------------------ */
/*  CSS custom-property definitions for both palettes                  */
/* ------------------------------------------------------------------ */

const THEME_STYLES = `
  :root { --transition-speed: 0.4s; }

  .theme-dark {
    /* OBSIDIAN BLACK PALETTE */
    --bg-app: #050505;
    --bg-panel: linear-gradient(145deg, #111111, #080808);
    --bg-panel-inset: #000000;

    --text-primary: #ededed;
    --text-secondary: #888888;
    --text-tertiary: #444444;
    --text-on-accent: #000000;

    --accent-primary: #FACC15;
    --accent-pressed: #EAB308;

    --border-light: rgba(255, 255, 255, 0.06);
    --border-dark: rgba(0, 0, 0, 0.8);

    --panel-outer-shadow: 5px 5px 15px #000000, -1px -1px 4px #1c1c1c;
    --btn-shadow: 4px 4px 8px #000000, -1px -1px 3px #1f1f1f;
    --input-inner-shadow: inset 2px 2px 5px #000000, inset -1px -1px 2px #1a1a1a;

    --graph-node: #333333;
    --graph-link: #333333;
    --code-bg: #000000;
  }

  .theme-light {
    /* WARM IVORY PALETTE */
    --bg-app: #fdfbf7;
    --bg-panel: linear-gradient(145deg, #ffffff, #f9f6f0);
    --bg-panel-inset: #f1ebd9;

    --text-primary: #2d2a26;
    --text-secondary: #7a756b;
    --text-tertiary: #a8a399;
    --text-on-accent: #1a1c20;

    --accent-primary: #FACC15;
    --accent-pressed: #EAB308;

    --border-light: rgba(255, 255, 255, 0.8);
    --border-dark: rgba(0, 0, 0, 0.06);

    --panel-outer-shadow: 12px 12px 24px #e3dfd3, -12px -12px 24px #ffffff;
    --btn-shadow: 6px 6px 12px #e3dfd3, -6px -6px 12px #ffffff;
    --input-inner-shadow: inset 5px 5px 10px #e3dfd3, inset -5px -5px 10px #ffffff;

    --graph-node: #e6e2d8;
    --graph-link: #d9d5cb;
    --code-bg: #f9f8f4;
  }

  /* ------------------------------------------------------------------ */
  /*  Skeuomorphic utility classes                                       */
  /* ------------------------------------------------------------------ */

  .skeuo-panel {
    background: var(--bg-panel);
    box-shadow: var(--panel-outer-shadow);
    border: 1px solid var(--border-light);
    border-bottom-color: var(--border-dark);
    border-radius: 20px;
    transition: all var(--transition-speed);
  }

  .skeuo-inset {
    background: var(--bg-panel-inset);
    box-shadow: var(--input-inner-shadow);
    border-radius: 14px;
    border: 1px solid transparent;
    border-bottom-color: rgba(255,255,255,0.5);
    transition: all var(--transition-speed);
  }

  .skeuo-btn {
    background: var(--bg-panel);
    box-shadow: var(--btn-shadow);
    color: var(--text-secondary);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-light);
    border-bottom-color: var(--border-dark);
    border-radius: 14px;
    cursor: pointer;
  }

  .skeuo-btn:active, .skeuo-btn.active {
    box-shadow: var(--input-inner-shadow);
    color: var(--text-on-accent);
    background: var(--accent-primary);
    transform: translateY(1px);
    border-color: transparent;
  }

  .skeuo-btn:hover:not(.active):not(:active) {
    transform: translateY(-2px);
    color: var(--text-primary);
  }

  /* Custom scrollbar */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--text-tertiary);
    border-radius: 10px;
    border: 2px solid var(--bg-app);
  }

  /* LED indicator (used in AudioDeck) */
  .led-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    box-shadow: 0 0 5px #ef4444, inset 1px 1px 2px rgba(255,255,255,0.5);
    border: 1px solid rgba(0,0,0,0.2);
  }
  .led-indicator.on {
    background-color: #22c55e;
    box-shadow: 0 0 8px #22c55e, inset 1px 1px 2px rgba(255,255,255,0.8);
  }

  /* Spin-reverse keyframe for the logo */
  @keyframes animate-spin-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  /* Loading bar animation */
  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
  }

  /* Loading screen animations */
  @keyframes loading-progress {
    0%   { width: 0%; }
    100% { width: 100%; }
  }

  @keyframes loading-pulse {
    0%, 100% { opacity: 0.4; transform: translate(-50%, -60%) scale(1); }
    50%      { opacity: 1; transform: translate(-50%, -60%) scale(1.15); }
  }

  @keyframes loading-float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
    50%      { transform: translateY(-18px) scale(1.3); opacity: 0.7; }
  }

  /* ── Global UI readability ────────────────────────────────── */
  html {
    /* Use 18px root instead of browser default 16px.
       All rem-based Tailwind utilities (text-xs, text-sm, etc.)
       and spacing scale up proportionally without breaking
       viewport-height layouts (no zoom overflow). */
    font-size: 18px;
  }

  .theme-dark, .theme-light {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Floor tiny pixel text sizes for comfortable reading */
  .text-\[9px\]  { font-size: 11px !important; }
  .text-\[10px\] { font-size: 12px !important; }
  .text-\[11px\] { font-size: 13px !important; }
`

/* ------------------------------------------------------------------ */
/*  Provider component                                                 */
/* ------------------------------------------------------------------ */

interface ThemeProviderProps {
  children: React.ReactNode
}

export function TesserinThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() => {
    // Attempt synchronous hydration from browser localStorage to prevent flash
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("tesserin:settings")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed["appearance.theme"]) return parsed["appearance.theme"]
        }
      }
    } catch { }
    return "dark"
  })

  useEffect(() => {
    getSetting("appearance.theme").then((val) => {
      if (val) setThemeState(val)
    })
  }, [])

  const isDark = theme === "dark"

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setThemeState(newTheme)
    setSetting("appearance.theme", newTheme).catch()
  }, [theme])

  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme)
    setSetting("appearance.theme", newTheme).catch()
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      <div className={theme === "dark" ? "theme-dark" : "theme-light"}>
        {/* Inject custom properties into the document */}
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
