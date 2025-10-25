'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Type, Pen, Eraser, Undo, Redo, Check, Palette } from 'lucide-react'

interface Props {
  imageUrl: string
  onSave: (editedImageBlob: Blob) => void
  onCancel: () => void
}

type Tool = 'draw' | 'text' | 'eraser' | null

interface DrawingPoint {
  x: number
  y: number
}

interface TextAnnotation {
  id: string
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>(null)
  const [color, setColor] = useState('#FF0000')
  const [lineWidth, setLineWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])
  const [currentText, setCurrentText] = useState('')
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000']

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    setIsDarkMode(savedTheme === 'dark')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      saveHistory(ctx)
    }
    img.src = imageUrl
  }, [imageUrl])

  const saveHistory = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      setHistoryStep(historyStep - 1)
      ctx.putImageData(history[historyStep - 1], 0, 0)
      redrawTextAnnotations(ctx)
    }
  }

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      setHistoryStep(historyStep + 1)
      ctx.putImageData(history[historyStep + 1], 0, 0)
      redrawTextAnnotations(ctx)
    }
  }

  const redrawTextAnnotations = (ctx: CanvasRenderingContext2D) => {
    textAnnotations.forEach(annotation => {
      ctx.font = `${annotation.fontSize}px Arial`
      ctx.fillStyle = annotation.color
      ctx.fillText(annotation.text, annotation.x, annotation.y)
    })
  }

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tool) return

    const coords = getCanvasCoords(e)

    if (tool === 'text') {
      setTextPosition(coords)
      return
    }

    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'text') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCanvasCoords(e)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          saveHistory(ctx)
        }
      }
    }
  }

  const addTextAnnotation = () => {
    if (!currentText.trim() || !textPosition) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const annotation: TextAnnotation = {
      id: Date.now().toString(),
      x: textPosition.x,
      y: textPosition.y,
      text: currentText,
      color: color,
      fontSize: 24
    }

    setTextAnnotations([...textAnnotations, annotation])

    ctx.font = `${annotation.fontSize}px Arial`
    ctx.fillStyle = annotation.color
    ctx.fillText(annotation.text, annotation.x, annotation.y)

    saveHistory(ctx)
    setCurrentText('')
    setTextPosition(null)
    setTool(null)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Edit Image
        </h2>
        <button
          onClick={onCancel}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          {/* Drawing Tools */}
          <button
            onClick={() => setTool(tool === 'draw' ? null : 'draw')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'draw'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'hover:bg-zinc-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Draw"
          >
            <Pen className="w-5 h-5" />
          </button>

          <button
            onClick={() => setTool(tool === 'text' ? null : 'text')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'text'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'hover:bg-zinc-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>

          <button
            onClick={() => setTool(tool === 'eraser' ? null : 'eraser')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'eraser'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'hover:bg-zinc-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <div className={`w-px h-8 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />

          {/* Color Picker */}
          <div className="flex items-center space-x-1">
            <Palette className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  color === c ? 'border-blue-500 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>

          <div className={`w-px h-8 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />

          {/* Line Width */}
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Size:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {lineWidth}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* History Controls */}
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>

          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>

          <div className={`w-px h-8 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />

          {/* Action Buttons */}
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check className="w-5 h-5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="max-w-full max-h-full border-2 border-gray-500 cursor-crosshair shadow-2xl"
            style={{ cursor: tool ? 'crosshair' : 'default' }}
          />

          {/* Text Input Overlay */}
          {textPosition && (
            <div
              className="absolute bg-white rounded-lg shadow-xl p-3 border-2 border-blue-500"
              style={{
                left: `${(textPosition.x / (canvasRef.current?.width || 1)) * 100}%`,
                top: `${(textPosition.y / (canvasRef.current?.height || 1)) * 100}%`,
              }}
            >
              <input
                type="text"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTextAnnotation()}
                placeholder="Enter text..."
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                autoFocus
              />
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={addTextAnnotation}
                  className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setTextPosition(null)
                    setCurrentText('')
                    setTool(null)
                  }}
                  className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className={`px-6 py-3 border-t text-sm ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'
      }`}>
        <p>
          <strong>Tips:</strong> Select a tool, choose a color, and click on the image to annotate. 
          {tool === 'text' && ' Click on the image to place text.'}
          {tool === 'draw' && ' Click and drag to draw.'}
          {tool === 'eraser' && ' Click and drag to erase.'}
        </p>
      </div>
    </div>
  )
}
