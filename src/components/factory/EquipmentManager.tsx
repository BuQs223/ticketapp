'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, QrCode, Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Equipment, EquipmentType, MuscleGroup, EquipmentStatus } from '@/types/database'
import EquipmentFormModal from './EquipmentFormModal'
import QRCodeModal from './QRCodeModal'

interface Props {
  role: 'owner' | 'approver' | 'employee'
  userId: string
  factoryId: string
}

export default function EquipmentManager({ role, userId, factoryId }: Props) {
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrEquipment, setQrEquipment] = useState<any | null>(null)

  useEffect(() => {
    fetchEquipment()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        () => {
          fetchEquipment()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchEquipment = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        gyms:gym_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to fetch equipment')
      console.error(error)
    } else {
      setEquipment(data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return

    const { error } = await supabase.from('equipment').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete equipment')
      console.error(error)
    } else {
      toast.success('Equipment deleted successfully')
      fetchEquipment()
    }
  }

  const handleEdit = (item: any) => {
    setSelectedEquipment(item)
    setShowFormModal(true)
  }

  const handleAdd = () => {
    setSelectedEquipment(null)
    setShowFormModal(true)
  }

  const handleShowQR = (item: any) => {
    setQrEquipment(item)
    setShowQRModal(true)
  }

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Equipment Management</h2>
        <button
          onClick={handleAdd}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | 'all')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Equipment List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No equipment found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">SN: {item.serial_number}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'maintenance'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{item.equipment_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Muscle Group:</span>
                  <span className="font-medium capitalize">{item.muscle_group}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gym:</span>
                  <span className="font-medium">{item.gyms?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleShowQR(item)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR</span>
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {role === 'owner' && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showFormModal && (
        <EquipmentFormModal
          equipment={selectedEquipment}
          factoryId={factoryId}
          userId={userId}
          onClose={() => {
            setShowFormModal(false)
            setSelectedEquipment(null)
          }}
          onSuccess={() => {
            fetchEquipment()
            setShowFormModal(false)
            setSelectedEquipment(null)
          }}
        />
      )}

      {showQRModal && qrEquipment && (
        <QRCodeModal
          equipment={qrEquipment}
          onClose={() => {
            setShowQRModal(false)
            setQrEquipment(null)
          }}
        />
      )}
    </div>
  )
}
