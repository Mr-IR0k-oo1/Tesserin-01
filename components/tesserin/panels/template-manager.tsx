"use client"

import React, { useState, useCallback } from "react"
import { FiPlus, FiCheck, FiClipboard, FiTarget, FiBook, FiCalendar, FiTrendingUp, FiCpu, FiMessageSquare, FiFileText, FiX } from "react-icons/fi"
import { useNotes } from "@/lib/notes-store"

/**
 * TemplateManager
 *
 * Pre-built note templates for common use cases.
 * Allows creating notes from templates instantly.
 */

interface TemplateManagerProps {
    isOpen: boolean
    onClose: () => void
    onCreateNote: (noteId: string) => void
}

interface Template {
    id: string
    name: string
    category: string
    icon: React.ElementType
    content: string
}

const BUILT_IN_TEMPLATES: Template[] = [
    {
        id: "tpl-meeting",
        name: "Meeting Notes",
        category: "Work",
        icon: FiClipboard,
        content: `# Meeting Notes — {{date}}

## Attendees
- 

## Agenda
1. 

## Discussion Points
- 

## Action Items
- [ ] 

## Follow-up
- Next meeting: 
`,
    },
    {
        id: "tpl-project",
        name: "Project Plan",
        category: "Work",
        icon: FiTarget,
        content: `# Project: {{title}}

## Overview
Brief description of the project.

## Goals
1. 
2. 
3. 

## Timeline
| Phase | Dates | Status |
|-------|-------|--------|
| Planning | | ⬜ |
| Development | | ⬜ |
| Testing | | ⬜ |
| Launch | | ⬜ |

## Resources
- 

## Risks & Mitigations
- 
`,
    },
    {
        id: "tpl-research",
        name: "Research Note",
        category: "Learning",
        icon: FiFileText,
        content: `# Research: {{title}}

## Key Question
What am I trying to understand?

## Sources
1. 

## Key Findings
- 

## Connections
- Related to: [[]]

## Open Questions
- 
`,
    },
    {
        id: "tpl-book",
        name: "Book Notes",
        category: "Learning",
        icon: FiBook,
        content: `# Book: {{title}}

**Author:** 
**Rating:** ⭐⭐⭐⭐⭐

## Summary
One-paragraph summary.

## Key Ideas
1. 
2. 
3. 

## Favorite Quotes
> 

## How This Applies
- 

## Related
- [[]]
`,
    },
    {
        id: "tpl-weekly",
        name: "Weekly Review",
        category: "Productivity",
        icon: FiCalendar,
        content: `# Weekly Review — Week of {{date}}

## 🏆 Wins
- 

## 📝 Lessons Learned
- 

## 📊 Goals Review
- [ ] Goal 1: 
- [ ] Goal 2: 
- [ ] Goal 3: 

## 🎯 Next Week's Focus
1. 
2. 
3. 

## 💡 Ideas & Thoughts
- 
`,
    },
    {
        id: "tpl-decision",
        name: "Decision Log",
        category: "Productivity",
        icon: FiTrendingUp,
        content: `# Decision: {{title}}

**Date:** {{date}}
**Status:** 🟡 Pending

## Context
What situation prompted this decision?

## Options Considered
| Option | Pros | Cons |
|--------|------|------|
| A | | |
| B | | |
| C | | |

## Decision
What was decided and why.

## Expected Outcome
- 

## Review Date
- 
`,
    },
    {
        id: "tpl-brainstorm",
        name: "Brainstorm",
        category: "Creative",
        icon: FiMessageSquare,
        content: `# Brainstorm: {{title}}

## Central Question
What are we brainstorming about?

## Ideas
1. 
2. 
3. 
4. 
5. 

## Clusters / Themes
- **Theme A:** 
- **Theme B:** 

## Top 3 to Explore
1. 
2. 
3. 

## Next Steps
- 
`,
    },
    {
        id: "tpl-zettel",
        name: "Zettelkasten Note",
        category: "Knowledge",
        icon: FiCpu,
        content: `# {{title}}

## Idea
State the core idea in one clear sentence.

## Elaboration
Expand on the idea with your own understanding.

## Evidence / Sources
- 


## Connections
- Supports: [[]]
- Contradicts: [[]]
- Relates to: [[]]

## Questions
- 
`,
    },
]

export function TemplateManager({ isOpen, onClose, onCreateNote }: TemplateManagerProps) {
    const { addNote, updateNote } = useNotes()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [createdId, setCreatedId] = useState<string | null>(null)

    const categories = [...new Set(BUILT_IN_TEMPLATES.map((t) => t.category))]

    const filteredTemplates = selectedCategory
        ? BUILT_IN_TEMPLATES.filter((t) => t.category === selectedCategory)
        : BUILT_IN_TEMPLATES

    const createFromTemplate = useCallback(
        (template: Template) => {
            const now = new Date()
            const dateStr = now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })
            const title = template.name + " — " + now.toLocaleDateString()
            const content = template.content
                .replace(/\{\{date\}\}/g, dateStr)
                .replace(/\{\{title\}\}/g, title)

            const id = addNote(title)
            // Update with template content
            updateNote(id, { content })

            setCreatedId(template.id)
            setTimeout(() => {
                setCreatedId(null)
                onCreateNote(id)
                onClose()
            }, 600)
        },
        [addNote, updateNote, onCreateNote, onClose],
    )

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[90] flex items-start justify-center pt-[8vh]"
            onClick={onClose}
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col"
                style={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-mid)",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                    maxHeight: "70vh",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-4 py-3 border-b"
                    style={{ borderColor: "var(--border-dark)" }}
                >
                    <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                        Templates
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {BUILT_IN_TEMPLATES.length} built-in
                    </span>
                    <button onClick={onClose} className="ml-2" style={{ color: "var(--text-tertiary)" }}>
                        <FiX size={14} />
                    </button>
                </div>

                {/* Category filter */}
                <div
                    className="flex items-center gap-1.5 px-4 py-2.5 border-b overflow-x-auto"
                    style={{ borderColor: "var(--border-dark)" }}
                >
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className="shrink-0 px-2.5 py-1 rounded-full text-[11px] transition-colors"
                        style={{
                            backgroundColor: !selectedCategory ? "var(--bg-panel-inset)" : "transparent",
                            color: !selectedCategory ? "var(--text-primary)" : "var(--text-tertiary)",
                            border: "1px solid",
                            borderColor: !selectedCategory ? "var(--border-mid)" : "transparent",
                        }}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] transition-colors"
                            style={{
                                backgroundColor: selectedCategory === cat ? "var(--bg-panel-inset)" : "transparent",
                                color: selectedCategory === cat ? "var(--text-primary)" : "var(--text-tertiary)",
                                border: "1px solid",
                                borderColor: selectedCategory === cat ? "var(--border-mid)" : "transparent",
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Template list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                    {filteredTemplates.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => createFromTemplate(tpl)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <tpl.icon size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                            <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                                {tpl.name}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                {tpl.category}
                            </span>
                            {createdId === tpl.id
                                ? <FiCheck size={13} className="text-green-500 shrink-0" />
                                : <FiPlus size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                            }
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <div
                    className="px-4 py-2 text-[10px] border-t"
                    style={{ borderColor: "var(--border-dark)", color: "var(--text-tertiary)" }}
                >
                    Click a template to create a new note · Esc to close
                </div>
            </div>
        </div>
    )
}
