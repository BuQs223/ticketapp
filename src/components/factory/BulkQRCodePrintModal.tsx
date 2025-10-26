'use client'

import { useState, useEffect } from 'react'
import { X, Printer, CheckSquare, Square } from 'lucide-react'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'

interface Equipment {
  id: string
  name: string
  serial_number: string
  qr_code: string
  equipment_type?: string
  gyms?: {
    name: string
  }
}

interface Props {
  equipment: Equipment[]
  onClose: () => void
}

type LayoutOption = 4 | 8

export default function BulkQRCodePrintModal({ equipment, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [layout, setLayout] = useState<LayoutOption>(4)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Determine dark mode based on localStorage
    const savedTheme = localStorage.getItem('theme')
    setIsDarkMode(savedTheme === 'dark')
    // Listen for theme changes if needed (optional)
    const handleStorageChange = () => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [])

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === equipment.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(equipment.map(e => e.id)))
    }
  }

  const selectedEquipment = equipment.filter(e => selectedIds.has(e.id))

  const handlePrint = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one QR code to print', {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
      return
    }

    // Trigger browser print dialog
    window.print()

    // Show success message after print dialog opens
    toast.success(`Printing ${selectedIds.size} QR code${selectedIds.size > 1 ? 's' : ''}`, {
      icon: '🖨️',
      duration: 2000,
      style: {
        borderRadius: '10px',
        background: isDarkMode ? '#18181b' : '#fff',
        color: isDarkMode ? '#e4e4e7' : '#1f2937',
      },
    })
  }

  return (
    <>
      {/* Modal Overlay - Hidden when printing */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
        <div className={`max-w-4xl w-full rounded-lg shadow-xl max-h-[90vh] overflow-hidden ${
          isDarkMode ? 'bg-zinc-900' : 'bg-white'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-zinc-800' : 'border-gray-200'
          }`}>
            <div>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Bulk QR Code Print
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Select equipment and choose layout
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-zinc-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Layout Selection */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Print Layout
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setLayout(4)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    layout === 4
                      ? isDarkMode
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDarkMode
                        ? 'border-zinc-700 hover:border-zinc-600'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`text-center ${
                    layout === 4
                      ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="text-3xl font-bold">4</div>
                    <div className="text-sm">per page (Large)</div>
                  </div>
                </button>
                <button
                  onClick={() => setLayout(8)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    layout === 8
                      ? isDarkMode
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDarkMode
                        ? 'border-zinc-700 hover:border-zinc-600'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`text-center ${
                    layout === 8
                      ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="text-3xl font-bold">8</div>
                    <div className="text-sm">per page (Small)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={toggleAll}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {selectedIds.size === equipment.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{selectedIds.size === equipment.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {selectedIds.size} of {equipment.length} selected
              </span>
            </div>

            {/* Equipment List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {equipment.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedIds.has(item.id)
                      ? isDarkMode
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDarkMode
                        ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      {selectedIds.has(item.id) ? (
                        <CheckSquare className={`w-5 h-5 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      ) : (
                        <Square className={`w-5 h-5 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {item.name}
                      </p>
                      <p className={`text-sm truncate ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {item.serial_number}
                      </p>
                      {item.gyms?.name && (
                        <p className={`text-xs truncate ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          📍 {item.gyms.name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-6 border-t ${
            isDarkMode ? 'border-zinc-800' : 'border-gray-200'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Print {selectedIds.size > 0 && `(${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Print Layout - Hidden on screen, visible only when printing --- */}
      <div className="hidden print:block">
        {/* Basic Print Styling */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait; /* Explicitly set portrait */
              margin: 10mm; /* Adjust margins as needed */
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact; /* Ensure colors print */
              print-color-adjust: exact;
            }
            /* Hide the modal UI when printing */
            .print\\:hidden { display: none !important; }
          }
        `}</style>

        {/* Grid Container for Print */}
        <div className={layout === 4 ? 'print-layout-4' : 'print-layout-8'}>
          {selectedEquipment.map((item, index) => (
            <div key={item.id} className="qr-item">
              <div className="qr-code-container">
                {/* Render QR Code using react-qr-code */}
                <QRCode
                  value={item.qr_code}
                  size={layout === 4 ? 180 : 120} // Adjust size based on layout
                  level="H" // High error correction
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <div className="qr-info">
                <p className="qr-name">{item.name}</p>
                {/* Added Serial Number */}
                <p className="qr-serial">{item.serial_number}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Specific Styles for Print Layout */}
        <style jsx>{`
          .print-layout-4, .print-layout-8 {
            display: grid;
            grid-template-columns: repeat(2, 1fr); /* 2 columns */
            gap: 10mm; /* Space between items */
            width: 190mm; /* A4 width minus margins (210mm - 2*10mm) */
            margin: 0 auto;
          }

          .print-layout-4 {
             grid-template-rows: repeat(2, auto); /* 2 rows for 4 items */
          }

          .print-layout-8 {
             grid-template-rows: repeat(4, auto); /* 4 rows for 8 items */
             gap: 5mm; /* Reduce gap for smaller items */
          }

          .qr-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ccc; /* Add a light border for cutting */
            border-radius: 4px;
            padding: ${layout === 4 ? '10mm' : '5mm'};
            page-break-inside: avoid; /* Prevent items splitting across pages */
            background: white;
            box-sizing: border-box;
            overflow: hidden; /* Prevent text overflow */
            height: ${layout === 4 ? '128mm' : '64mm'}; /* Approximate height based on A4 */
          }

          .qr-code-container {
            margin-bottom: ${layout === 4 ? '8mm' : '4mm'};
          }

          .qr-info {
            text-align: center;
            width: 100%;
          }

          .qr-name {
            font-size: ${layout === 4 ? '12pt' : '9pt'};
            font-weight: bold;
            color: #000;
            margin: 0 0 2mm 0;
            line-height: 1.2;
            word-wrap: break-word; /* Wrap long names */
          }

          .qr-serial {
            font-size: ${layout === 4 ? '9pt' : '7pt'};
            color: #333;
            margin: 0;
            line-height: 1.2;
             word-wrap: break-word;
          }

          /* Explicit Page Breaks */
          .print-layout-4 .qr-item:nth-child(4n) {
            page-break-after: always;
          }
          .print-layout-8 .qr-item:nth-child(8n) {
            page-break-after: always;
          }
          /* Ensure the last item doesn't cause an unnecessary break */
          .qr-item:last-child {
             page-break-after: avoid;
           }
        `}</style>
      </div>
    </>
  )
}