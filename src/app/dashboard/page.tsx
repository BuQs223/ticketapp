'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth')
        return
      }

      // Check if user is a factory member
      const { data: factoryMember } = await supabase
        .from('factory_members')
        .select('role, approved_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (factoryMember && factoryMember.approved_at) {
        // Redirect to factory dashboard
        router.push('/factory')
        return
      }

      // Check if user is a gym member
      const { data: gymMember } = await supabase
        .from('gym_members')
        .select('role, approved_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (gymMember && gymMember.approved_at) {
        // Redirect to gym dashboard (to be implemented)
        router.push('/gym')
        return
      }

      // Default: show generic dashboard or redirect to setup
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/auth')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Ticket App</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900">Total Tickets</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-green-900">Resolved</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">0</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-yellow-900">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">0</p>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mt-8 p-6 bg-indigo-50 rounded-lg">
            <h3 className="text-lg font-medium text-indigo-900 mb-2">
              🎉 Welcome to Ticket App!
            </h3>
            <p className="text-indigo-700">
              You&apos;ve successfully authenticated with Supabase. This is your dashboard where you can manage tickets.
              Future features will include creating, viewing, and managing support tickets.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}