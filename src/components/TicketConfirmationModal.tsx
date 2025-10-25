'use client'

import { useState, useEffect } from 'react'
import { X, Upload, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Props {
  ticketId: string
  role: 'gym_owner' | 'factory_employee' | 'factory_approver' | 'factory_owner'
  userId: string
  onClose: () => void
  onConfirmed: () => void
}

export default function TicketConfirmationModal({ ticketId, role, userId, onClose, onConfirmed }: Props) {
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
    const fileName = `confirmation-${ticketId}-${Date.now()}.${fileExt}`
    const filePath = `confirmations/${fileName}`

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

  const handleConfirm = async () => {
    if (!notes.trim()) {
      toast.error('Please provide confirmation notes')
      return
    }

    if (!photoFile) {
      toast.error('Please upload a photo of the repaired equipment')
      return
    }

    setLoading(true)

    try {
      // Upload photo
      const photoUrl = await uploadPhoto()
      if (!photoUrl) {
        toast.error('Failed to upload photo')
        setLoading(false)
        return
      }

      // Insert confirmation record
      const { error: confirmError } = await supabase
        .from('ticket_confirmations')
        .insert({
          ticket_id: ticketId,
          confirmed_by_user_id: userId,
          confirmer_role: role,
          confirmation_notes: notes.trim(),
          confirmation_photo_url: photoUrl
        })

      if (confirmError) {
        console.error('Confirmation error:', confirmError)
        toast.error('Failed to save confirmation')
        setLoading(false)
        return
      }

      // Update ticket confirmation flags
      const updateData: any = {}
      if (role === 'gym_owner') {
        updateData.confirmed_by_gym = true
      } else {
        updateData.confirmed_by_factory = true
      }

      // Check if both parties have confirmed
      const { data: confirmations } = await supabase
        .from('ticket_confirmations')
        .select('confirmer_role')
        .eq('ticket_id', ticketId)

      const hasGymConfirmation = confirmations?.some(c => c.confirmer_role === 'gym_owner')
      const hasFactoryConfirmation = confirmations?.some(c => 
        ['factory_employee', 'factory_approver', 'factory_owner'].includes(c.confirmer_role)
      )

      if (hasGymConfirmation && hasFactoryConfirmation) {
        updateData.confirmed_at = new Date().toISOString()
        updateData.status = 'closed'
      }

      // Update ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)

      if (updateError) {
        console.error('Update error:', updateError)
        toast.error('Failed to update ticket')
        setLoading(false)
        return
      }

      // Create ticket event
      await supabase.from('ticket_events').insert({
        ticket_id: ticketId,
        actor_user_id: userId,
        event_type: 'confirmation',
        data: {
          confirmer_role: role,
          notes: notes.trim(),
          has_photo: true
        }
      })

      toast.success('Confirmation submitted successfully!')
      onConfirmed()
      onClose()
    } catch (err: any) {
      console.error('Error:', err)
      toast.error(err.message || 'Failed to confirm resolution')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className={`rounded-xl shadow-2xl max-w-2xl w-full transition-all duration-200 ${
        isDarkMode ? 'bg-zinc-900 text-gray-100 ring-1 ring-zinc-800' : 'bg-white text-gray-900 ring-1 ring-gray-200'
      }`}>
        {/* Header */}
        <div className={`border-b px-6 py-4 flex justify-between items-center ${
          isDarkMode ? 'border-zinc-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <CheckCircle className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Confirm Ticket Resolution
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info Alert */}
          <div className={`p-4 rounded-lg ${
            isDarkMode 
              ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <p className="text-sm">
              <strong>Dual Confirmation Required:</strong> Both the gym owner and a factory representative must confirm 
              that the equipment has been successfully repaired before the ticket can be closed.
            </p>
          </div>

          {/* Confirmation Notes */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirmation Notes *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the repair work completed, any observations about the equipment condition, etc..."
              rows={4}
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
              } focus:outline-none focus:ring-2`}
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Photo of Repaired Equipment *
            </label>
            {photoPreview ? (
              <div className="relative space-y-2">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Remove Photo</span>
                </button>
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

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !notes.trim() || !photoFile}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Confirm Resolution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
