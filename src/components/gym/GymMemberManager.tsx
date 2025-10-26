'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, UserPlus, Shield, User, X, Mail, UserCog, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import type { GymRole } from '@/types/database'

interface GymMember {
  user_id: string
  gym_id: string
  role: GymRole
  approved_at: string | null
  created_at: string
  email?: string
  user?: {
    id: string
    email: string
  }
}

interface Props {
  members: GymMember[]
  isOwner: boolean
  gymId: string
  onMembersChange?: () => void
}

export default function GymMemberManager({ members: initialMembers, isOwner, gymId, onMembersChange }: Props) {
  const [members, setMembers] = useState<GymMember[]>(initialMembers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<GymRole | 'all'>('all')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [emailSearch, setEmailSearch] = useState('')
  const [emailSuggestions, setEmailSuggestions] = useState<Array<{ id: string; email: string }>>([])
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null)
  const [selectedRole, setSelectedRole] = useState<GymRole>('employee')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMember, setEditingMember] = useState<GymMember | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMembers.length >= 20)
  const [loadPage, setLoadPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  // Update members when initialMembers changes
  useEffect(() => {
    setMembers(initialMembers)
    setHasMore(initialMembers.length >= 20)
    setLoadPage(1)
  }, [initialMembers])

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
      // Check both direct email field and nested user.email
      const memberEmail = member.email || member.user?.email || ''
      const matchesSearch = memberEmail.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [approvedMembers, searchTerm, roleFilter])

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter])

  const inputClass = useMemo(
    () =>
      `w-full px-4 py-2 rounded-lg border transition-colors ${
        isDarkMode
          ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
      } focus:outline-none focus:ring-2`,
    [isDarkMode]
  )

  // Email search with debounce
  useEffect(() => {
    if (!emailSearch || emailSearch.length < 2) {
      setEmailSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/gym/search-users?q=${encodeURIComponent(emailSearch)}`)
        if (response.ok) {
          const data = await response.json()
          setEmailSuggestions(data.users || [])
        }
      } catch (error) {
        console.error('Error searching users:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [emailSearch])

  const loadMoreMembers = async () => {
    setIsLoadingMore(true)
    try {
      const nextPage = loadPage + 1
      const response = await fetch(
        `/api/gym/members/list?gym_id=${gymId}&page=${nextPage}&limit=20`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load more members')
      }

      const data = await response.json()
      
      setMembers(prev => [...prev, ...data.members])
      setHasMore(data.pagination.hasMore)
      setLoadPage(nextPage)
      
      toast.success(`Loaded ${data.members.length} more members`, {
        icon: '📄',
        duration: 2000,
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
    } catch (error) {
      console.error('Error loading more members:', error)
      toast.error('Failed to load more members', {
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user', {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
      return
    }

    setIsSubmitting(true)
    
    const addingToast = toast.loading(`Adding ${selectedUser.email}...`, {
      style: {
        borderRadius: '10px',
        background: isDarkMode ? '#18181b' : '#fff',
        color: isDarkMode ? '#e4e4e7' : '#1f2937',
      },
    })

    try {
      // Server-side API call (SSR)
      const response = await fetch('/api/gym/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          gym_id: gymId,
          role: selectedRole,
          email: selectedUser.email
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member')
      }

      toast.success(
        <div>
          <p className="font-medium">Member added successfully!</p>
          <p className="text-sm opacity-75">{selectedUser.email} is now a {selectedRole}</p>
        </div>,
        {
          id: addingToast,
          icon: '🎉',
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
          },
        }
      )
      
      setShowAddModal(false)
      setEmailSearch('')
      setSelectedUser(null)
      setSelectedRole('employee')
      setEmailSuggestions([])
      onMembersChange?.()
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast.error(
        <div>
          <p className="font-medium">Failed to add member</p>
          <p className="text-sm opacity-75">{error.message}</p>
        </div>,
        {
          id: addingToast,
          icon: '❌',
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
          },
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingMember) return

    setIsSubmitting(true)
    
    const updatingToast = toast.loading('Updating role...', {
      style: {
        borderRadius: '10px',
        background: isDarkMode ? '#18181b' : '#fff',
        color: isDarkMode ? '#e4e4e7' : '#1f2937',
      },
    })

    try {
      // Server-side API call (SSR)
      const response = await fetch('/api/gym/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editingMember.user_id,
          gym_id: gymId,
          role: selectedRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      const memberEmail = editingMember.email || editingMember.user?.email || 'Member'
      toast.success(
        <div>
          <p className="font-medium">Role updated successfully!</p>
          <p className="text-sm opacity-75">{memberEmail} is now a {selectedRole}</p>
        </div>,
        {
          id: updatingToast,
          icon: '✅',
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
          },
        }
      )
      
      setShowEditModal(false)
      setEditingMember(null)
      onMembersChange?.()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(
        <div>
          <p className="font-medium">Failed to update role</p>
          <p className="text-sm opacity-75">{error.message}</p>
        </div>,
        {
          id: updatingToast,
          icon: '❌',
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
          },
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (member: GymMember) => {
    if (member.role === 'owner') {
      toast.error('Cannot remove gym owner', {
        icon: '🚫',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
      return
    }

    // Use toast.promise for confirmation-style flow
    const memberEmail = member.email || member.user?.email || 'this member'
    
    // Show confirmation toast
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium">Remove {memberEmail}?</p>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id)
              performRemoveMember(member, memberEmail)
            }}
            className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      style: {
        borderRadius: '10px',
        background: isDarkMode ? '#18181b' : '#fff',
        color: isDarkMode ? '#e4e4e7' : '#1f2937',
        border: isDarkMode ? '1px solid #27272a' : '1px solid #e5e7eb',
      },
    })
  }

  const performRemoveMember = async (member: GymMember, memberEmail: string) => {
    const removingToast = toast.loading(`Removing ${memberEmail}...`, {
      style: {
        borderRadius: '10px',
        background: isDarkMode ? '#18181b' : '#fff',
        color: isDarkMode ? '#e4e4e7' : '#1f2937',
      },
    })

    try {
      // Server-side API call (SSR)
      const response = await fetch(
        `/api/gym/members?user_id=${member.user_id}&gym_id=${gymId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }

      toast.success(`${memberEmail} removed successfully`, {
        id: removingToast,
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
      onMembersChange?.()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || 'Failed to remove member', {
        id: removingToast,
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: isDarkMode ? '#18181b' : '#fff',
          color: isDarkMode ? '#e4e4e7' : '#1f2937',
        },
      })
    }
  }

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
      {/* Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
            border: isDarkMode ? '1px solid #27272a' : '1px solid #e5e7eb',
          },
        }}
      />

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

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* View-Only Notice for Non-Owners */}
      {!isOwner && (
        <div className={`rounded-lg p-4 border ${
          isDarkMode
            ? 'bg-blue-900/20 border-blue-800/30'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                View-Only Access
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                👁️ You can view gym members but cannot add, edit, or remove them. Contact the gym owner for member management.
              </p>
            </div>
          </div>
        </div>
      )}

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
          {paginatedMembers.map((member) => (
            <div
              key={member.user_id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {member.email || member.user?.email || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {isOwner && member.role !== 'owner' && (
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingMember(member)
                        setSelectedRole(member.role)
                        setShowEditModal(true)
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'text-blue-400 hover:bg-blue-500/10'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Edit role"
                    >
                      <UserCog className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
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

      {/* Pagination Controls */}
      {filteredMembers.length > 0 && (
        <div className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg ${
          isDarkMode ? 'bg-zinc-800/50' : 'bg-gray-50'
        }`}>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length} members
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-zinc-700 text-gray-300 hover:bg-zinc-600 disabled:hover:bg-zinc-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'
              }`}
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        currentPage === page
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white'
                          : isDarkMode
                          ? 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>

            {/* Mobile: Just show current page */}
            <div className={`sm:hidden px-3 py-2 rounded-lg ${
              isDarkMode ? 'bg-zinc-700 text-gray-300' : 'bg-white border border-gray-300 text-gray-700'
            }`}>
              {currentPage} / {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-zinc-700 text-gray-300 hover:bg-zinc-600 disabled:hover:bg-zinc-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !searchTerm && roleFilter === 'all' && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMoreMembers}
            disabled={isLoadingMore}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500'
            } disabled:cursor-not-allowed`}
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            ) : (
              <span>Load More Members</span>
            )}
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-lg p-6 ${
            isDarkMode ? 'bg-zinc-900 text-gray-100' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Gym Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEmailSearch('')
                  setSelectedUser(null)
                  setEmailSuggestions([])
                }}
                className={`p-1 rounded-lg ${
                  isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email Search */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Search User by Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="email"
                    value={emailSearch}
                    onChange={(e) => {
                      setEmailSearch(e.target.value)
                      setSelectedUser(null)
                    }}
                    placeholder="Type email to search..."
                    className={`${inputClass} pl-10`}
                    autoFocus
                  />
                </div>

                {/* Suggestions Dropdown */}
                {emailSuggestions.length > 0 && !selectedUser && (
                  <div className={`mt-2 border rounded-lg overflow-hidden ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-300'
                  }`}>
                    {emailSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => {
                          setSelectedUser(suggestion)
                          setEmailSearch(suggestion.email)
                          setEmailSuggestions([])
                        }}
                        className={`w-full px-4 py-2 text-left transition-colors ${
                          isDarkMode
                            ? 'hover:bg-zinc-700 text-gray-200'
                            : 'hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        {suggestion.email}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected User */}
                {selectedUser && (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    isDarkMode
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">✓ {selectedUser.email}</span>
                      <button
                        onClick={() => {
                          setSelectedUser(null)
                          setEmailSearch('')
                        }}
                        className="text-sm hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as GymRole)}
                  className={inputClass}
                  disabled={!selectedUser}
                >
                  <option value="employee">Employee</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEmailSearch('')
                    setSelectedUser(null)
                    setEmailSuggestions([])
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-lg p-6 ${
            isDarkMode ? 'bg-zinc-900 text-gray-100' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Member Role</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingMember(null)
                }}
                className={`p-1 rounded-lg ${
                  isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Member
                </p>
                <p className="font-medium">
                  {editingMember.email || editingMember.user?.email}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as GymRole)}
                  className={inputClass}
                  autoFocus
                >
                  <option value="employee">Employee</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingMember(null)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={isSubmitting || selectedRole === editingMember.role}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
