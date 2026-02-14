'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Edit, Trash2, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

type Bookmark = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
  verified?: boolean | null
  verification_message?: string | null
  preview_image?: string | null
  preview_title?: string | null
  preview_description?: string | null
  favicon?: string | null
}

type Carousel3DProps = {
  items: Bookmark[]
  selectedIndex: number
  onRotate: (direction: 'left' | 'right') => void
  onVisit: (url: string) => void
  onEdit: (bookmark: Bookmark) => void
  onDelete: (id: number, title: string) => void
  darkMode: boolean
  onRefreshPreview?: (id: number, url: string) => void
}

export default function Carousel3D({
  items,
  selectedIndex,
  onRotate,
  onVisit,
  onEdit,
  onDelete,
  darkMode,
  onRefreshPreview,
}: Carousel3DProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
          📚
        </div>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          No bookmarks yet. Add one to get started!
        </p>
      </div>
    )
  }

  const getCardStyle = (index: number) => {
    const diff = index - selectedIndex
    const totalItems = items.length

    let normalizedDiff = diff
    if (Math.abs(diff) > totalItems / 2) {
      normalizedDiff = diff > 0 ? diff - totalItems : diff + totalItems
    }

    if (normalizedDiff === 0) {
      return {
        transform: 'translateX(0) translateZ(0) scale(1) rotateY(0deg)',
        opacity: 1,
        filter: 'blur(0px)',
        zIndex: 10,
      }
    } else if (normalizedDiff === -1) {
      return {
        transform: 'translateX(-280px) translateZ(-200px) scale(0.7) rotateY(35deg)',
        opacity: 0.6,
        filter: 'blur(2px)',
        zIndex: 5,
      }
    } else if (normalizedDiff === 1) {
      return {
        transform: 'translateX(280px) translateZ(-200px) scale(0.7) rotateY(-35deg)',
        opacity: 0.6,
        filter: 'blur(2px)',
        zIndex: 5,
      }
    } else if (normalizedDiff === -2) {
      return {
        transform: 'translateX(-400px) translateZ(-350px) scale(0.5) rotateY(45deg)',
        opacity: 0.3,
        filter: 'blur(4px)',
        zIndex: 2,
      }
    } else if (normalizedDiff === 2) {
      return {
        transform: 'translateX(400px) translateZ(-350px) scale(0.5) rotateY(-45deg)',
        opacity: 0.3,
        filter: 'blur(4px)',
        zIndex: 2,
      }
    } else {
      return {
        transform: 'translateX(0) translateZ(-500px) scale(0.3)',
        opacity: 0,
        filter: 'blur(10px)',
        zIndex: 0,
      }
    }
  }

  const handleImageError = (bookmarkId: number) => {
    setImageErrors(prev => new Set(prev).add(bookmarkId))
  }

  const cardBg = darkMode
    ? 'bg-gray-800/80 border-gray-700'
    : 'bg-white/80 border-gray-200'

  return (
    <div className="relative w-full h-150 flex items-center justify-center">
      {/* Navigation Buttons */}
      <button
        onClick={() => onRotate('left')}
        className={`absolute left-4 z-20 p-4 rounded-full ${
          darkMode ? 'bg-gray-800/90 hover:bg-gray-700' : 'bg-white/90 hover:bg-gray-100'
        } backdrop-blur-md shadow-lg transition-all hover:scale-110`}
        aria-label="Previous bookmark"
      >
        <svg
          className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={() => onRotate('right')}
        className={`absolute right-4 z-20 p-4 rounded-full ${
          darkMode ? 'bg-gray-800/90 hover:bg-gray-700' : 'bg-white/90 hover:bg-gray-100'
        } backdrop-blur-md shadow-lg transition-all hover:scale-110`}
        aria-label="Next bookmark"
      >
        <svg
          className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Carousel Container */}
      <div className="relative w-full h-full" style={{ perspective: '1200px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {items.map((bookmark, index) => {
            const style = getCardStyle(index)
            const isCenter = index === selectedIndex
            const hasPreview = bookmark.preview_image && !imageErrors.has(bookmark.id)

            return (
              <motion.div
                key={bookmark.id}
                className={`absolute w-80 border-2 rounded-2xl shadow-2xl backdrop-blur-md ${cardBg} overflow-hidden`}
                style={{
                  ...style,
                  transformStyle: 'preserve-3d',
                }}
                animate={style}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                }}
                onClick={() => {
                  if (!isCenter) {
                    const diff = index - selectedIndex
                    const totalItems = items.length
                    if (Math.abs(diff) > totalItems / 2) {
                      onRotate(diff > 0 ? 'left' : 'right')
                    } else {
                      onRotate(diff > 0 ? 'right' : 'left')
                    }
                  }
                }}
              >
                {/* Preview Image */}
                {hasPreview && (
                  <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={bookmark.preview_image!}
                      alt={bookmark.preview_title || bookmark.title}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(bookmark.id)}
                      loading="lazy"
                    />
                    {bookmark.favicon && (
                      <div className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full p-1 shadow-md">
                        <img 
                          src={bookmark.favicon} 
                          alt="favicon"
                          className="w-full h-full object-contain"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* No Preview Placeholder */}
                {!hasPreview && (
                  <div className={`relative w-full h-40 flex items-center justify-center ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <ImageIcon className={`w-12 h-12 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    {isCenter && onRefreshPreview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRefreshPreview(bookmark.id, bookmark.url)
                        }}
                        className="absolute bottom-2 right-2 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Fetch Preview
                      </button>
                    )}
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {/* Title with warning badge */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-blue-500 truncate flex-1">
                      {bookmark.title}
                    </h3>
                    {bookmark.verified === false && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-600 text-white shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        !
                      </span>
                    )}
                  </div>

                  {/* Preview Description */}
                  {bookmark.preview_description && (
                    <p className={`text-sm line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {bookmark.preview_description}
                    </p>
                  )}

                  {/* URL */}
                  <div className="flex items-start gap-2">
                    {bookmark.verified === false && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1 shrink-0" />
                    )}
                    <p
                      className={`text-sm break-all ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {bookmark.url}
                    </p>
                  </div>

                  {/* Date */}
                  <p
                    className={`text-xs ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Added {new Date(bookmark.created_at).toLocaleDateString()}
                  </p>

                  {/* Actions (only show on center card) */}
                  {isCenter && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onVisit(bookmark.url)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Visit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(bookmark)
                        }}
                        className="flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(bookmark.id, bookmark.title)
                        }}
                        className="flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const diff = index - selectedIndex
              const totalItems = items.length
              if (Math.abs(diff) > totalItems / 2) {
                onRotate(diff > 0 ? 'left' : 'right')
              } else {
                onRotate(diff > 0 ? 'right' : 'left')
              }
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === selectedIndex
                ? 'w-8 bg-blue-500'
                : darkMode
                ? 'bg-gray-600 hover:bg-gray-500'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <div
        className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 text-sm ${
          darkMode ? 'text-gray-500' : 'text-gray-400'
        }`}
      >
        Use arrow keys or scroll
      </div>
    </div>
  )
}
