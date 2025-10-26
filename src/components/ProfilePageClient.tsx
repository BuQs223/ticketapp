'use client'

import { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface FactoryEmployee {
  id: string
  role: string
  factory_id: string
  created_at: string
}

interface Gym {
  id: string
  name: string
  status: string
  created_at: string
}

interface Factory {
  id: string
  name: string
}

interface ProfilePageClientProps {
  user: User
  factoryEmployee: FactoryEmployee | null
  ownedGyms: Gym[]
  factory: Factory | null
  stats: {
    totalTickets: number
    totalGyms: number
    totalEquipment: number
    factoryMembers: number
  }
}

export default function ProfilePageClient({
  user,
  factoryEmployee,
  ownedGyms,
  factory,
  stats,
}: ProfilePageClientProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Read theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  // Update theme when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Determine user roles
  const isFactoryEmployee = !!factoryEmployee
  const isGymOwner = ownedGyms.length > 0
  const primaryRole = isFactoryEmployee
    ? 'Factory Employee'
    : isGymOwner
    ? 'Gym Owner'
    : 'User'

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    if (role === 'Factory Employee') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    } else if (role === 'Gym Owner') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-zinc-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-white border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                My Profile
              </h1>
              <p className={`mt-1 text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Manage your account information and view your role
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-zinc-800 text-yellow-400 hover:bg-zinc-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  isDarkMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info Card */}
          <div className="lg:col-span-1">
            <div className={`rounded-lg shadow-sm border overflow-hidden transition-colors duration-300 ${
              isDarkMode
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-gray-200'
            }`}>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-24"></div>
              <div className="px-6 pb-6">
                <div className="flex justify-center -mt-12 mb-4">
                  <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl font-bold shadow-lg transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-900 text-gray-300'
                      : 'bg-white border-white text-gray-700'
                  }`}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h2 className={`text-xl font-semibold mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.email}
                  </h2>
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        primaryRole
                      )}`}
                    >
                      {primaryRole}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className={`flex items-center text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {user.email}
                  </div>
                  <div className={`flex items-center text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Joined {formatDate(user.created_at)}
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md font-medium transition-colors"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Tickets
                    </p>
                    <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.totalTickets}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                    isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Gyms
                    </p>
                    <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.totalGyms}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                    isDarkMode ? 'bg-purple-900' : 'bg-purple-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Equipment
                    </p>
                    <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.totalEquipment}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                    isDarkMode ? 'bg-orange-900' : 'bg-orange-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-orange-300' : 'text-orange-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Factory Members
                    </p>
                    <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.factoryMembers}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                    isDarkMode ? 'bg-green-900' : 'bg-green-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-green-300' : 'text-green-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Employee Details */}
            {isFactoryEmployee && (
              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-300 ${
                    isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Factory Employee
                    </h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {factory?.name || 'Factory'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className={`flex justify-between items-center py-2 border-b transition-colors duration-300 ${
                    isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                  }`}>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Role
                    </span>
                    <span className={`text-sm font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {factoryEmployee.role || 'Employee'}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center py-2 border-b transition-colors duration-300 ${
                    isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                  }`}>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Employee Since
                    </span>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatDate(factoryEmployee.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Access Level
                    </span>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Full System Access
                    </span>
                  </div>
                </div>

                <div className={`mt-4 pt-4 border-t transition-colors duration-300 ${
                  isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                }`}>
                  <button
                    onClick={() => router.push('/factory')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    Go to Factory Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Gym Owner Details */}
            {isGymOwner && (
              <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-300 ${
                    isDarkMode ? 'bg-purple-900' : 'bg-purple-100'
                  }`}>
                    <svg
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Gym Ownership
                    </h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {ownedGyms.length} {ownedGyms.length === 1 ? 'gym' : 'gyms'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {ownedGyms.map((gym) => (
                    <div
                      key={gym.id}
                      className={`p-4 rounded-lg transition-colors duration-300 ${
                        isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {gym.name}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            gym.status
                          )}`}
                        >
                          {gym.status}
                        </span>
                      </div>
                      <p className={`text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Created on {formatDate(gym.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className={`mt-4 pt-4 border-t transition-colors duration-300 ${
                  isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                }`}>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
                  >
                    Go to Gym Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Account Activity */}
            <div className={`rounded-lg shadow-sm border p-6 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Account Activity
              </h3>

              <div className="space-y-3">
                <div className={`flex justify-between items-center py-2 border-b transition-colors duration-300 ${
                  isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                }`}>
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Email
                  </span>
                  <span className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.email}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b transition-colors duration-300 ${
                  isDarkMode ? 'border-zinc-800' : 'border-gray-100'
                }`}>
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Email Verified
                  </span>
                  <span className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.confirmed_at ? '✓ Verified' : '✗ Not verified'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Last Sign In
                  </span>
                  <span className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.last_sign_in_at
                      ? formatDate(user.last_sign_in_at)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
