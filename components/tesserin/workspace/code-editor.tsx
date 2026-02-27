"use client"
import React, { useEffect, useRef, useCallback } from "react"
import { EditorState, Compartment } from "@codemirror/state"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"

export type LanguageId = "javascript" | "typescript" | "python" | "html" | "css" | "json" | "markdown" | "plaintext"

const LANGUAGE_EXTENSIONS: Record<string, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  json: () => json(),
  markdown: () => markdown(),
}

export function detectLanguage(filename: string): LanguageId {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, LanguageId> = {
    js: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", mts: "typescript", cts: "typescript",
    jsx: "javascript", tsx: "typescript",
    py: "python",
    html: "html", htm: "html", svelte: "html", vue: "html",
    css: "css", scss: "css", less: "css",
    json: "json", jsonc: "json",
    md: "markdown", mdx: "markdown",
  }
  return map[ext] || "plaintext"
}

/** Maps file extension to the CodeMirror language key */
function langKeyFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, string> = {
    js: "javascript", mjs: "javascript", cjs: "javascript",
    jsx: "jsx",
    ts: "typescript", mts: "typescript", cts: "typescript",
    tsx: "tsx",
    py: "python",
    html: "html", htm: "html", svelte: "html", vue: "html",
    css: "css", scss: "css", less: "css",
    json: "json", jsonc: "json",
    md: "markdown", mdx: "markdown",
  }
  return map[ext] || ""
}

// Tesserin-matched dark theme that complements skeuomorphic UI
const tesserinDarkTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-muted)",
    borderRight: "1px solid var(--border-dark)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-panel-inset)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(234, 179, 8, 0.04)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(234, 179, 8, 0.15) !important",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
  },
}, { dark: true })

const tesserinLightTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-muted)",
    borderRight: "1px solid var(--border-dark)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-panel-inset)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(234, 179, 8, 0.06)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(234, 179, 8, 0.12) !important",
  },
}, { dark: false })

interface CodeEditorProps {
  content: string
  filename: string
  isDark: boolean
  onChange?: (content: string) => void
  onSave?: (content: string) => void
}

export function CodeEditor({ content, filename, isDark, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const themeCompartmentRef = useRef(new Compartment())

  onChangeRef.current = onChange
  onSaveRef.current = onSave

  // Create editor on mount / filename change
  useEffect(() => {
    if (!containerRef.current) return

    const langKey = langKeyFromFilename(filename)
    const langExt = LANGUAGE_EXTENSIONS[langKey]
    const themeCompartment = new Compartment()
    themeCompartmentRef.current = themeCompartment

    const saveKeymap = keymap.of([{
      key: "Mod-s",
      run: (view) => {
        onSaveRef.current?.(view.state.doc.toString())
        return true
      },
    }])

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString())
      }
    })

    const themeExtensions = isDark
      ? [oneDark, tesserinDarkTheme]
      : [syntaxHighlighting(defaultHighlightStyle), tesserinLightTheme]

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      rectangularSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      foldGutter(),
      highlightSelectionMatches(),
      history(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      themeCompartment.of(themeExtensions),
      saveKeymap,
      updateListener,
    ]

    if (langExt) extensions.push(langExt())

    const state = EditorState.create({
      doc: content,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]) // Only recreate when file changes

  // Update theme dynamically without recreating editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const themeExtensions = isDark
      ? [oneDark, tesserinDarkTheme]
      : [syntaxHighlighting(defaultHighlightStyle), tesserinLightTheme]
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(themeExtensions),
    })
  }, [isDark])

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      })
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
    />
  )
}
