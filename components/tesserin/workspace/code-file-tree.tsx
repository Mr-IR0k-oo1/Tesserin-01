"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { FiFolder, FiFile, FiChevronRight, FiChevronDown, FiRefreshCw } from "react-icons/fi"

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

interface TreeNode extends FileEntry {
  children?: TreeNode[]
  isOpen?: boolean
  isLoading?: boolean
}

interface CodeFileTreeProps {
  rootPath: string
  onFileSelect: (filePath: string) => void
  activeFile?: string
}

// Files/folders to hide in the tree
const HIDDEN = new Set([
  "node_modules", ".git", ".DS_Store", "__pycache__", ".next",
  ".cache", "dist", "build", ".vscode", ".idea", "coverage",
  ".env", ".env.local", "thumbs.db",
])

// File extension to icon color mapping
function fileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
    py: "#3572a5", rb: "#cc342d", go: "#00add8", rs: "#dea584",
    html: "#e34c26", css: "#563d7c", scss: "#c6538c",
    json: "#eab308", md: "#083fa1", yml: "#cb171e", yaml: "#cb171e",
    sql: "#e38c00", sh: "#4eaa25", bash: "#4eaa25",
    png: "#a855f7", jpg: "#a855f7", svg: "#ffb13b",
  }
  return map[ext] || "var(--text-muted)"
}

export function CodeFileTree({ rootPath, onFileSelect, activeFile }: CodeFileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const treeRef = useRef(tree)
  treeRef.current = tree

  const loadDir = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    const api = window.tesserin
    if (!api?.fs) return []
    try {
      const entries = await api.fs.readDir(dirPath)
      return entries
        .filter(e => !HIDDEN.has(e.name))
        .map(e => ({
          ...e,
          children: e.isDirectory ? undefined : undefined,
          isOpen: false,
        }))
    } catch {
      return []
    }
  }, [])

  const loadRoot = useCallback(async () => {
    setLoading(true)
    const children = await loadDir(rootPath)
    setTree(children)
    setLoading(false)
  }, [rootPath, loadDir])

  useEffect(() => {
    if (rootPath) loadRoot()
  }, [rootPath, loadRoot])

  const toggleDir = useCallback(async (nodePath: string) => {
    const updateNode = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      const result: TreeNode[] = []
      for (const node of nodes) {
        if (node.path === nodePath && node.isDirectory) {
          if (node.isOpen) {
            result.push({ ...node, isOpen: false })
          } else {
            const children = await loadDir(node.path)
            result.push({ ...node, isOpen: true, children })
          }
        } else if (node.children) {
          result.push({ ...node, children: await updateNode(node.children) })
        } else {
          result.push(node)
        }
      }
      return result
    }
    const updated = await updateNode(treeRef.current)
    setTree(updated)
  }, [loadDir])

  const renderNode = (node: TreeNode, depth: number) => {
    const isActive = node.path === activeFile

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.isDirectory) {
              toggleDir(node.path)
            } else {
              onFileSelect(node.path)
            }
          }}
          className="w-full flex items-center gap-1 py-[3px] pr-2 text-xs transition-colors hover:bg-[var(--bg-panel-inset)] rounded-md group"
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
            background: isActive ? "rgba(234, 179, 8, 0.08)" : undefined,
          }}
        >
          {node.isDirectory ? (
            <>
              {node.isOpen
                ? <FiChevronDown size={12} className="shrink-0 opacity-50" />
                : <FiChevronRight size={12} className="shrink-0 opacity-50" />
              }
              <FiFolder size={12} className="shrink-0 text-amber-500/70" />
            </>
          ) : (
            <>
              <span className="w-3 shrink-0" />
              <FiFile size={11} className="shrink-0" style={{ color: fileColor(node.name) }} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.isDirectory && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-panel)" }}>
      <div
        className="h-8 border-b flex items-center px-3 justify-between shrink-0"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Explorer
        </span>
        <button
          onClick={loadRoot}
          className="opacity-40 hover:opacity-100 transition-opacity"
          title="Refresh"
        >
          <FiRefreshCw size={11} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <FiRefreshCw size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : tree.length === 0 ? (
          <div className="text-[10px] text-center py-8 opacity-40" style={{ color: "var(--text-muted)" }}>
            No folder open
          </div>
        ) : (
          tree.map(node => renderNode(node, 0))
        )}
      </div>
    </div>
  )
}
