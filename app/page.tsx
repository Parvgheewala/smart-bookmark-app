'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/browser'
import {
  BookOpen,
  Plus,
  LogOut,
  SunMedium,
  Moon,
  Settings,
  AlertTriangle,
  Search,
  AlertCircle,
  Save,
  X,
  Edit,
} from 'lucide-react'
import Carousel3D from './components/Carousel3D'
import CommandPalette from './components/CommandPalette'
import AddBookmarkModal from './components/AddBookmarkModal'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [strictMode, setStrictMode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [editUrlError, setEditUrlError] = useState('')
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

  // ---------- Update verification status ----------
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

  // ---------- Dark mode + strict mode ----------
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

  // ---------- Auth + realtime ----------
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

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: / or Cmd+K or Ctrl+K
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault()
        setCommandOpen(true)
      }

      // Close modals: ESC
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setAddModalOpen(false)
        setEditModalOpen(false)
        setShowSettings(false)
      }

      // Add bookmark: Cmd+N or Ctrl+N
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setAddModalOpen(true)
      }

      // Carousel navigation: Arrow keys
      if (!commandOpen && !addModalOpen && !editModalOpen) {
        if (e.key === 'ArrowLeft') {
          rotateCarousel('left')
        } else if (e.key === 'ArrowRight') {
          rotateCarousel('right')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandOpen, addModalOpen, editModalOpen, items.length])

  // ---------- Carousel rotation ----------
  const rotateCarousel = (direction: 'left' | 'right') => {
    setSelectedIndex((prev) => {
      if (direction === 'left') {
        return prev === 0 ? items.length - 1 : prev - 1
      } else {
        return prev === items.length - 1 ? 0 : prev + 1
      }
    })
  }

  // ---------- Validate edit URL ----------
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
  const addBookmark = async (title: string, url: string) => {
    if (!title.trim() || !url.trim()) {
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
      const bookmarkId = data.id
      setAddModalOpen(false)
      setUrlError('')

      // Non-strict mode: verify in background
      if (!strictMode) {
        verifyUrlReachable(url).then(({ reachable, message }) => {
          updateVerificationStatus(bookmarkId, reachable, message)
        })
      }
    }
  }

  const startEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark)
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
    setEditUrlError('')
    setEditModalOpen(true)
  }

  const saveEdit = async () => {
    if (!editingBookmark) return

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
      .eq('id', editingBookmark.id)

    if (error) {
      showToast(`Error updating bookmark: ${error.message}`, 'error')
    } else {
      showToast('Bookmark updated successfully', 'success')
      const bookmarkId = editingBookmark.id
      setEditModalOpen(false)
      setEditingBookmark(null)
      setEditUrlError('')

      // Non-strict: verify in background
      if (!strictMode) {
        verifyUrlReachable(editUrl).then(({ reachable, message }) => {
          updateVerificationStatus(bookmarkId, reachable, message)
        })
      }
    }
  }

  const delBookmark = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return

    const { error } = await supabase.from('bookmarks').delete().eq('id', id)

    if (error) {
      showToast(`Error deleting bookmark: ${error.message}`, 'error')
    } else {
      showToast(`Deleted: ${title}`, 'success')
    }
  }

  const visitBookmark = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  // ---------- Styling ----------
  const bgClass = darkMode
    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
  const headerClass = darkMode
    ? 'bg-gray-800/80 border-gray-700'
    : 'bg-white/80 border-gray-200'
  const inputClass = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-black'
  const inputErrorClass = darkMode
    ? 'bg-gray-700 border-red-500 text-white'
    : 'bg-white border-red-500 text-black'

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-500`}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md ${
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header
        className={`sticky top-0 z-40 border-b-2 backdrop-blur-md ${headerClass}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">Smart Bookmarks</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {items.length} bookmark{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCommandOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition ${
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  /
                </kbd>
              </button>

              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                {darkMode ? <SunMedium className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <Carousel3D
          items={items}
          selectedIndex={selectedIndex}
          onRotate={rotateCarousel}
          onVisit={visitBookmark}
          onEdit={startEdit}
          onDelete={delBookmark}
          darkMode={darkMode}
        />
      </main>

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        bookmarks={items}
        onVisit={visitBookmark}
        onEdit={startEdit}
        onDelete={delBookmark}
        darkMode={darkMode}
      />

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addBookmark}
        darkMode={darkMode}
        verifying={verifying}
        urlError={urlError}
        setUrlError={setUrlError}
      />

      {/* Edit Bookmark Modal */}
      <AnimatePresence>
        {editModalOpen && editingBookmark && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-md rounded-xl shadow-2xl backdrop-blur-md border-2 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`flex items-center justify-between p-6 border-b ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Bookmark
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className={`p-2 rounded-lg transition ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${inputClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL</label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    disabled={verifying}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      editUrlError ? inputErrorClass : inputClass
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {editUrlError && (
                    <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {editUrlError}
                    </div>
                  )}
                  {verifying && (
                    <div className="flex items-center gap-2 mt-2 text-blue-500 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      Verifying URL...
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editTitle.trim() || !editUrl.trim() || !!editUrlError || verifying}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {verifying ? 'Verifying...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer hint */}
      <div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 text-sm ${
          darkMode ? 'text-gray-500' : 'text-gray-400'
        } backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full`}
      >
        Press <kbd className="px-2 py-1 rounded bg-gray-700 text-white text-xs">/</kbd> to search
        • <kbd className="px-2 py-1 rounded bg-gray-700 text-white text-xs">⌘N</kbd> to add
      </div>
    </div>
  )
}
