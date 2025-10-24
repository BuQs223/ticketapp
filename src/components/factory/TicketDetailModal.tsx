'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CheckCircle, XCircle, MessageSquare, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'
import type { TicketStatus } from '@/types/database'

interface Props {
  ticket: any
  role: 'owner' | 'approver' | 'employee'
  userId: string
  onClose: () => void
  onUpdate: () => void
}

export default function TicketDetailModal({ ticket, role, userId, onClose, onUpdate }: Props) {
  const [events, setEvents] = useState<any[]>([])
  const [visitRequest, setVisitRequest] = useState<any | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
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
    const { data, error } = await supabase
      .from('factory_visit_requests')
      .select('*')
      .eq('ticket_id', ticket.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching visit request:', error)
    }
    setVisitRequest(data)
  }

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'closed' ? { closed_at: new Date().toISOString(), closed_by: userId } : {})
        })
        .eq('id', ticket.id)

      if (updateError) throw updateError

      // Log event
      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        actor_user_id: userId,
        event_type: 'status_change',
        data: { from: ticket.status, to: newStatus }
      })

      toast.success('Ticket status updated')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket')
      console.error(error)
    } finally {
      setLoading(false)
    }
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

  const handleCoRequest = async () => {
    if (!visitRequest) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('factory_visit_requests')
        .update({
          requested_by_factory_employee: true,
          factory_employee_user_id: userId,
          requested_by_factory_employee_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.id)

      if (error) throw error

      // Update ticket status to factory_visit_requested if gym also requested
      if (visitRequest.requested_by_gym_owner) {
        await handleStatusUpdate('factory_visit_requested')
      }
      
      toast.success('Factory visit co-requested successfully')
      onClose() // Refresh by closing
    } catch (error: any) {
      toast.error(error.message || 'Failed to co-request visit')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveVisit = async () => {
    if (!visitRequest) return
    
    // Check if both requests are present
    if (!visitRequest.requested_by_gym_owner || !visitRequest.requested_by_factory_employee) {
      toast.error('Both gym owner and factory employee must request the visit before approval')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('factory_visit_requests')
        .update({
          approval: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.id)

      if (error) throw error

      // Update ticket status
      await handleStatusUpdate('factory_visit_approved')
      
      toast.success('Factory visit approved')
      onClose() // Refresh by closing
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve visit')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectVisit = async () => {
    if (!visitRequest) return

    const reason = prompt('Please provide a rejection reason:')
    if (!reason) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('factory_visit_requests')
        .update({
          approval: 'rejected',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.id)

      if (error) throw error

      // Update ticket status
      await handleStatusUpdate('rejected')
      
      toast.success('Factory visit rejected')
      onClose() // Refresh by closing
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject visit')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const canCoRequest = visitRequest && 
                       !visitRequest.requested_by_factory_employee &&
                       visitRequest.requested_by_gym_owner &&
                       visitRequest.approval === 'pending'

  const canApproveVisit = (role === 'owner' || role === 'approver') && 
                          visitRequest && 
                          visitRequest.approval === 'pending' &&
                          visitRequest.requested_by_gym_owner &&
                          visitRequest.requested_by_factory_employee

  const inputClass = `w-full px-3 py-2 rounded-lg border transition-colors ${
    isDarkMode
      ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
  } focus:outline-none focus:ring-2`

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
                  {ticket.equipment?.name}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {ticket.gyms?.name} • SN: {ticket.equipment?.serial_number}
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

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description:
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
                  alt="Ticket" 
                  className={`max-w-md rounded-lg border ${isDarkMode ? 'border-zinc-700' : 'border-gray-200'}`}
                />
              </div>
            )}

            <div className={`mt-4 grid grid-cols-2 gap-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <div>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
                <span className="ml-2 font-medium">{ticket.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Created:</span>
                <span className="ml-2 font-medium">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Visit Request Info */}
          {visitRequest && (
            <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Factory Visit Request
              </h4>
              <div className={`p-4 rounded-lg space-y-2 text-sm ${
                isDarkMode ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>Gym Owner Request:</span>
                  <span className={visitRequest.requested_by_gym_owner 
                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                    : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }>
                    {visitRequest.requested_by_gym_owner ? '✓ Requested' : '✗ Not requested'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>Factory Employee Request:</span>
                  <span className={visitRequest.requested_by_factory_employee 
                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                    : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }>
                    {visitRequest.requested_by_factory_employee ? '✓ Requested' : '✗ Not requested'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>Approval Status:</span>
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

                {canCoRequest && (
                  <div className={`pt-3 border-t mt-3 ${
                    isDarkMode ? 'border-orange-500/30' : 'border-orange-200'
                  }`}>
                    <button
                      onClick={handleCoRequest}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Co-Request Factory Visit</span>
                    </button>
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Both gym owner and factory employee must request before approval
                    </p>
                  </div>
                )}

                {canApproveVisit && (
                  <div className={`flex space-x-2 pt-3 border-t mt-3 ${
                    isDarkMode ? 'border-orange-500/30' : 'border-orange-200'
                  }`}>
                    <button
                      onClick={handleApproveVisit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve Visit</span>
                    </button>
                    <button
                      onClick={handleRejectVisit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Visit</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Actions</h4>
            <div className="flex flex-wrap gap-2">
              {ticket.status === 'open' && (
                <button
                  onClick={() => handleStatusUpdate('in_review')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Mark as In Review
                </button>
              )}
              {ticket.status === 'factory_visit_approved' && (
                <button
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Mark as Resolved
                </button>
              )}
              {ticket.status === 'resolved' && (
                <button
                  onClick={() => handleStatusUpdate('closed')}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Close Ticket
                </button>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className={`border-t pt-6 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
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
                className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {event.data && (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
