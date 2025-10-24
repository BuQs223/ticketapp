'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, UserPlus, Shield, User } from 'lucide-react'
import type { GymRole } from '@/types/database'

interface GymMember {
  user_id: string
  gym_id: string
  role: GymRole
  approved_at: string | null
  created_at: string
  user?: {
    id: string
    email: string
  }
}

interface Props {
  members: GymMember[]
  isOwner: boolean
  onInviteMember?: () => void
}

export default function GymMemberManager({ members, isOwner, onInviteMember }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<GymRole | 'all'>('all')
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

  const approvedMembers = useMemo(() => {
    return members.filter((m) => m.approved_at !== null)
  }, [members])

  const filteredMembers = useMemo(() => {
    return approvedMembers.filter((member) => {
      const matchesSearch =
        member.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [approvedMembers, searchTerm, roleFilter])

  const inputClass = useMemo(
    () =>
      `w-full px-4 py-2 rounded-lg border transition-colors ${
        isDarkMode
          ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
      } focus:outline-none focus:ring-2`,
    [isDarkMode]
  )

  const getRoleBadgeClass = (role: GymRole) => {
    if (role === 'owner') {
      return `px-3 py-1 rounded-full text-xs font-medium ${
        isDarkMode
          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
          : 'bg-purple-100 text-purple-800'
      }`
    }
    return `px-3 py-1 rounded-full text-xs font-medium ${
      isDarkMode
        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
        : 'bg-blue-100 text-blue-800'
    }`
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as GymRole | 'all')}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="employee">Employee</option>
        </select>

        {isOwner && onInviteMember && (
          <button
            onClick={onInviteMember}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {filteredMembers.length} of {approvedMembers.length} team members
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div
          className={`text-center py-12 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          <Users className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.user_id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.role === 'owner'
                        ? isDarkMode
                          ? 'bg-purple-500/20'
                          : 'bg-purple-100'
                        : isDarkMode
                          ? 'bg-blue-500/20'
                          : 'bg-blue-100'
                    }`}
                  >
                    {member.role === 'owner' ? (
                      <Shield
                        className={`w-5 h-5 ${
                          isDarkMode ? 'text-purple-400' : 'text-purple-600'
                        }`}
                      />
                    ) : (
                      <User
                        className={`w-5 h-5 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {member.user?.email || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={getRoleBadgeClass(member.role)}>
                  {member.role}
                </span>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Joined {new Date(member.approved_at || member.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
