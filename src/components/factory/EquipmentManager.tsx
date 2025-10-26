'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, QrCode, Search, Filter, History, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Equipment, EquipmentType, MuscleGroup, EquipmentStatus } from '@/types/database'
import EquipmentFormModal from './EquipmentFormModal'
import QRCodeModal from './QRCodeModal'
import BulkQRCodePrintModal from './BulkQRCodePrintModal'
import EquipmentHistoryModal from '@/components/EquipmentHistoryModal'

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
  const [gymFilter, setGymFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showBulkQRModal, setShowBulkQRModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [qrEquipment, setQrEquipment] = useState<any | null>(null)
  const [historyEquipment, setHistoryEquipment] = useState<any | null>(null)
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
    const matchesGym = gymFilter === 'all' || item.gym_id === gymFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    const matchesMuscle = muscleFilter === 'all' || item.muscle_group === muscleFilter

    return matchesSearch && matchesStatus && matchesGym && matchesType && matchesMuscle
  })

  // Pagination
  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedEquipment = filteredEquipment.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, gymFilter, typeFilter, muscleFilter])

  // Get unique gyms for filter
  const uniqueGyms = useMemo(() => {
    const gyms = equipment
      .filter(item => item.gyms)
      .map(item => ({ id: item.gym_id, name: item.gyms.name }))
    const unique = Array.from(new Map(gyms.map(g => [g.id, g])).values())
    return unique
  }, [equipment])

  const inputClass = useMemo(() => 
    `w-full pl-10 pr-4 py-2 border rounded-lg transition-colors ${
      isDarkMode
        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    }`, [isDarkMode])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Equipment Management
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkQRModal(true)}
            disabled={equipment.length === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-zinc-700 disabled:text-gray-500'
                : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
            } disabled:cursor-not-allowed`}
          >
            <Printer className="w-4 h-4" />
            <span>Bulk Print QR</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Search by name or serial..."
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
            onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | 'all')}
            className={`${inputClass} appearance-none`}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <select
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="all">All Gyms</option>
            <option value="unassigned">Unassigned</option>
            {uniqueGyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EquipmentType | 'all')}
            className={`${inputClass} appearance-none`}
          >
            <option value="all">All Types</option>
            <option value="treadmill">Treadmill</option>
            <option value="bike">Bike</option>
            <option value="rower">Rower</option>
            <option value="weights">Weights</option>
            <option value="machine">Machine</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | 'all')}
            className={`${inputClass} appearance-none`}
          >
            <option value="all">All Muscles</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="legs">Legs</option>
            <option value="shoulders">Shoulders</option>
            <option value="arms">Arms</option>
            <option value="core">Core</option>
            <option value="full_body">Full Body</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Equipment List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            isDarkMode ? 'border-blue-400' : 'border-blue-600'
          }`}></div>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className={`text-center py-12 rounded-lg ${
          isDarkMode ? 'bg-zinc-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          <p>No equipment found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEquipment.map((item) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {item.name}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    SN: {item.serial_number}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'active'
                      ? isDarkMode
                        ? 'bg-green-500/10 text-green-300 border border-green-500/30'
                        : 'bg-green-100 text-green-800'
                      : item.status === 'maintenance'
                      ? isDarkMode
                        ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                        : 'bg-yellow-100 text-yellow-800'
                      : isDarkMode
                        ? 'bg-gray-500/10 text-gray-300 border border-gray-500/30'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Type:</span>
                  <span className={`font-medium capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.equipment_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Muscle Group:</span>
                  <span className={`font-medium capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.muscle_group}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Gym:</span>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.gyms?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setHistoryEquipment(item)
                    setShowHistoryModal(true)
                  }}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isDarkMode
                      ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
                <button
                  onClick={() => handleShowQR(item)}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isDarkMode
                      ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR</span>
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isDarkMode
                      ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {role === 'owner' && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredEquipment.length > 0 && (
        <div className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg ${
          isDarkMode ? 'bg-zinc-800/50' : 'bg-gray-50'
        }`}>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {startIndex + 1} to {Math.min(endIndex, filteredEquipment.length)} of {filteredEquipment.length} equipment
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
                // Show first page, last page, current page, and pages around current
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

      {showBulkQRModal && (
        <BulkQRCodePrintModal
          equipment={equipment}
          onClose={() => setShowBulkQRModal(false)}
        />
      )}

      {showHistoryModal && historyEquipment && (
        <EquipmentHistoryModal
          equipmentId={historyEquipment.id}
          equipmentName={historyEquipment.name}
          onClose={() => {
            setShowHistoryModal(false)
            setHistoryEquipment(null)
          }}
        />
      )}
    </div>
  )
}
