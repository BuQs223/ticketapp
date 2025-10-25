'use client'

import { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'

interface Props {
  imageUrl: string
  onClose: () => void
}

export default function ImageLightbox({ imageUrl, onClose }: Props) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    setIsDarkMode(savedTheme === 'dark')
    
    const handleStorageChange = () => {
      const theme = localStorage.getItem('theme')
      setIsDarkMode(theme === 'dark')
    }
    
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(handleStorageChange, 100)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') handleZoomIn()
      if (e.key === '-') handleZoomOut()
      if (e.key === 'r' || e.key === 'R') handleRotate()
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [zoom, rotation])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `ticket-photo-${Date.now()}.jpg`
    link.click()
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackgroundClick}
    >
      {/* Controls */}
      <div className={`absolute top-4 right-4 flex items-center space-x-2 p-2 rounded-lg ${
        isDarkMode ? 'bg-zinc-900/80' : 'bg-white/80'
      } backdrop-blur-sm shadow-lg`}>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Zoom Out (-))"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Zoom In (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <div className={`w-px h-6 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />

        <button
          onClick={handleRotate}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Rotate (R)"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <button
          onClick={handleDownload}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>

        <div className={`w-px h-6 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />

        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-xs ${
        isDarkMode ? 'bg-zinc-900/80 text-gray-400' : 'bg-white/80 text-gray-600'
      } backdrop-blur-sm shadow-lg`}>
        <span>Esc: Close • +/- : Zoom • R: Rotate • Click outside to close</span>
      </div>

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-hidden">
        <img
          src={imageUrl}
          alt="Full size view"
          className="max-w-full max-h-[90vh] object-contain transition-all duration-200 select-none"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            cursor: zoom > 1 ? 'move' : 'default'
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
