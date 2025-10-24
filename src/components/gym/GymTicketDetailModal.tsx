'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CheckCircle, AlertTriangle, MessageSquare, Wrench, Factory } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'
import type { TicketStatus } from '@/types/database'

interface Props {
  ticket: any
  userRole: 'owner' | 'employee'
  userId: string
  onClose: () => void
  onUpdate: () => void
}

export default function GymTicketDetailModal({ ticket, userRole, userId, onClose, onUpdate }: Props) {
  const [events, setEvents] = useState<any[]>([])
  const [visitRequest, setVisitRequest] = useState<any | null>(null)
  const [comment, setComment] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

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
    fetchTicketEvents()
    fetchVisitRequest()
  }, [ticket.id])

  const fetchTicketEvents = async () => {
    const { data } = await supabase
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })

    setEvents(data || [])
  }

  const fetchVisitRequest = async () => {
    const { data } = await supabase
      .from('factory_visit_requests')
      .select('*')
      .eq('ticket_id', ticket.id)
      .maybeSingle()

    setVisitRequest(data)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setLoading(true)

    try {
      const { error } = await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        actor_user_id: userId,
        event_type: 'comment',
        data: { comment: comment.trim() }
      })

      if (error) throw error

      toast.success('Comment added')
      setComment('')
      fetchTicketEvents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkInProgress = async () => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'gym_fix_in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticket.id)

      if (error) throw error

      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        actor_user_id: userId,
        event_type: 'status_change',
        data: { from: ticket.status, to: 'gym_fix_in_progress', note: 'Gym attempting to fix internally' }
      })

      toast.success('Ticket marked as in progress')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveInternally = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolutionNotes.trim()) {
      toast.error('Please provide resolution notes')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes.trim(),
          closed_at: new Date().toISOString(),
          closed_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)

      if (error) throw error

      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        actor_user_id: userId,
        event_type: 'status_change',
        data: { 
          from: ticket.status, 
          to: 'resolved',
          resolution_type: 'internal',
          notes: resolutionNotes.trim()
        }
      })

      toast.success('Ticket resolved successfully!')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to resolve ticket')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestFactoryVisit = async () => {
    if (visitRequest) {
      toast.error('Factory visit already requested')
      return
    }

    const confirmed = confirm(
      'Are you sure you want to request a factory visit? This means the gym cannot fix this issue internally.'
    )
    if (!confirmed) return

    setLoading(true)

    try {
      // Create factory visit request
      const { error: insertError } = await supabase
        .from('factory_visit_requests')
        .insert({
          ticket_id: ticket.id,
          requested_by_gym_owner: true,
          gym_owner_user_id: userId,
          requested_by_gym_owner_at: new Date().toISOString(),
          approval: 'pending'
        })

      if (insertError) throw insertError

      // Update ticket status
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'awaiting_factory_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)

      if (updateError) throw updateError

      // Log event
      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        actor_user_id: userId,
        event_type: 'approval_requested',
        data: { by: 'gym_owner', reason: 'Cannot fix internally' }
      })

      toast.success('Factory visit requested successfully!')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to request factory visit')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border transition-colors ${
    isDarkMode
      ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
  } focus:outline-none focus:ring-2`

  const canTakeAction = userRole === 'owner'
  const isOpen = ticket.status === 'open'
  const isInProgress = ticket.status === 'gym_fix_in_progress'
  const isAwaitingFactory = ticket.status === 'awaiting_factory_review' || 
                             ticket.status === 'factory_visit_requested' ||
                             ticket.status === 'factory_visit_approved'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors ${
        isDarkMode ? 'bg-zinc-900 text-gray-100' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 flex justify-between items-center transition-colors ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Ticket Details
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

        <div className="p-6 space-y-6">
          {/* Ticket Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {ticket.equipment?.name || 'Unknown Equipment'}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Serial: {ticket.equipment?.serial_number || 'N/A'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                ticket.priority === 'high' 
                  ? isDarkMode ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-800'
                  : ticket.priority === 'medium' 
                    ? isDarkMode ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-800'
                    : isDarkMode ? 'bg-green-500/10 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-800'
              }`}>
                {ticket.priority.toUpperCase()} PRIORITY
              </span>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                isAwaitingFactory
                  ? isDarkMode ? 'bg-orange-500/10 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-800'
                  : ticket.status === 'resolved' || ticket.status === 'closed'
                    ? isDarkMode ? 'bg-green-500/10 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-800'
                    : isDarkMode ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-800'
              }`}>
                {ticket.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Issue Description:
              </p>
              <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>{ticket.description}</p>
            </div>

            {ticket.photo_url && (
              <div className="mt-4">
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Photo:
                </p>
                <img 
                  src={ticket.photo_url} 
                  alt="Issue" 
                  className={`max-w-md rounded-lg border ${isDarkMode ? 'border-zinc-700' : 'border-gray-200'}`}
                />
              </div>
            )}

            {ticket.resolution_notes && (
              <div className={`mt-4 p-4 rounded-lg border ${
                isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
              }`}>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                  Resolution Notes:
                </p>
                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{ticket.resolution_notes}</p>
              </div>
            )}

            <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>Created: {formatDate(ticket.created_at)}</p>
              {ticket.closed_at && <p>Closed: {formatDate(ticket.closed_at)}</p>}
            </div>
          </div>

          {/* Factory Visit Request Status */}
          {visitRequest && (
            <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <Factory className="w-5 h-5" />
                Factory Visit Request
              </h4>
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Status:</span>
                    <span className={`font-medium ${
                      visitRequest.approval === 'approved' 
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : visitRequest.approval === 'rejected'
                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                          : isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      {visitRequest.approval.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Requested:</span>
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                      {new Date(visitRequest.requested_by_gym_owner_at).toLocaleDateString()}
                    </span>
                  </div>
                  {visitRequest.approval === 'pending' && (
                    <p className={`text-xs italic mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Waiting for factory employee to co-request and approval from factory...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions for Gym Staff */}
          {canTakeAction && !showResolveForm && (
            <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Actions</h4>
              <div className="flex flex-wrap gap-2">
                {isOpen && (
                  <>
                    <button
                      onClick={handleMarkInProgress}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Wrench className="w-4 h-4" />
                      Start Working on It
                    </button>
                    <button
                      onClick={handleRequestFactoryVisit}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      <Factory className="w-4 h-4" />
                      Request Factory Visit
                    </button>
                  </>
                )}
                {(isOpen || isInProgress) && (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resolve Form */}
          {showResolveForm && (
            <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Resolve Ticket
              </h4>
              <form onSubmit={handleResolveInternally} className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Resolution Notes *
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe how you fixed the issue..."
                    rows={4}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading || !resolutionNotes.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Confirm Resolution
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResolveForm(false)
                      setResolutionNotes('')
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isDarkMode ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comments */}
          <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              <MessageSquare className="w-5 h-5" />
              Activity & Comments
            </h4>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={loading || !comment.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add Comment
              </button>
            </form>

            {/* Events List */}
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No activity yet</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                    {event.data?.comment && (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {event.data.comment}
                      </p>
                    )}
                    {event.data && !event.data.comment && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {JSON.stringify(event.data)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
