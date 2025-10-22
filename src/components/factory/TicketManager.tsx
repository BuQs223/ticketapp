'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TicketStatus } from '@/types/database'
import TicketDetailModal from './TicketDetailModal'

interface Props {
  role: 'owner' | 'approver' | 'employee'
  userId: string
  factoryId: string
}

export default function TicketManager({ role, userId, factoryId }: Props) {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchTickets()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        equipment:equipment_id (
          id,
          name,
          serial_number
        ),
        gyms:gym_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to fetch tickets')
      console.error(error)
    } else {
      setTickets(data || [])
    }
    setLoading(false)
  }

  const handleViewDetails = (ticket: any) => {
    setSelectedTicket(ticket)
    setShowDetailModal(true)
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.equipment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.gyms?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open':
      case 'in_review':
        return 'bg-blue-100 text-blue-800'
      case 'gym_fix_in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'awaiting_factory_review':
      case 'factory_visit_requested':
        return 'bg-orange-100 text-orange-800'
      case 'factory_visit_approved':
        return 'bg-purple-100 text-purple-800'
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Management</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="gym_fix_in_progress">Gym Fix In Progress</option>
              <option value="awaiting_factory_review">Awaiting Factory Review</option>
              <option value="factory_visit_requested">Factory Visit Requested</option>
              <option value="factory_visit_approved">Factory Visit Approved</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ticket.equipment?.name || 'Unknown Equipment'}</h3>
                      <p className="text-sm text-gray-500">
                        {ticket.gyms?.name || 'Unknown Gym'} • SN: {ticket.equipment?.serial_number}
                      </p>
                    </div>
                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{ticket.description}</p>

                  <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                    <span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Updated {new Date(ticket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>

                  <button
                    onClick={() => handleViewDetails(ticket)}
                    className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          role={role}
          userId={userId}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedTicket(null)
          }}
          onUpdate={() => {
            fetchTickets()
          }}
        />
      )}
    </div>
  )
}
