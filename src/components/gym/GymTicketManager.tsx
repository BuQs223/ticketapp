'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Ticket, Filter, X, Calendar, AlertCircle } from 'lucide-react'
import type { TicketStatus, Priority } from '@/types/database'

interface TicketData {
  id: string
  status: TicketStatus
  priority: Priority
  description: string
  photo_url?: string | null
  created_at: string
  updated_at: string
  equipment?: {
    id: string
    name: string
    serial_number: string
  }
}

interface Props {
  tickets: TicketData[]
  onViewTicket: (ticketId: string) => void
}

export default function GymTicketManager({ tickets, onViewTicket }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
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

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.equipment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.equipment?.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tickets, searchTerm, statusFilter, priorityFilter])

  const inputClass = useMemo(
    () =>
      `w-full px-4 py-2 rounded-lg border transition-colors ${
        isDarkMode
          ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
      } focus:outline-none focus:ring-2`,
    [isDarkMode]
  )

  const getStatusColor = (status: TicketStatus) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-medium'
    if (status === 'open' || status === 'in_review') {
      return `${baseClass} ${
        isDarkMode
          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
          : 'bg-blue-100 text-blue-800'
      }`
    }
    if (status === 'resolved' || status === 'closed') {
      return `${baseClass} ${
        isDarkMode
          ? 'bg-green-500/10 text-green-300 border border-green-500/30'
          : 'bg-green-100 text-green-800'
      }`
    }
    if (status === 'rejected') {
      return `${baseClass} ${
        isDarkMode ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-800'
      }`
    }
    return `${baseClass} ${
      isDarkMode
        ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
        : 'bg-yellow-100 text-yellow-800'
    }`
  }

  const getPriorityColor = (priority: Priority) => {
    const baseClass = 'px-2.5 py-0.5 rounded text-xs font-medium'
    switch (priority) {
      case 'high':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
            : 'bg-orange-100 text-orange-700 border border-orange-200'
        }`
      case 'medium':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
        }`
      case 'low':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`
      default:
        return baseClass
    }
  }

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
          className={`${inputClass} w-full sm:w-48`}
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

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setStatusFilter('all')
              setPriorityFilter('all')
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode
                ? 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {filteredTickets.length} of {tickets.length} tickets
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div
          className={`text-center py-12 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          <Ticket className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => onViewTicket(ticket.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {ticket.equipment?.name || 'Unknown Equipment'}
                    </h3>
                    <span className={getPriorityColor(ticket.priority)}>{ticket.priority}</span>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    {ticket.equipment?.serial_number}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                    {ticket.description}
                  </p>
                </div>
                <span className={getStatusColor(ticket.status)}>{ticket.status.replace(/_/g, ' ')}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-opacity-50">
                <div className="flex items-center gap-4 text-xs">
                  <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  {ticket.photo_url && (
                    <div className={`flex items-center gap-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Has photo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
