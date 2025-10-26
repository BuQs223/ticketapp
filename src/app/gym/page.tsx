import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import GymDashboardClient from './GymDashboardClient'

async function getGymMemberRole(userId: string) {
  const supabase = await createClient()
  
  const { data: gymMember } = await supabase
    .from('gym_members')
    .select('gym_id, role, approved_at')
    .eq('user_id', userId)
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return gymMember
}

export default async function GymPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth')
  }

  const gymMember = await getGymMemberRole(user.id)
  
  if (!gymMember?.approved_at) {
    redirect('/dashboard')
  }

  // Fetch gym details
  const { data: gym } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymMember.gym_id)
    .single()

  // Fetch equipment assigned to this gym
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('gym_id', gymMember.gym_id)
    .order('created_at', { ascending: false })

  // Fetch tickets for this gym (only first 20)
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      equipment:equipment_id (
        id,
        name,
        serial_number
      )
    `)
    .eq('gym_id', gymMember.gym_id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch gym members (only first 20)
  const { data: members } = await supabase
    .from('gym_members')
    .select('*')
    .eq('gym_id', gymMember.gym_id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate stats
  const stats = {
    totalEquipment: equipment?.length || 0,
    activeEquipment: equipment?.filter((e: any) => e.status === 'active').length || 0,
    openTickets: tickets?.filter((t: any) => ['open', 'in_review', 'gym_fix_in_progress'].includes(t.status)).length || 0,
    resolvedTickets: tickets?.filter((t: any) => ['resolved', 'closed'].includes(t.status)).length || 0,
    pendingVisits: tickets?.filter((t: any) => t.status === 'factory_visit_requested').length || 0,
    totalMembers: members?.filter((m: any) => m.approved_at).length || 0
  }

  const initialData = {
    gym,
    equipment: equipment || [],
    tickets: tickets || [],
    members: members || [],
    notifications: notifications || [],
    stats
  }

  return (
    <GymDashboardClient
      user={user}
      role={gymMember.role}
      initialData={initialData}
    />
  )
}
