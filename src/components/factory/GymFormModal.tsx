'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  gym: any | null
  factoryId: string
  onClose: () => void
  onSuccess: () => void
}

export default function GymFormModal({ gym, factoryId, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: gym?.name || '',
    status: gym?.status || 'active'
  })
  const [loading, setLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (gym) {
        // Update existing gym
        const { error } = await supabase
          .from('gyms')
          .update({
            name: formData.name,
            status: formData.status
          })
          .eq('id', gym.id)

        if (error) throw error
        toast.success('Gym updated successfully')
      } else {
        toast.error('Creating new gyms is not yet implemented. Gym owners should register through the app.')
      }

      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save gym')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full transition-colors ${
        isDarkMode ? 'bg-zinc-900' : 'bg-white'
      }`}>
        <div className={`border-b px-6 py-4 flex justify-between items-center ${
          isDarkMode ? 'border-zinc-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {gym ? 'Edit Gym' : 'Add New Gym'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Gym Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500'
              }`}
              placeholder="e.g., PowerFit Gym Downtown"
            />
          </div>

          {gym && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-purple-500 focus:border-purple-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-purple-500 focus:border-purple-500'
                }`}
              >
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}

          <div className={`flex justify-end space-x-3 pt-4 border-t ${
            isDarkMode ? 'border-zinc-700' : 'border-gray-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-200 bg-zinc-800 hover:bg-zinc-700'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : gym ? 'Update Gym' : 'Create Gym'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
