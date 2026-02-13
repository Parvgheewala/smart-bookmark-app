'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/browser'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  LogOut,
  SunMedium,
  Moon,
  CheckCircle2,
} from 'lucide-react'

type Bookmark = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Bookmark[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [darkMode, setDarkMode] = useState(false)

  // ---------- helpers ----------
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)])
  }

  const load = async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      addLog(`Error loading: ${error.message}`)
      return
    }

    setItems((data as Bookmark[]) ?? [])
    addLog(`Loaded ${data?.length ?? 0} bookmarks`)
  }

  // ---------- dark mode synced across tabs ----------
  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored) setDarkMode(stored === 'true')

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'darkMode' && e.newValue) {
        setDarkMode(e.newValue === 'true')
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', String(next))
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'darkMode', newValue: String(next) })
    )
    addLog(`Theme: ${next ? 'dark' : 'light'}`)
  }

  // ---------- auth + realtime (FIXED) ----------
  useEffect(() => {
    let channel: any = null

    const init = async () => {
      // Auth check
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        window.location.href = '/login'
        return
      }

      const currentUserId = data.user.id
      setUserId(currentUserId)
      addLog(`Logged in: ${data.user.email}`)
      await load()

      // Create realtime channel with unique name
      channel = supabase.channel(`bookmarks_${currentUserId}`)

      // Listen to ALL changes on bookmarks table
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
          },
          (payload: any) => {
            console.log('Realtime event:', payload)
            addLog(`Realtime: ${payload.eventType}`)

            // For INSERT/UPDATE - check if it's current user's bookmark
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (payload.new?.user_id === currentUserId) {
                load()
              }
            }
            // For DELETE - just reload (RLS will filter)
            else if (payload.eventType === 'DELETE') {
              load()
            }
          }
        )
        .subscribe((status: string) => {
          console.log('Subscription status:', status)
          addLog(`Channel: ${status}`)
        })

      // Auth state listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        addLog(`Auth: ${event}`)
        if (event === 'SIGNED_OUT') {
          window.location.href = '/login'
        }
      })

      return () => {
        if (channel) {
          addLog('Removing channel')
          supabase.removeChannel(channel)
        }
        subscription.unsubscribe()
      }
    }

    init().catch((err) => addLog(`Error: ${err.message}`))

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  // ---------- CRUD ----------
  const addBookmark = async () => {
    if (!url.trim() || !title.trim()) {
      addLog('Title and URL required')
      return
    }

    const { error } = await supabase.from('bookmarks').insert({ url, title })

    if (error) {
      addLog(`Error adding: ${error.message}`)
    } else {
      addLog(`Added: ${title}`)
      setUrl('')
      setTitle('')
    }
  }

  const startEdit = (b: Bookmark) => {
    setEditingId(b.id)
    setEditUrl(b.url)
    setEditTitle(b.title)
    addLog(`Editing: ${b.title}`)
  }

  const saveEdit = async () => {
    if (!editingId) return

    const { error } = await supabase
      .from('bookmarks')
      .update({ url: editUrl, title: editTitle })
      .eq('id', editingId)

    if (error) {
      addLog(`Error updating: ${error.message}`)
    } else {
      addLog(`Updated: ${editTitle}`)
      setEditingId(null)
    }
  }

  const delBookmark = async (id: number, title: string) => {
    addLog(`Deleting bookmark ID: ${id}`)
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)

    if (error) {
      addLog(`Error deleting: ${error.message}`)
    } else {
      addLog(`Deleted: ${title}`)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  // ---------- styling ----------
  const bgClass = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'
  const cardClass = darkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-300'
  const inputClass = darkMode
    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-black'
  const iconClass = darkMode ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-200`}>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Smart Bookmark App</h1>
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
              onClick={toggleDarkMode}
            >
              {darkMode ? (
                <SunMedium className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              Toggle
            </button>
            <button
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Add bookmark */}
        <section className={`border rounded-lg p-6 space-y-4 ${cardClass}`}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="w-5 h-5" />
            Add Bookmark
          </h2>
          <input
            className={`w-full border p-3 rounded-lg ${inputClass}`}
            placeholder="Title (e.g., Google)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className={`w-full border p-3 rounded-lg ${inputClass}`}
            placeholder="URL (e.g., https://google.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            onClick={addBookmark}
          >
            <Plus className="w-4 h-4" />
            Add Bookmark
          </button>
        </section>

        {/* Bookmarks list */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="w-6 h-6" />
            Your Bookmarks ({items.length})
          </h2>

          {items.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className={`w-16 h-16 mx-auto mb-4 ${iconClass}`} />
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                No bookmarks yet. Add one above!
              </p>
            </div>
          )}

          {items.map((b) => (
            <div
              key={b.id}
              className={`border rounded-lg p-4 space-y-3 ${cardClass}`}
            >
              {editingId === b.id ? (
                <>
                  <input
                    className={`w-full border p-3 rounded-lg ${inputClass}`}
                    placeholder="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <input
                    className={`w-full border p-3 rounded-lg ${inputClass}`}
                    placeholder="URL"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                      onClick={saveEdit}
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <a
                      className="text-lg font-medium underline text-blue-500 hover:text-blue-700"
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {b.title}
                    </a>
                    <p
                      className={`text-sm mt-1 break-all ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {b.url}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Added: {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition"
                      onClick={() => startEdit(b)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                      onClick={() => delBookmark(b.id, b.title)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </section>

        {/* Activity log */}
        <section className={`border rounded-lg p-4 space-y-3 ${cardClass}`}>
          <h2 className="flex items-center gap-2 font-semibold text-lg">
            <CheckCircle2 className="w-5 h-5" />
            Activity Log
          </h2>
          <div
            className={`h-48 overflow-y-auto p-3 rounded-lg text-sm font-mono border ${inputClass}`}
          >
            {logs.length === 0 && (
              <div className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                No activity yet...
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </section>

        <p
          className={
            darkMode
              ? 'text-xs text-center text-gray-500'
              : 'text-xs text-center text-gray-400'
          }
        >
          {/* User ID: {userId ?? 'Loading...'} */}
        </p>
      </main>
    </div>
  )
}
