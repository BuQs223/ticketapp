'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import GymFormModal from './GymFormModal'

interface Props {
  role: 'owner' | 'approver' | 'employee'
  userId: string
  factoryId: string
}

export default function GymManager({ role, userId, factoryId }: Props) {
  const [gyms, setGyms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGym, setSelectedGym] = useState<any | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const canManageGyms = role === 'owner' || role === 'approver'

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
    fetchGyms()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('gyms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gyms',
        },
        () => {
          fetchGyms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchGyms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('gyms')
      .select(`
        *,
        gym_members!inner (
          user_id,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to fetch gyms')
      console.error(error)
    } else {
      setGyms(data || [])
    }
    setLoading(false)
  }

  const handleApprove = async (gymId: string) => {
    const { error } = await supabase
      .from('gyms')
      .update({
        status: 'active',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', gymId)

    if (error) {
      toast.error('Failed to approve gym')
      console.error(error)
    } else {
      toast.success('Gym approved successfully')
      fetchGyms()
    }
  }

  const handleReject = async (gymId: string) => {
    if (!confirm('Are you sure you want to reject this gym?')) return

    const { error } = await supabase
      .from('gyms')
      .update({
        status: 'suspended'
      })
      .eq('id', gymId)

    if (error) {
      toast.error('Failed to reject gym')
      console.error(error)
    } else {
      toast.success('Gym status updated')
      fetchGyms()
    }
  }

  const handleEdit = (gym: any) => {
    setSelectedGym(gym)
    setShowFormModal(true)
  }

  const handleAdd = () => {
    setSelectedGym(null)
    setShowFormModal(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Gym Management
        </h2>
        {canManageGyms && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Gym</span>
          </button>
        )}
      </div>

      {/* Gym List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            isDarkMode ? 'border-purple-400' : 'border-purple-600'
          }`}></div>
        </div>
      ) : gyms.length === 0 ? (
        <div className={`text-center py-12 rounded-lg ${
          isDarkMode ? 'bg-zinc-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          <p>No gyms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gyms.map((gym) => (
            <div
              key={gym.id}
              className={`border rounded-lg p-6 hover:shadow-md transition-all ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {gym.name}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Created {new Date(gym.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    gym.status === 'active'
                      ? isDarkMode
                        ? 'bg-green-500/10 text-green-300 border border-green-500/30'
                        : 'bg-green-100 text-green-800'
                      : gym.status === 'pending_approval'
                      ? isDarkMode
                        ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                        : 'bg-yellow-100 text-yellow-800'
                      : isDarkMode
                        ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {gym.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className={`flex items-center text-sm mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Users className="w-4 h-4 mr-2" />
                <span>{gym.gym_members?.length || 0} member(s)</span>
              </div>

              {gym.status === 'pending_approval' && canManageGyms && (
                <div className={`flex space-x-2 pt-4 border-t ${
                  isDarkMode ? 'border-zinc-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => handleApprove(gym.id)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'bg-green-500/10 text-green-300 hover:bg-green-500/20 border border-green-500/30'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(gym.id)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}

              {gym.status === 'active' && canManageGyms && (
                <div className={`flex space-x-2 pt-4 border-t ${
                  isDarkMode ? 'border-zinc-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => handleEdit(gym)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
              )}

              {gym.status === 'suspended' && (
                <div className={`flex items-center space-x-2 pt-4 border-t text-sm ${
                  isDarkMode 
                    ? 'border-zinc-700 text-red-400' 
                    : 'border-gray-200 text-red-600'
                }`}>
                  <XCircle className="w-4 h-4" />
                  <span>This gym is suspended</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showFormModal && (
        <GymFormModal
          gym={selectedGym}
          factoryId={factoryId}
          onClose={() => {
            setShowFormModal(false)
            setSelectedGym(null)
          }}
          onSuccess={() => {
            fetchGyms()
            setShowFormModal(false)
            setSelectedGym(null)
          }}
        />
      )}
    </div>
  )
}
