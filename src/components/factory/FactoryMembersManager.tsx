'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, UserPlus, Trash2, Shield, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface FactoryMember {
  id: string
  user_id: string
  role: string
  created_at: string
  profiles?: {
    email: string
  }
}

interface User {
  id: string
  email: string
}

interface Props {
  role: 'owner' | 'approver' | 'employee'
  isDarkMode: boolean
}

export default function FactoryMembersManager({ role, isDarkMode }: Props) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('employee')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [userEmailCache, setUserEmailCache] = useState<Map<string, string>>(new Map())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      // Get factory members - they have email stored in the table
      const { data, error } = await supabase
        .from('factory_members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setMembers(data || [])
    } catch (error: any) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load factory members')
    } finally {
      setLoading(false)
    }
  }

  // Search for all registered users via server-side API (secure SSR)
  const searchEmailSuggestions = async (query: string) => {
    if (query.length < 2) {
      setEmailSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      // Call server-side API route (secure SSR)
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()
      const suggestions = data.users || []
      
      setEmailSuggestions(suggestions.map((u: any) => ({
        user_id: u.id,
        email: u.email
      })))
      setShowSuggestions(suggestions.length > 0)
    } catch (error: any) {
      console.error('Error searching emails:', error)
      setEmailSuggestions([])
    }
  }

  const addMember = async () => {
    const email = searchEmail.trim()
    if (!email) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsAddingMember(true)
    try {
      // Fetch user info from server-side API
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(email)}`)
      
      if (!response.ok) {
        toast.error('Failed to search for user')
        setIsAddingMember(false)
        return
      }

      const data = await response.json()
      const users = data.users || []
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())

      if (!user) {
        toast.error('User not found in the system. User must be registered first.')
        setIsAddingMember(false)
        return
      }

      const userId = user.id
      const userEmail = user.email

      // Get factory ID
      const { data: factoryData, error: factoryError } = await supabase
        .from('factory')
        .select('id')
        .single()

      if (factoryError || !factoryData) {
        toast.error('Factory not found')
        setIsAddingMember(false)
        return
      }

      // Check if email already exists as factory member
      const existingMember = members.find(m => m.user_id === userId)
      if (existingMember) {
        toast.error('This user is already a factory member')
        setIsAddingMember(false)
        return
      }

      // Add to factory_members with email stored
      const { error } = await supabase
        .from('factory_members')
        .insert({
          user_id: userId,
          factory_id: factoryData.id,
          email: userEmail,
          role: selectedRole,
          approved_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success(`Added ${userEmail} as factory ${selectedRole}`)
      setSearchEmail('')
      setSelectedRole('employee')
      setShowSuggestions(false)
      fetchMembers()
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast.error(error.message || 'Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  // Debounce typing to reduce queries
  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchEmail(value)
    
    // Debounce search - wait 300ms after user stops typing
    if (value.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchEmailSuggestions(value)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    } else {
      setEmailSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectEmailSuggestion = (email: string) => {
    setSearchEmail(email)
    setShowSuggestions(false)
    setEmailSuggestions([])
  }

  const removeMember = async (userId: string, factoryId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from factory members?`)) {
      return
    }

    try {
      // Optimistic update - remove from UI immediately
      setMembers(prevMembers => prevMembers.filter(m => !(m.user_id === userId && m.factory_id === factoryId)))

      const { error } = await supabase
        .from('factory_members')
        .delete()
        .eq('user_id', userId)
        .eq('factory_id', factoryId)

      if (error) throw error

      toast.success(`Removed ${email} from factory members`)
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
      // Revert on error
      fetchMembers()
    }
  }

  const updateMemberRole = async (userId: string, factoryId: string, newRole: string, email: string) => {
    try {
      // Optimistic update - update UI immediately
      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.user_id === userId && m.factory_id === factoryId ? { ...m, role: newRole } : m
        )
      )

      const { error } = await supabase
        .from('factory_members')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('factory_id', factoryId)

      if (error) throw error

      toast.success(`Updated ${email} role to ${newRole}`)
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error('Failed to update member role')
      // Revert on error
      fetchMembers()
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(members.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMembers = members.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'approver':
        return isDarkMode
          ? 'bg-purple-900 text-purple-200'
          : 'bg-purple-100 text-purple-800'
      case 'employee':
        return isDarkMode
          ? 'bg-blue-900 text-blue-200'
          : 'bg-blue-100 text-blue-800'
      default:
        return isDarkMode
          ? 'bg-gray-700 text-gray-200'
          : 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Member Form - Only for Owner */}
      {role === 'owner' ? (
        <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
          isDarkMode
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center mb-4">
            <UserPlus className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Add Factory Member
            </h3>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              User Email
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="email"
                value={searchEmail}
                onChange={handleEmailInputChange}
                onFocus={() => searchEmail.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="user@example.com"
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              {showSuggestions && emailSuggestions.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-48 overflow-y-auto ${
                  isDarkMode 
                    ? 'bg-zinc-800 border-zinc-700' 
                    : 'bg-white border-gray-300'
                }`}>
                  {emailSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.user_id}
                      type="button"
                      onClick={() => selectEmailSuggestion(suggestion.email)}
                      className={`w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-zinc-700 text-white' 
                          : 'hover:bg-gray-100 text-gray-900'
                      }`}
                    >
                      {suggestion.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-1">
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="employee">Employee</option>
              <option value="approver">Approver</option>
            </select>
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              onClick={addMember}
              disabled={isAddingMember || !searchEmail.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isAddingMember ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </div>
      ) : (
        <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
          isDarkMode
            ? 'bg-blue-900/20 border-blue-800/30'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center">
            <Shield className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                View-Only Access
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                👁️ You can view factory members but cannot add, edit, or remove them. Contact the factory owner for member management.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className={`rounded-lg shadow-sm border transition-colors duration-300 ${
        isDarkMode
          ? 'bg-zinc-900 border-zinc-800'
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Factory Members ({members.length})
              </h3>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading members...
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className={`w-12 h-12 mx-auto mb-4 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No factory members yet. Add members using the form above.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Email
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Role
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Added On
                    </th>
                    {role === 'owner' && (
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                  {currentMembers.map((member) => (
                    <tr key={member.user_id} className={`${
                      isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'
                    } transition-colors`}>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {member.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role === 'owner' ? (
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.user_id, member.factory_id, e.target.value, member.email || 'Unknown')}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)} cursor-pointer`}
                          >
                            <option value="employee">Employee</option>
                            <option value="approver">Approver</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formatDate(member.created_at)}
                      </td>
                      {role === 'owner' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => removeMember(member.user_id, member.factory_id, member.email || 'Unknown')}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`px-6 py-4 border-t flex items-center justify-between ${
                isDarkMode ? 'border-zinc-800' : 'border-gray-200'
              }`}>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {startIndex + 1} to {Math.min(endIndex, members.length)} of {members.length} members
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? isDarkMode
                          ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : isDarkMode
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? isDarkMode
                          ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
