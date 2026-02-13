//app/components/CommandPalette.tsx

'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { Search, ExternalLink, Edit, Trash2, AlertTriangle } from 'lucide-react'
import Fuse from 'fuse.js'

type Bookmark = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
  verified?: boolean | null
  verification_message?: string | null
}

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
  bookmarks: Bookmark[]
  onVisit: (url: string) => void
  onEdit: (bookmark: Bookmark) => void
  onDelete: (id: number, title: string) => void
  darkMode: boolean
}

export default function CommandPalette({
  open,
  onClose,
  bookmarks,
  onVisit,
  onEdit,
  onDelete,
  darkMode,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks)

  // Fuzzy search setup
  const fuse = new Fuse(bookmarks, {
    keys: ['title', 'url'],
    threshold: 0.3,
  })

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredBookmarks(bookmarks.slice(0, 8))
    } else {
      const results = fuse.search(search).map((result) => result.item)
      setFilteredBookmarks(results.slice(0, 8))
    }
  }, [search, bookmarks])

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  if (!open) return null

  const bgClass = darkMode ? 'bg-gray-900/95' : 'bg-white/95'
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200'
  const textClass = darkMode ? 'text-gray-300' : 'text-gray-700'
  const hoverClass = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Command
        className={`w-full max-w-2xl rounded-xl border-2 shadow-2xl ${bgClass} ${borderClass} backdrop-blur-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b ${borderClass}">
          <Search className={`w-5 h-5 ${textClass}`} />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search bookmarks... (ESC to close)"
            className={`flex-1 bg-transparent outline-none text-lg ${textClass}`}
            autoFocus
          />
        </div>

        <Command.List className="max-h-96 overflow-y-auto p-2">
          {filteredBookmarks.length === 0 ? (
            <Command.Empty className={`py-6 text-center ${textClass}`}>
              No bookmarks found.
            </Command.Empty>
          ) : (
            <Command.Group>
              {filteredBookmarks.map((bookmark) => (
                <Command.Item
                  key={bookmark.id}
                  value={bookmark.title}
                  onSelect={() => {
                    onVisit(bookmark.url)
                    onClose()
                  }}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg cursor-pointer ${hoverClass} transition-colors group`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${textClass}`}>
                        {bookmark.title}
                      </p>
                      {bookmark.verified === false && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <p
                      className={`text-sm truncate ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {bookmark.url}
                    </p>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onVisit(bookmark.url)
                        onClose()
                      }}
                      className="p-2 rounded hover:bg-green-600 hover:text-white transition"
                      title="Visit"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(bookmark)
                        onClose()
                      }}
                      className="p-2 rounded hover:bg-yellow-600 hover:text-white transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(bookmark.id, bookmark.title)
                        onClose()
                      }}
                      className="p-2 rounded hover:bg-red-600 hover:text-white transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div
          className={`px-4 py-2 border-t text-xs ${borderClass} ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          <span>↑↓ Navigate</span>
          <span className="mx-2">•</span>
          <span>⏎ Visit</span>
          <span className="mx-2">•</span>
          <span>ESC Close</span>
        </div>
      </Command>
    </div>
  )
}
