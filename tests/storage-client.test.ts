import { describe, it, expect } from 'vitest'

/**
 * Storage client tests — unit-testing the localStorage fallback paths.
 * The Electron IPC paths are integration-tested separately.
 */

// We import after ensuring no window.tesserin.db so the localStorage fallback is used
describe('storage-client (localStorage fallback)', () => {
  beforeEach(() => {
    localStorage.clear()
    // Ensure the Electron bridge is not available so we exercise the fallback
    ;(window as any).tesserin = undefined
  })

  it('creates and retrieves a note', async () => {
    const { createNote, listNotes, getNote } = await import('@/lib/storage-client')

    const note = await createNote({ title: 'Test Note', content: 'Hello world' })
    expect(note.title).toBe('Test Note')
    expect(note.content).toBe('Hello world')
    expect(note.id).toBeTruthy()

    const all = await listNotes()
    expect(all.length).toBeGreaterThanOrEqual(1)
    expect(all.find(n => n.id === note.id)).toBeTruthy()

    const fetched = await getNote(note.id)
    expect(fetched).toBeTruthy()
    expect(fetched!.title).toBe('Test Note')
  })

  it('updates a note', async () => {
    const { createNote, updateNote, getNote } = await import('@/lib/storage-client')

    const note = await createNote({ title: 'Original', content: '' })
    await updateNote(note.id, { title: 'Updated', content: 'New content' })

    const fetched = await getNote(note.id)
    expect(fetched!.title).toBe('Updated')
    expect(fetched!.content).toBe('New content')
  })

  it('deletes a note', async () => {
    const { createNote, deleteNote, listNotes } = await import('@/lib/storage-client')

    const note = await createNote({ title: 'To Delete', content: '' })
    await deleteNote(note.id)

    const all = await listNotes()
    expect(all.find(n => n.id === note.id)).toBeUndefined()
  })

  it('searches notes by content', async () => {
    const { createNote, searchNotes } = await import('@/lib/storage-client')

    await createNote({ title: 'Alpha', content: 'unique-search-term' })
    await createNote({ title: 'Beta', content: 'nothing here' })

    const results = await searchNotes('unique-search-term')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Alpha')
  })

  it('creates and retrieves a task', async () => {
    const { createTask, listTasks } = await import('@/lib/storage-client')

    const task = await createTask({ title: 'Buy milk' })
    expect(task.title).toBe('Buy milk')

    const all = await listTasks()
    expect(all.find(t => t.id === task.id)).toBeTruthy()
  })

  it('deletes a task', async () => {
    const { createTask, deleteTask, listTasks } = await import('@/lib/storage-client')

    const task = await createTask({ title: 'Temp task' })
    await deleteTask(task.id)

    const all = await listTasks()
    expect(all.find(t => t.id === task.id)).toBeUndefined()
  })
})
