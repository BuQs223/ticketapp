'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { EquipmentType, MuscleGroup, EquipmentStatus } from '@/types/database'

interface Props {
  equipment: any | null
  factoryId: string
  userId: string
  onClose: () => void
  onSuccess: () => void
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  'treadmill', 'bike', 'elliptical', 'rower', 'strength', 
  'free_weights', 'cable', 'bench', 'rack', 'other'
]

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 
  'core', 'cardio', 'full_body', 'other'
]

const STATUSES: EquipmentStatus[] = ['active', 'maintenance', 'retired']

export default function EquipmentFormModal({ equipment, factoryId, userId, onClose, onSuccess }: Props) {
  const [gyms, setGyms] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    equipment_type: 'treadmill' as EquipmentType,
    muscle_group: 'cardio' as MuscleGroup,
    status: 'active' as EquipmentStatus,
    gym_id: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGyms()
    
    if (equipment) {
      setFormData({
        name: equipment.name || '',
        serial_number: equipment.serial_number || '',
        equipment_type: equipment.equipment_type || 'treadmill',
        muscle_group: equipment.muscle_group || 'cardio',
        status: equipment.status || 'active',
        gym_id: equipment.gym_id || ''
      })
    }
  }, [equipment])

  const fetchGyms = async () => {
    const { data } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    
    setGyms(data || [])
  }

  const generateQRCode = () => {
    // Generate a unique QR code (you can use a library or custom format)
    return `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (equipment) {
        // Update existing equipment
        const { error } = await supabase
          .from('equipment')
          .update({
            name: formData.name,
            equipment_type: formData.equipment_type,
            muscle_group: formData.muscle_group,
            status: formData.status,
            gym_id: formData.gym_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', equipment.id)

        if (error) throw error
        toast.success('Equipment updated successfully')
      } else {
        // Create new equipment
        const { error } = await supabase
          .from('equipment')
          .insert({
            factory_id: factoryId,
            name: formData.name,
            serial_number: formData.serial_number,
            qr_code: generateQRCode(),
            equipment_type: formData.equipment_type,
            muscle_group: formData.muscle_group,
            status: formData.status,
            gym_id: formData.gym_id || null,
            created_by: userId
          })

        if (error) throw error
        toast.success('Equipment created successfully')
      }

      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save equipment')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Treadmill ProMax 3000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number *
            </label>
            <input
              type="text"
              required
              disabled={!!equipment}
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., SN-2024-001"
            />
            {equipment && (
              <p className="text-xs text-gray-500 mt-1">Serial number cannot be changed</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type *
              </label>
              <select
                required
                value={formData.equipment_type}
                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value as EquipmentType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Muscle Group *
              </label>
              <select
                required
                value={formData.muscle_group}
                onChange={(e) => setFormData({ ...formData, muscle_group: e.target.value as MuscleGroup })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Gym
              </label>
              <select
                value={formData.gym_id}
                onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : equipment ? 'Update Equipment' : 'Create Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
