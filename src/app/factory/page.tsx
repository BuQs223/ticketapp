import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getFactoryMemberRole } from '@/lib/auth-helpers'
import FactoryDashboardClient from './FactoryDashboardClient'

export default async function FactoryDashboard() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth')
  }

  // Check if user is a factory member
  const role = await getFactoryMemberRole(user.id)
  
  if (!role) {
    redirect('/dashboard') // Redirect to gym dashboard or other appropriate page
  }

  // Fetch initial data for SSR
  const [
    factoryData,
    equipmentData,
    gymsData,
    ticketsData,
    notificationsData
  ] = await Promise.all([
    supabase.from('factory').select('*').single(),
    supabase.from('equipment').select(`
      *,
      gyms:gym_id (id, name)
    `).order('created_at', { ascending: false }),
    supabase.from('gyms').select('*').order('created_at', { ascending: false }),
    supabase.from('tickets').select(`
      *,
      equipment:equipment_id (id, name, serial_number),
      gyms:gym_id (id, name)
    `).order('created_at', { ascending: false }).limit(10),
    supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  // Get statistics
  const [
    totalEquipmentCount,
    activeEquipmentCount,
    totalGymsCount,
    activeGymsCount,
    openTicketsCount,
    pendingVisitsCount
  ] = await Promise.all([
    supabase.from('equipment').select('id', { count: 'exact', head: true }),
    supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('gyms').select('id', { count: 'exact', head: true }),
    supabase.from('gyms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review', 'gym_fix_in_progress']),
    supabase.from('factory_visit_requests').select('ticket_id', { count: 'exact', head: true }).eq('approval_status', 'pending')
  ])

  const initialData = {
    factory: factoryData.data,
    equipment: equipmentData.data || [],
    gyms: gymsData.data || [],
    tickets: ticketsData.data || [],
    notifications: notificationsData.data || [],
    stats: {
      totalEquipment: totalEquipmentCount.count || 0,
      activeEquipment: activeEquipmentCount.count || 0,
      totalGyms: totalGymsCount.count || 0,
      activeGyms: activeGymsCount.count || 0,
      openTickets: openTicketsCount.count || 0,
      pendingVisits: pendingVisitsCount.count || 0
    }
  }

  return <FactoryDashboardClient user={user} role={role} initialData={initialData} />
}
