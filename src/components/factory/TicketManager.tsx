'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

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

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const getStatusColor = (status: TicketStatus) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    if (isDarkMode) {
      switch (status) {
        case 'open':
        case 'in_review':
          return `${baseClasses} bg-blue-500/10 text-blue-300 border border-blue-500/30`
        case 'gym_fix_in_progress':
          return `${baseClasses} bg-yellow-500/10 text-yellow-300 border border-yellow-500/30`
        case 'awaiting_factory_review':
        case 'factory_visit_requested':
          return `${baseClasses} bg-orange-500/10 text-orange-300 border border-orange-500/30`
        case 'factory_visit_approved':
          return `${baseClasses} bg-purple-500/10 text-purple-300 border border-purple-500/30`
        case 'resolved':
        case 'closed':
          return `${baseClasses} bg-green-500/10 text-green-300 border border-green-500/30`
        case 'rejected':
          return `${baseClasses} bg-red-500/10 text-red-300 border border-red-500/30`
        default:
          return `${baseClasses} bg-gray-500/10 text-gray-300 border border-gray-500/30`
      }
    } else {
      switch (status) {
        case 'open':
        case 'in_review':
          return `${baseClasses} bg-blue-100 text-blue-800`
        case 'gym_fix_in_progress':
          return `${baseClasses} bg-yellow-100 text-yellow-800`
        case 'awaiting_factory_review':
        case 'factory_visit_requested':
          return `${baseClasses} bg-orange-100 text-orange-800`
        case 'factory_visit_approved':
          return `${baseClasses} bg-purple-100 text-purple-800`
        case 'resolved':
        case 'closed':
          return `${baseClasses} bg-green-100 text-green-800`
        case 'rejected':
          return `${baseClasses} bg-red-100 text-red-800`
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`
      }
    }
  }

  const getPriorityColor = (priority: string) => {
    if (isDarkMode) {
      switch (priority) {
        case 'high':
          return 'text-red-400'
        case 'medium':
          return 'text-yellow-400'
        case 'low':
          return 'text-green-400'
        default:
          return 'text-gray-400'
      }
    } else {
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
  }

  const inputClass = useMemo(() => 
    `w-full pl-10 pr-4 py-2 border rounded-lg transition-colors ${
      isDarkMode
        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500 focus:ring-orange-500 focus:border-orange-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500 focus:border-orange-500'
    }`, [isDarkMode])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Ticket Management
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
              className={`${inputClass} appearance-none`}
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
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            isDarkMode ? 'border-orange-400' : 'border-orange-600'
          }`}></div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className={`text-center py-12 rounded-lg ${
          isDarkMode ? 'bg-zinc-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`border rounded-lg p-5 hover:shadow-md transition-all ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {ticket.equipment?.name || 'Unknown Equipment'}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {ticket.gyms?.name || 'Unknown Gym'} • SN: {ticket.equipment?.serial_number}
                      </p>
                    </div>
                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>

                  <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ticket.description}
                  </p>

                  <div className={`flex flex-wrap gap-2 items-center text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Updated {new Date(ticket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>

                  <button
                    onClick={() => handleViewDetails(ticket)}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
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
        
      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={`mt-6 flex items-center justify-between border-t pt-4 ${
          isDarkMode ? 'border-zinc-800' : 'border-gray-200'
        }`}>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? isDarkMode
                    ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-zinc-800 text-gray-200 hover:bg-zinc-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isDarkMode
                      ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? isDarkMode
                    ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-zinc-800 text-gray-200 hover:bg-zinc-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
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
