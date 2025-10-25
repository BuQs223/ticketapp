'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, History, Wrench, CheckCircle, Calendar, User, Image as ImageIcon, ZoomIn } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageLightbox from './ImageLightbox'

interface Props {
  equipmentId: string
  equipmentName: string
  onClose: () => void
}

interface HistoryEvent {
  id: string
  event_type: 'repair' | 'verification' | 'maintenance' | 'inspection'
  event_date: string
  reason: string
  description: string | null
  performer_role: string
  photo_url: string | null
  next_verification_date: string | null
  ticket_id: string | null
  created_at: string
}

export default function EquipmentHistoryModal({ equipmentId, equipmentName, onClose }: Props) {
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState('')

  useEffect(() => {
    const checkTheme = () => {
      const theme = localStorage.getItem('theme') || 'light'
      setIsDarkMode(theme === 'dark')
    }

    checkTheme()
    const interval = setInterval(checkTheme, 100)

    window.addEventListener('storage', checkTheme)

    return () => {
      window.removeEventListener('storage', checkTheme)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [equipmentId])

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('event_date', { ascending: false })

      if (error) throw error

      setHistory(data || [])
    } catch (error: any) {
      toast.error('Failed to load equipment history')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'repair':
        return <Wrench className="w-5 h-5 text-orange-500" />
      case 'verification':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-blue-500" />
      case 'inspection':
        return <CheckCircle className="w-5 h-5 text-purple-500" />
      default:
        return <History className="w-5 h-5 text-gray-500" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'repair':
        return isDarkMode ? 'bg-orange-900/50 text-orange-300 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-200'
      case 'verification':
        return isDarkMode ? 'bg-green-900/50 text-green-300 border-green-500/30' : 'bg-green-100 text-green-800 border-green-200'
      case 'maintenance':
        return isDarkMode ? 'bg-blue-900/50 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
      case 'inspection':
        return isDarkMode ? 'bg-purple-900/50 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      gym_owner: 'Gym Owner',
      gym_employee: 'Gym Employee',
      factory_employee: 'Factory Employee',
      factory_approver: 'Factory Approver',
      factory_owner: 'Factory Owner'
    }
    return roleLabels[role] || role
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
          isDarkMode ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <History className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Equipment History
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {equipmentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
              <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No history records found
              </p>
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Equipment history will appear here after repairs and verifications
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {history.map((event, index) => (
                  <div key={event.id} className="relative pb-8">
                    {/* Timeline line */}
                    {index < history.length - 1 && (
                      <div className={`absolute left-[22px] top-[45px] bottom-0 w-0.5 ${
                        isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'
                      }`} />
                    )}

                    {/* Event card */}
                    <div className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
                      }`}>
                        {getEventIcon(event.event_type)}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 rounded-lg border p-4 ${getEventColor(event.event_type)}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg capitalize">
                                {event.event_type}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isDarkMode ? 'bg-black/30' : 'bg-white/80'
                              }`}>
                                {getRoleBadge(event.performer_role)}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Calendar className="w-4 h-4" />
                              {new Date(event.event_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="mb-3">
                          <h4 className="font-medium mb-1">Reason:</h4>
                          <p className="text-sm">{event.reason}</p>
                        </div>

                        {/* Description */}
                        {event.description && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-1">Details:</h4>
                            <p className="text-sm">{event.description}</p>
                          </div>
                        )}

                        {/* Photo */}
                        {event.photo_url && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Photo Evidence:
                            </h4>
                            <div
                              className="relative w-full h-48 rounded-lg overflow-hidden cursor-pointer group"
                              onClick={() => {
                                setSelectedImage(event.photo_url!)
                                setLightboxOpen(true)
                              }}
                            >
                              <img
                                src={event.photo_url}
                                alt={`${event.event_type} photo`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Next Verification */}
                        {event.next_verification_date && (
                          <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-sm ${
                            isDarkMode ? 'border-white/10' : 'border-black/10'
                          }`}>
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Next Verification:</span>
                            <span>
                              {new Date(event.next_verification_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        {/* Ticket Link */}
                        {event.ticket_id && (
                          <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Ticket ID: {event.ticket_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className={`mt-6 p-4 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-4 ${
                isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {history.filter(h => h.event_type === 'repair').length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Repairs</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {history.filter(h => h.event_type === 'verification').length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Verifications</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {history.filter(h => h.event_type === 'maintenance').length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maintenance</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {history.filter(h => h.event_type === 'inspection').length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Inspections</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && selectedImage && (
        <ImageLightbox 
          imageUrl={selectedImage} 
          onClose={() => {
            setLightboxOpen(false)
            setSelectedImage('')
          }} 
        />
      )}
    </div>
  )
}
