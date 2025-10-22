'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Package, Home, Ticket, Users, Plus, LogOut, Menu, X, AlertCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'
import type { FactoryRole, Equipment, Gym, Ticket as TicketType, Notification } from '@/types/database'
import EquipmentManager from '@/components/factory/EquipmentManager'
import GymManager from '@/components/factory/GymManager'
import TicketManager from '@/components/factory/TicketManager'

interface InitialData {
  factory: any
  equipment: any[]
  gyms: any[]
  tickets: any[]
  notifications: Notification[]
  stats: {
    totalEquipment: number
    activeEquipment: number
    totalGyms: number
    activeGyms: number
    openTickets: number
    pendingVisits: number
  }
}

interface Props {
  user: User
  role: FactoryRole
  initialData: InitialData
}

type TabType = 'overview' | 'equipment' | 'gyms' | 'tickets'

export default function FactoryDashboardClient({ user, role, initialData }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialData.notifications)
  const [stats, setStats] = useState(initialData.stats)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    } else if (savedTheme === 'light') {
      setIsDarkMode(false)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(prefersDark)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    const notificationChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full pointer-events-auto flex rounded-lg shadow-lg border ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-gray-100'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <Bell className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      New Notification
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {newNotification.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-transparent">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className={`w-full rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'text-blue-300 hover:text-blue-200 border-l border-zinc-800 hover:bg-zinc-800/60'
                      : 'text-blue-600 hover:text-blue-500 hover:bg-gray-50'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationChannel)
    }
  }, [user.id, isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/auth')
  }

  const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      )
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length
  const cardClass = `p-6 rounded-lg shadow-sm transition-colors duration-300 border ${
    isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
  }`

  const tabBaseClass = 'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors'
  const tabActiveClass = isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-100 text-blue-700'
  const tabInactiveClass = isDarkMode
    ? 'text-gray-300 hover:text-white hover:bg-zinc-800/70'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-950 text-gray-100' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDarkMode ? '#18181b' : '#ffffff',
            color: isDarkMode ? '#e4e4e7' : '#1f2937',
            border: isDarkMode ? '1px solid #27272a' : '1px solid #e5e7eb',
          },
        }}
      />

      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b shadow-sm transition-colors duration-300 backdrop-blur supports-[backdrop-filter]:backdrop-blur ${
          isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`lg:hidden mr-3 p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'text-gray-300 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Toggle navigation"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Factory Dashboard
              </h1>
              <span
                className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  isDarkMode
                    ? 'bg-blue-500/10 text-blue-200 border border-blue-500/30'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {role}
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.svg
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                        clipRule="evenodd"
                      />
                    </motion.svg>
                  ) : (
                    <motion.svg
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'text-gray-300 hover:text-white hover:bg-zinc-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="Open notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg overflow-hidden z-50 border transition-colors duration-300 ${
                      isDarkMode ? 'bg-zinc-900 border-zinc-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <div
                      className={`p-3 border-b ${
                        isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Notifications
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{unreadCount} unread</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div
                          className={`p-4 text-center text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              !notification.read_at
                                ? isDarkMode
                                  ? 'bg-blue-500/10 border-zinc-800'
                                  : 'bg-blue-50 border-gray-200'
                                : isDarkMode
                                  ? 'border-zinc-800 hover:bg-zinc-800/60'
                                  : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                              {notification.type.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className={`hidden sm:block text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {user.email}
              </span>

              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div
          className={`rounded-lg shadow-sm mb-6 overflow-x-auto transition-colors duration-300 border ${
            isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          }`}
        >
          <nav className="flex space-x-1 p-2 min-w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${tabBaseClass} ${
                activeTab === 'overview' ? tabActiveClass : tabInactiveClass
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('equipment')}
              className={`${tabBaseClass} ${
                activeTab === 'equipment' ? tabActiveClass : tabInactiveClass
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Equipment</span>
            </button>

            <button
              onClick={() => setActiveTab('gyms')}
              className={`${tabBaseClass} ${
                activeTab === 'gyms' ? tabActiveClass : tabInactiveClass
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Gyms</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`${tabBaseClass} ${
                activeTab === 'tickets' ? tabActiveClass : tabInactiveClass
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Tickets</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Equipment
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {stats.totalEquipment}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {stats.activeEquipment} active
                    </p>
                  </div>
                  <Package className={`w-12 h-12 opacity-20 ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`} />
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Gyms
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {stats.totalGyms}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {stats.activeGyms} active
                    </p>
                  </div>
                  <Home className={`w-12 h-12 opacity-20 ${isDarkMode ? 'text-purple-300' : 'text-purple-500'}`} />
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Open Tickets
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {stats.openTickets}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {stats.pendingVisits} pending visits
                    </p>
                  </div>
                  <Ticket className={`w-12 h-12 opacity-20 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {(role === 'owner' || role === 'employee') && (
              <div className={cardClass}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <button
                    onClick={() => setActiveTab('equipment')}
                    className={`flex items-center justify-center space-x-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      isDarkMode
                        ? 'border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10'
                        : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <Plus className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                    <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      Add Equipment
                    </span>
                  </button>

                  {role === 'owner' && (
                    <button
                      onClick={() => setActiveTab('gyms')}
                      className={`flex items-center justify-center space-x-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                        isDarkMode
                          ? 'border-zinc-700 hover:border-purple-500 hover:bg-purple-500/10'
                          : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      <Plus className={`w-5 h-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                      <span className={`font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                        Add Gym
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex items-center justify-center space-x-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      isDarkMode
                        ? 'border-zinc-700 hover:border-orange-500 hover:bg-orange-500/10'
                        : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                    }`}
                  >
                    <Ticket className={`w-5 h-5 ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`} />
                    <span className={`font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                      View All Tickets
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className={cardClass}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Recent Tickets
              </h2>
              {initialData.tickets.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <AlertCircle
                    className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                  />
                  <p>No recent tickets</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {initialData.tickets.slice(0, 5).map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isDarkMode
                          ? 'border-zinc-800 hover:bg-zinc-800/60'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {ticket.equipment?.name || 'Unknown Equipment'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {ticket.gyms?.name || 'Unknown Gym'}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ticket.status === 'open'
                            ? isDarkMode
                              ? 'bg-green-500/10 text-green-300 border border-green-500/30'
                              : 'bg-green-100 text-green-800'
                            : ticket.status === 'closed'
                              ? isDarkMode
                                ? 'bg-gray-500/10 text-gray-200 border border-gray-500/30'
                                : 'bg-gray-100 text-gray-800'
                              : isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className={cardClass}>
            <EquipmentManager role={role} userId={user.id} factoryId={initialData.factory?.id || ''} />
          </div>
        )}

        {activeTab === 'gyms' && (
          <div className={cardClass}>
            <GymManager role={role} userId={user.id} factoryId={initialData.factory?.id || ''} />
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className={cardClass}>
            <TicketManager role={role} userId={user.id} factoryId={initialData.factory?.id || ''} />
          </div>
        )}
      </div>
    </div>
  )
}
