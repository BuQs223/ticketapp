'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Dumbbell, Filter, X } from 'lucide-react'
import type { EquipmentStatus, EquipmentType, MuscleGroup } from '@/types/database'

interface Equipment {
  id: string
  name: string
  serial_number: string
  qr_code: string
  equipment_type: EquipmentType
  muscle_group: MuscleGroup
  status: EquipmentStatus
  created_at: string
}

interface Props {
  equipment: Equipment[]
  onScanQR: (equipmentId: string) => void
}

export default function GymEquipmentViewer({ equipment, onScanQR }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all')
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

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesType = typeFilter === 'all' || item.equipment_type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [equipment, searchTerm, statusFilter, typeFilter])

  const inputClass = useMemo(
    () =>
      `w-full px-4 py-2 rounded-lg border transition-colors ${
        isDarkMode
          ? 'bg-zinc-800 border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
      } focus:outline-none focus:ring-2`,
    [isDarkMode]
  )

  const getStatusBadgeClass = (status: EquipmentStatus) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'active':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-green-500/10 text-green-300 border border-green-500/30'
            : 'bg-green-100 text-green-800'
        }`
      case 'maintenance':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
            : 'bg-yellow-100 text-yellow-800'
        }`
      case 'retired':
        return `${baseClass} ${
          isDarkMode
            ? 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
            : 'bg-gray-100 text-gray-600'
        }`
      default:
        return baseClass
    }
  }

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all'

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
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | 'all')}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EquipmentType | 'all')}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="all">All Types</option>
          <option value="treadmill">Treadmill</option>
          <option value="bike">Bike</option>
          <option value="rower">Rower</option>
          <option value="elliptical">Elliptical</option>
          <option value="bench">Bench</option>
          <option value="squat_rack">Squat Rack</option>
          <option value="cable">Cable</option>
          <option value="dumbbells">Dumbbells</option>
          <option value="barbell">Barbell</option>
          <option value="other">Other</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setStatusFilter('all')
              setTypeFilter('all')
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
        Showing {filteredEquipment.length} of {equipment.length} equipment items
      </div>

      {/* Equipment Grid */}
      {filteredEquipment.length === 0 ? (
        <div
          className={`text-center py-12 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          <Dumbbell className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No equipment found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {item.name}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.serial_number}
                  </p>
                </div>
                <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Type:</span>
                  <span className={`font-medium capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.equipment_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Muscle Group:</span>
                  <span className={`font-medium capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.muscle_group.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onScanQR(item.id)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Report Issue
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
