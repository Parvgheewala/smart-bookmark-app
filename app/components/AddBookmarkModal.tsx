'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type AddBookmarkModalProps = {
  open: boolean
  onClose: () => void
  onAdd: (title: string, url: string) => Promise<void>
  darkMode: boolean
  verifying: boolean
  urlError: string
  setUrlError: (error: string) => void
}

export default function AddBookmarkModal({
  open,
  onClose,
  onAdd,
  darkMode,
  verifying,
  urlError,
  setUrlError,
}: AddBookmarkModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

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
  }, [url, setUrlError])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setUrl('')
      setUrlError('')
    }
  }, [open, setUrlError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim() || urlError) return
    await onAdd(title, url)
    setTitle('')
    setUrl('')
  }

  const bgClass = darkMode ? 'bg-gray-800' : 'bg-white'
  const inputClass = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-black'
  const inputErrorClass = darkMode
    ? 'bg-gray-700 border-red-500 text-white'
    : 'bg-white border-red-500 text-black'

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-md rounded-xl shadow-2xl ${bgClass} backdrop-blur-md border-2 ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Bookmark
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Google"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${inputClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., https://google.com"
                  disabled={verifying}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    urlError ? inputErrorClass : inputClass
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {urlError && (
                  <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {urlError}
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
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !url.trim() || !!urlError || verifying}
                  className="flex-1 px-4 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying...' : 'Add Bookmark'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
