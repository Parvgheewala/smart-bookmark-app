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
  ExternalLink,
  AlertCircle,
  Settings,
  AlertTriangle,
} from 'lucide-react'

type Bookmark = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
  verified?: boolean | null
  verification_message?: string | null
  verified_at?: string | null
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
  const [darkMode, setDarkMode] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [editUrlError, setEditUrlError] = useState('')
  const [strictMode, setStrictMode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // ---------- Toast helper ----------
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ---------- URL validation ----------
  const validateUrlFormat = (urlString: string): boolean => {
    if (!urlString.trim()) return false
    try {
      const url = new URL(urlString)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
      if (!url.hostname.includes('.')) return false
      const parts = url.hostname.split('.')
      const tld = parts[parts.length - 1]
      if (tld.length < 2) return false
      return true
    } catch {
      return false
    }
  }

  const verifyUrlReachable = async (url: string): Promise<{ reachable: boolean; message: string }> => {
    try {
      const res = await fetch('/api/verify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      return { reachable: data.reachable, message: data.message || '' }
    } catch {
      return { reachable: false, message: 'Verification failed' }
    }
  }

  // ---------- Load bookmarks ----------
  const load = async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showToast(`Error loading bookmarks: ${error.message}`, 'error')
      return
    }

    setItems((data as Bookmark[]) ?? [])
  }

  // ---------- Update verification status in database ----------
  const updateVerificationStatus = async (bookmarkId: number, reachable: boolean, message: string) => {
    const { error } = await supabase
      .from('bookmarks')
      .update({
        verified: reachable,
        verification_message: message,
        verified_at: new Date().toISOString(),
      })
      .eq('id', bookmarkId)

    if (error) {
      console.error('Error updating verification status:', error)
    }
  }

  // ---------- dark mode + strict mode synced across tabs ----------
  useEffect(() => {
    const storedDark = localStorage.getItem('darkMode')
    const storedStrict = localStorage.getItem('strictMode')
    if (storedDark) setDarkMode(storedDark === 'true')
    if (storedStrict) setStrictMode(storedStrict === 'true')

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'darkMode' && e.newValue) {
        setDarkMode(e.newValue === 'true')
      }
      if (e.key === 'strictMode' && e.newValue) {
        setStrictMode(e.newValue === 'true')
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
  }

  const toggleStrictMode = () => {
    const next = !strictMode
    setStrictMode(next)
    localStorage.setItem('strictMode', String(next))
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'strictMode', newValue: String(next) })
    )
    showToast(`Strict mode ${next ? 'enabled' : 'disabled'}`, 'success')
  }

  // ---------- auth + realtime ----------
  useEffect(() => {
    let channel: any = null

    const init = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        window.location.href = '/login'
        return
      }

      const currentUserId = data.user.id
      setUserId(currentUserId)
      await load()

      channel = supabase.channel(`bookmarks_${currentUserId}`)

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

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (payload.new?.user_id === currentUserId) {
                load()
              }
            } else if (payload.eventType === 'DELETE') {
              load()
            }
          }
        )
        .subscribe()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          window.location.href = '/login'
        }
      })

      return () => {
        if (channel) {
          supabase.removeChannel(channel)
        }
        subscription.unsubscribe()
      }
    }

    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  // ---------- Real-time format validation ----------
  useEffect(() => {
    if (!url.trim()) {
      setUrlError('')
      return
    }
    if (validateUrlFormat(url)) {
      setUrlError('')
    } else {
      setUrlError('Invalid URL format (must start with http:// or https://)')
    }
  }, [url])

  useEffect(() => {
    if (!editUrl.trim()) {
      setEditUrlError('')
      return
    }
    if (validateUrlFormat(editUrl)) {
      setEditUrlError('')
    } else {
      setEditUrlError('Invalid URL format')
    }
  }, [editUrl])

  // ---------- CRUD ----------
  const addBookmark = async () => {
    if (!url.trim() || !title.trim()) {
      showToast('Title and URL required', 'warning')
      return
    }

    if (!validateUrlFormat(url)) {
      showToast('Invalid URL format', 'error')
      return
    }

    // Strict mode: verify BEFORE saving
    if (strictMode) {
      setVerifying(true)
      const { reachable, message } = await verifyUrlReachable(url)
      setVerifying(false)

      if (!reachable) {
        showToast(`URL verification failed: ${message}`, 'error')
        setUrlError(`URL may not be reachable: ${message}`)
        return
      }
    }

    // Save bookmark
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ url, title })
      .select()
      .single()

    if (error) {
      showToast(`Error adding bookmark: ${error.message}`, 'error')
    } else {
      showToast('Bookmark added successfully', 'success')
      const savedUrl = url
      const bookmarkId = data.id
      setUrl('')
      setTitle('')
      setUrlError('')

      // Non-strict mode: verify in background AFTER saving
      if (!strictMode) {
        verifyUrlReachable(savedUrl).then(({ reachable, message }) => {
          updateVerificationStatus(bookmarkId, reachable, message)
        })
      }
    }
  }

  const startEdit = (b: Bookmark) => {
    setEditingId(b.id)
    setEditUrl(b.url)
    setEditTitle(b.title)
    setEditUrlError('')
  }

  const saveEdit = async () => {
    if (!editingId) return

    if (!validateUrlFormat(editUrl)) {
      showToast('Invalid URL format', 'error')
      return
    }

    // Strict mode: verify BEFORE updating
    if (strictMode) {
      setVerifying(true)
      const { reachable, message } = await verifyUrlReachable(editUrl)
      setVerifying(false)

      if (!reachable) {
        showToast(`URL verification failed: ${message}`, 'error')
        setEditUrlError(`URL may not be reachable: ${message}`)
        return
      }
    }

    const { error } = await supabase
      .from('bookmarks')
      .update({ url: editUrl, title: editTitle })
      .eq('id', editingId)

    if (error) {
      showToast(`Error updating bookmark: ${error.message}`, 'error')
    } else {
      showToast('Bookmark updated successfully', 'success')
      const savedEditingId = editingId
      setEditingId(null)
      setEditUrlError('')

      // Non-strict: verify in background
      if (!strictMode) {
        verifyUrlReachable(editUrl).then(({ reachable, message }) => {
          updateVerificationStatus(savedEditingId, reachable, message)
        })
      }
    }
  }

  const delBookmark = async (id: number, title: string) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)

    if (error) {
      showToast(`Error deleting bookmark: ${error.message}`, 'error')
    } else {
      showToast(`Deleted: ${title}`, 'success')
    }
  }

  const visitBookmark = (url: string, title: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
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
  const inputErrorClass = darkMode
    ? 'bg-gray-800 border-red-500 text-white placeholder-gray-400'
    : 'bg-white border-red-500 text-black'
  const iconClass = darkMode ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-200`}>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-yellow-600 text-white'
            }`}
          >
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

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
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
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

        {/* Settings panel */}
        {showSettings && (
          <section className={`border rounded-lg p-6 space-y-4 ${cardClass}`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Settings className="w-5 h-5" />
              Settings
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={toggleStrictMode}
                className="w-5 h-5 cursor-pointer"
              />
              <div>
                <div className="font-medium">Strict URL Verification</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Verify URLs are reachable before saving (adds 1-3s delay)
                </div>
              </div>
            </label>
          </section>
        )}

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
          <div>
            <input
              className={`w-full border p-3 rounded-lg ${
                urlError ? inputErrorClass : inputClass
              }`}
              placeholder="URL (e.g., https://google.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={verifying}
            />
            {urlError && (
              <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {urlError}
              </div>
            )}
            {verifying && (
              <div className="flex items-center gap-1 mt-2 text-blue-500 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                Verifying URL...
              </div>
            )}
          </div>
          <button
            className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
            onClick={addBookmark}
            disabled={!title.trim() || !url.trim() || !!urlError || verifying}
          >
            <Plus className="w-4 h-4" />
            {verifying ? 'Verifying...' : 'Add Bookmark'}
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
                  <div>
                    <input
                      className={`w-full border p-3 rounded-lg ${
                        editUrlError ? inputErrorClass : inputClass
                      }`}
                      placeholder="URL"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      disabled={verifying}
                    />
                    {editUrlError && (
                      <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {editUrlError}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                      onClick={saveEdit}
                      disabled={!!editUrlError || !editTitle.trim() || !editUrl.trim() || verifying}
                    >
                      <Save className="w-4 h-4" />
                      {verifying ? 'Verifying...' : 'Save'}
                    </button>
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
                      onClick={() => {
                        setEditingId(null)
                        setEditUrlError('')
                      }}
                      disabled={verifying}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-medium text-blue-500">
                        {b.title}
                      </div>
                      {b.verified === false && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-600 text-white">
                          <AlertTriangle className="w-3 h-3" />
                          Unreachable
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      {b.verified === false && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      <p
                        className={`text-sm break-all ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {b.url}
                      </p>
                    </div>
                    {b.verified === false && b.verification_message && (
                      <p className="text-xs mt-1 text-yellow-500 ml-6">
                        {b.verification_message}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Added: {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                      onClick={() => visitBookmark(b.url, b.title)}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit
                    </button>
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

        <p
          className={
            darkMode
              ? 'text-xs text-center text-gray-500'
              : 'text-xs text-center text-gray-400'
          }
        >
          User ID: {userId ?? 'Loading...'}
        </p>
      </main>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
