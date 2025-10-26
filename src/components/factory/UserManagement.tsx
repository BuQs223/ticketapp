'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, UserPlus, UserCheck, Shield, Building2, Dumbbell, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface UserManagementProps {
  isDarkMode: boolean
}

interface User {
  id: string
  email: string
  created_at: string
  factory_roles: string[]
  gym_roles: { gym_id: string; gym_name: string; role: string }[]
}

export default function UserManagement({ isDarkMode }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [gyms, setGyms] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleType, setRoleType] = useState<'factory' | 'gym'>('factory')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedGym, setSelectedGym] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const itemsPerPage = 15

  useEffect(() => {
    fetchUsers()
    fetchGyms()
  }, [])

  const fetchGyms = async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setGyms(data || [])
    } catch (error: any) {
      console.error('Error fetching gyms:', error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Get all factory members and gym members in parallel
      const [factoryMembersResult, gymMembersResult] = await Promise.all([
        supabase
          .from('factory_members')
          .select('user_id, email, role'),
        supabase
          .from('gym_members')
          .select(`
            user_id,
            email,
            role,
            gyms:gym_id (
              id,
              name
            )
          `)
      ])

      if (factoryMembersResult.error) throw factoryMembersResult.error
      if (gymMembersResult.error) throw gymMembersResult.error

      // Create a map of all users with their roles
      const userMap = new Map<string, User>()

      // Add factory members
      factoryMembersResult.data?.forEach((fm: any) => {
        if (!userMap.has(fm.user_id)) {
          userMap.set(fm.user_id, {
            id: fm.user_id,
            email: fm.email || 'Unknown',
            created_at: new Date().toISOString(),
            factory_roles: [],
            gym_roles: []
          })
        }
        userMap.get(fm.user_id)!.factory_roles.push(fm.role)
      })

      // Add gym members
      gymMembersResult.data?.forEach((gm: any) => {
        const existingUser = userMap.get(gm.user_id)
        
        if (!existingUser) {
          // User doesn't exist yet, create new entry
          userMap.set(gm.user_id, {
            id: gm.user_id,
            email: gm.email || 'Unknown',
            created_at: new Date().toISOString(),
            factory_roles: [],
            gym_roles: []
          })
        } else if (!existingUser.email || existingUser.email === 'Unknown') {
          // User exists but email is missing, update it from gym_members
          existingUser.email = gm.email || 'Unknown'
        }
        
        userMap.get(gm.user_id)!.gym_roles.push({
          gym_id: gm.gyms?.id || '',
          gym_name: gm.gyms?.name || 'Unknown Gym',
          role: gm.role
        })
      })

      const userList = Array.from(userMap.values())
      setAllUsers(userList)
      setUsers(userList)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const searchAllUsers = async (query: string) => {
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
      console.error('Error searching users:', error)
      setEmailSuggestions([])
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length >= 2) {
      // Debounce search
      setTimeout(() => searchAllUsers(query), 300)
      
      // Also filter current users
      const filtered = allUsers.filter(u => 
        u.email.toLowerCase().includes(query.toLowerCase())
      )
      setUsers(filtered)
      setCurrentPage(1)
    } else {
      setUsers(allUsers)
      setEmailSuggestions([])
      setShowSuggestions(false)
    }
  }

  const addUserFromSearch = async (email: string, userId: string) => {
    // Check if user already exists in the list
    const existingUser = allUsers.find(u => u.id === userId)
    
    if (existingUser) {
      // User already has roles, just show them
      setSearchQuery(email)
      setUsers([existingUser])
      setShowSuggestions(false)
      toast('User already exists in the system', { icon: 'ℹ️' })
      return
    }

    // Create a new user entry without roles
    const newUser: User = {
      id: userId,
      email: email,
      created_at: new Date().toISOString(),
      factory_roles: [],
      gym_roles: []
    }

    setAllUsers([newUser, ...allUsers])
    setUsers([newUser])
    setSearchQuery(email)
    setShowSuggestions(false)
    setCurrentPage(1)
    toast.success('User found! You can now assign roles.')
  }

  const openRoleModal = (user: User, type: 'factory' | 'gym') => {
    setSelectedUser(user)
    setRoleType(type)
    setSelectedRole(type === 'factory' ? 'employee' : 'employee')
    setSelectedGym(gyms[0]?.id || '')
    setShowRoleModal(true)
  }

  const assignRole = async () => {
    if (!selectedUser) return

    try {
      if (roleType === 'factory') {
        // Check if user already has this factory role
        if (selectedUser.factory_roles.includes(selectedRole)) {
          toast.error('User already has this factory role')
          return
        }

        // Get factory ID
        const { data: factoryData, error: factoryError } = await supabase
          .from('factory')
          .select('id')
          .single()

        if (factoryError) throw factoryError

        // Add factory role
        const { error } = await supabase
          .from('factory_members')
          .insert({
            user_id: selectedUser.id,
            factory_id: factoryData.id,
            email: selectedUser.email,
            role: selectedRole,
            approved_at: new Date().toISOString()
          })

        if (error) throw error
        toast.success(`Assigned factory ${selectedRole} role to ${selectedUser.email}`)
      } else {
        // Check if user already has a role in this gym
        const existingGymRole = selectedUser.gym_roles.find(gr => gr.gym_id === selectedGym)
        if (existingGymRole) {
          toast.error('User already has a role in this gym')
          return
        }

        // Add gym role
        const { error } = await supabase
          .from('gym_members')
          .insert({
            user_id: selectedUser.id,
            gym_id: selectedGym,
            email: selectedUser.email,
            role: selectedRole,
            approved_at: new Date().toISOString()
          })

        if (error) throw error
        toast.success(`Assigned gym ${selectedRole} role to ${selectedUser.email}`)
      }

      setShowRoleModal(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error assigning role:', error)
      toast.error(error.message || 'Failed to assign role')
    }
  }

  const removeFactoryRole = async (userId: string, role: string, email: string) => {
    if (!confirm(`Remove factory ${role} role from ${email}?`)) return

    try {
      const { data: factoryData } = await supabase
        .from('factory')
        .select('id')
        .single()

      if (!factoryData) throw new Error('Factory not found')

      const { error } = await supabase
        .from('factory_members')
        .delete()
        .eq('user_id', userId)
        .eq('factory_id', factoryData.id)
        .eq('role', role)

      if (error) throw error

      toast.success(`Removed factory ${role} role from ${email}`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error removing role:', error)
      toast.error('Failed to remove role')
    }
  }

  const removeGymRole = async (userId: string, gymId: string, gymName: string, email: string) => {
    if (!confirm(`Remove ${email} from ${gymName}?`)) return

    try {
      const { error } = await supabase
        .from('gym_members')
        .delete()
        .eq('user_id', userId)
        .eq('gym_id', gymId)

      if (error) throw error

      toast.success(`Removed ${email} from ${gymName}`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error removing gym role:', error)
      toast.error('Failed to remove gym role')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
      case 'approver':
        return isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'
      case 'employee':
        return isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
    }
  }

  // Pagination
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsers = users.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className={`w-6 h-6 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                User Management
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Assign roles to users for factory and gym access
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'
          }`}>
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {allUsers.length}
            </span>
            <span className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Users
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="email"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search by email to find or add users..."
            className={`w-full px-4 py-3 rounded-lg border transition-colors duration-300 ${
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
                  onClick={() => addUserFromSearch(suggestion.email, suggestion.user_id)}
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

      {/* Users Table */}
      <div className={`rounded-lg shadow-sm border transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
      }`}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading users...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No users found
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
                      Factory Roles
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Gym Roles
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                  {currentUsers.map((user) => (
                    <tr key={user.id} className={`${
                      isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'
                    } transition-colors`}>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            isDarkMode ? 'bg-zinc-700' : 'bg-gray-200'
                          }`}>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {user.email[0]?.toUpperCase()}
                            </span>
                          </div>
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.factory_roles.length === 0 ? (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              No factory roles
                            </span>
                          ) : (
                            user.factory_roles.map((role, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                                  <Shield className="w-3 h-3 inline mr-1" />
                                  {role}
                                </span>
                                <button
                                  onClick={() => removeFactoryRole(user.id, role, user.email)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Remove role"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.gym_roles.length === 0 ? (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              No gym roles
                            </span>
                          ) : (
                            user.gym_roles.map((gymRole, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(gymRole.role)}`}>
                                  <Dumbbell className="w-3 h-3 inline mr-1" />
                                  {gymRole.gym_name}: {gymRole.role}
                                </span>
                                <button
                                  onClick={() => removeGymRole(user.id, gymRole.gym_id, gymRole.gym_name, user.email)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Remove role"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => openRoleModal(user, 'factory')}
                          className={`inline-flex items-center px-3 py-1 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                          title="Add factory role"
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          Factory
                        </button>
                        <button
                          onClick={() => openRoleModal(user, 'gym')}
                          className={`inline-flex items-center px-3 py-1 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-green-900 text-green-200 hover:bg-green-800'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                          title="Add gym role"
                        >
                          <Dumbbell className="w-3 h-3 mr-1" />
                          Gym
                        </button>
                      </td>
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
                  Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
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
                    <ChevronLeft className="w-4 h-4" />
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
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${
            isDarkMode ? 'bg-zinc-900' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Assign {roleType === 'factory' ? 'Factory' : 'Gym'} Role
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  User
                </label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700 text-gray-400'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
                />
              </div>

              {roleType === 'gym' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Gym
                  </label>
                  <select
                    value={selectedGym}
                    onChange={(e) => setSelectedGym(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {roleType === 'factory' ? (
                    <>
                      <option value="employee">Employee</option>
                      <option value="approver">Approver</option>
                    </>
                  ) : (
                    <>
                      <option value="employee">Employee</option>
                      <option value="owner">Owner</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={assignRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
