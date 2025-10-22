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
  const canManageGyms = role === 'owner' || role === 'approver'

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
        <h2 className="text-lg font-semibold text-gray-900">Gym Management</h2>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : gyms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No gyms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gyms.map((gym) => (
            <div
              key={gym.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{gym.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(gym.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    gym.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : gym.status === 'pending_approval'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {gym.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600 mb-4">
                <Users className="w-4 h-4 mr-2" />
                <span>{gym.gym_members?.length || 0} member(s)</span>
              </div>

              {gym.status === 'pending_approval' && canManageGyms && (
                <div className="flex space-x-2 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(gym.id)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(gym.id)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}

              {gym.status === 'active' && canManageGyms && (
                <div className="flex space-x-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(gym)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
              )}

              {gym.status === 'suspended' && (
                <div className="flex items-center space-x-2 pt-4 border-t text-sm text-red-600">
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
