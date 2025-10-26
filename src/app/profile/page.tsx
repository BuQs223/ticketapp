import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ProfilePageClient from '@/components/ProfilePageClient'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user's roles and related data
  const [factoryEmployee, ownedGyms, factory] = await Promise.all([
    // Check if user is a factory employee
    supabase
      .from('factory_employees')
      .select('id, role, factory_id, created_at')
      .eq('user_id', user.id)
      .single(),
    
    // Check if user owns any gyms
    supabase
      .from('gyms')
      .select('id, name, status, created_at')
      .eq('owner_user_id', user.id),
    
    // Get factory details
    supabase
      .from('factory')
      .select('id, name')
      .single()
  ])

  // Get system statistics
  const [totalTickets, totalGyms, totalEquipment, factoryMembers] = await Promise.all([
    // Total tickets in system
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true }),
    
    // Total gyms in system
    supabase
      .from('gyms')
      .select('*', { count: 'exact', head: true }),
    
    // Total equipment in system
    supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true }),
    
    // Total factory employees
    supabase
      .from('factory_employees')
      .select('*', { count: 'exact', head: true })
  ])

  const stats = {
    totalTickets: totalTickets.count || 0,
    totalGyms: totalGyms.count || 0,
    totalEquipment: totalEquipment.count || 0,
    factoryMembers: factoryMembers.count || 0
  }

  return (
    <ProfilePageClient
      user={user}
      factoryEmployee={factoryEmployee.data}
      ownedGyms={ownedGyms.data || []}
      factory={factory.data}
      stats={stats}
    />
  )
}
