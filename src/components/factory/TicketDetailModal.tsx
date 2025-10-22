'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CheckCircle, XCircle, MessageSquare, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
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
      .single()

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

  const handleApproveVisit = async () => {
    if (!visitRequest) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('factory_visit_requests')
        .update({
          approval_status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.id)

      if (error) throw error

      // Update ticket status
      await handleStatusUpdate('factory_visit_approved')
      
      toast.success('Factory visit approved')
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
          approval_status: 'rejected',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('ticket_id', ticket.id)

      if (error) throw error

      // Update ticket status
      await handleStatusUpdate('rejected')
      
      toast.success('Factory visit rejected')
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject visit')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const canApproveVisit = (role === 'owner' || role === 'approver') && 
                          visitRequest && 
                          visitRequest.approval_status === 'pending'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Ticket Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Ticket Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{ticket.equipment?.name}</h3>
                <p className="text-sm text-gray-500">
                  {ticket.gyms?.name} • SN: {ticket.equipment?.serial_number}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {ticket.priority.toUpperCase()} PRIORITY
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Description:</p>
              <p className="text-gray-900">{ticket.description}</p>
            </div>

            {ticket.photo_url && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Photo:</p>
                <img 
                  src={ticket.photo_url} 
                  alt="Ticket" 
                  className="max-w-md rounded-lg border"
                />
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2 font-medium">{ticket.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 font-medium">{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Visit Request Info */}
          {visitRequest && (
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Factory Visit Request</h4>
              <div className="bg-orange-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Gym Owner Request:</span>
                  <span className={visitRequest.requested_by_gym_owner ? 'text-green-600' : 'text-gray-400'}>
                    {visitRequest.requested_by_gym_owner ? '✓ Requested' : '✗ Not requested'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Factory Employee Request:</span>
                  <span className={visitRequest.requested_by_factory_employee ? 'text-green-600' : 'text-gray-400'}>
                    {visitRequest.requested_by_factory_employee ? '✓ Requested' : '✗ Not requested'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Approval Status:</span>
                  <span className={`font-medium ${
                    visitRequest.approval_status === 'approved' ? 'text-green-600' :
                    visitRequest.approval_status === 'rejected' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {visitRequest.approval_status.toUpperCase()}
                  </span>
                </div>

                {canApproveVisit && (
                  <div className="flex space-x-2 pt-3 border-t mt-3">
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
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Actions</h4>
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
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Activity & Comments</h4>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                <p className="text-gray-500 text-sm">No activity yet</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    {event.data && (
                      <p className="text-sm text-gray-700">
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
