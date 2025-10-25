'use client'

import { useState, useEffect } from 'react'
import { X, Camera, Upload, AlertCircle, Edit3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ImageEditor from '@/components/ImageEditor'

interface Equipment {
  id: string
  name: string
  serial_number: string
  qr_code: string
  equipment_type: string
  muscle_group: string
  status: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onTicketCreated: () => void
  equipmentId?: string
}

export default function QRScannerModal({ isOpen, onClose, onTicketCreated, equipmentId }: Props) {
  const [step, setStep] = useState<'scan' | 'form'>('scan')
  const [qrCode, setQrCode] = useState('')
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showImageEditor, setShowImageEditor] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = localStorage.getItem('theme')
      setIsDarkMode(theme === 'dark')
    }
    checkTheme()
    window.addEventListener('storage', checkTheme)
    const interval = setInterval(checkTheme, 100)
    return () => {
      window.removeEventListener('storage', checkTheme)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (equipmentId && isOpen) {
      loadEquipmentById(equipmentId)
    } else if (isOpen) {
      setStep('scan')
      setQrCode('')
      setEquipment(null)
      setDescription('')
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [isOpen, equipmentId])

  const loadEquipmentById = async (id: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      toast.error('Equipment not found')
      onClose()
    } else {
      setEquipment(data)
      setStep('form')
    }
    setLoading(false)
  }

  const handleQRSubmit = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code')
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('qr_code', qrCode.trim())
      .single()

    if (error || !data) {
      toast.error('Equipment not found with this QR code')
      setLoading(false)
      return
    }

    if (!data.gym_id) {
      toast.error('This equipment is not assigned to any gym')
      setLoading(false)
      return
    }

    setEquipment(data)
    setStep('form')
    setLoading(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be less than 5MB')
        return
      }
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null

    const fileExt = photoFile.name.split('.').pop()
    const fileName = `${equipment?.id}-${Date.now()}.${fileExt}`
    const filePath = `tickets/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('equipment-photos')
      .upload(filePath, photoFile)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('equipment-photos')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleEditImage = () => {
    if (photoPreview) {
      setShowImageEditor(true)
    }
  }

  const handleSaveEditedImage = (editedBlob: Blob) => {
    const file = new File([editedBlob], 'edited-photo.jpg', { type: 'image/jpeg' })
    setPhotoFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
      setShowImageEditor(false)
      toast.success('Image edited successfully!')
    }
    reader.readAsDataURL(file)
  }

  const handleCreateTicket = async () => {
    if (!description.trim()) {
      toast.error('Please describe the issue')
      return
    }

    if (!equipment) {
      toast.error('Equipment not found')
      return
    }

    setLoading(true)

    try {
      // Upload photo if exists
      let photoUrl = null
      if (photoFile) {
        photoUrl = await uploadPhoto()
        if (!photoUrl) {
          toast.error('Failed to upload photo')
          setLoading(false)
          return
        }
      }

      // Create ticket using the RPC function
      const { data: ticketId, error } = await supabase.rpc('create_ticket_from_qr', {
        equipment_qr: equipment.qr_code,
        description: description.trim(),
        photo_url: photoUrl
      })

      if (error) {
        console.error('Ticket creation error:', error)
        toast.error(error.message || 'Failed to create ticket')
        setLoading(false)
        return
      }

      toast.success('Ticket created successfully! Gym staff will be notified.')
      onTicketCreated()
      onClose()
    } catch (err: any) {
      console.error('Error:', err)
      toast.error(err.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = `w-full px-4 py-2 rounded-lg border transition-colors ${
    isDarkMode
      ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
  } focus:outline-none focus:ring-2`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl rounded-lg shadow-xl transition-colors ${
          isDarkMode ? 'bg-zinc-900 text-gray-100' : 'bg-white text-gray-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-zinc-800' : 'border-gray-200'
          }`}
        >
          <h2 className="text-xl font-semibold">
            {step === 'scan' ? 'Scan Equipment QR Code' : 'Report Equipment Issue'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'scan' ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">How to scan:</p>
                    <ol className="list-decimal list-inside space-y-1 opacity-90">
                      <li>Find the QR code on the equipment</li>
                      <li>Enter the code shown below the QR</li>
                      <li>Or scan with your phone&apos;s camera and copy the code</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Equipment QR Code
                </label>
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Enter QR code (e.g., EQ-TREADMILL-001-abc123)"
                  className={inputClass}
                  onKeyPress={(e) => e.key === 'Enter' && handleQRSubmit()}
                />
              </div>

              <button
                onClick={handleQRSubmit}
                disabled={loading || !qrCode.trim()}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Searching...' : 'Find Equipment'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Equipment Info */}
              <div
                className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {equipment?.name}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Serial:</span>{' '}
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{equipment?.serial_number}</span>
                  </div>
                  <div>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Type:</span>{' '}
                    <span className={`capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {equipment?.equipment_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Describe the issue *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's wrong with this equipment? Be as detailed as possible..."
                  rows={4}
                  className={inputClass}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Photo (optional)
                </label>
                {photoPreview ? (
                  <div className="relative space-y-2">
                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleEditImage}
                        className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Image</span>
                      </button>
                      <button
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className={`w-8 h-8 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Click to upload photo (max 5MB)
                      </p>
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Privacy Notice */}
              <div
                className={`p-3 rounded-lg text-xs ${
                  isDarkMode
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Privacy:</strong> Avoid capturing faces or personal information in photos. Focus on the
                    equipment issue only.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep('scan')
                    setEquipment(null)
                    setDescription('')
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={loading || !description.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && photoPreview && (
        <ImageEditor
          imageUrl={photoPreview}
          onSave={handleSaveEditedImage}
          onCancel={() => setShowImageEditor(false)}
        />
      )}
    </div>
  )
}
