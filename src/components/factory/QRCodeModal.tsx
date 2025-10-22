'use client'

import { useRef } from 'react'
import { X, Download, Printer } from 'lucide-react'
import QRCode from 'react-qr-code'

interface Props {
  equipment: any
  onClose: () => void
}

export default function QRCodeModal({ equipment, onClose }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 300
    canvas.height = 300

    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `equipment-${equipment.serial_number}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">{equipment.name}</h3>
            <p className="text-sm text-gray-500">Serial: {equipment.serial_number}</p>
          </div>

          <div ref={qrRef} className="flex justify-center mb-4 bg-white p-4 rounded-lg border">
            <QRCode 
              value={equipment.qr_code} 
              size={256}
              level="H"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-600 break-all font-mono">{equipment.qr_code}</p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
