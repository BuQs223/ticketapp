import { createClient } from '@/lib/supabase-server'
import { FactoryRole } from '@/types/database'

export async function getFactoryMemberRole(userId: string): Promise<FactoryRole | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('factory_members')
    .select('role, approved_at')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error || !data || !data.approved_at) return null
  return data.role as FactoryRole
}

export async function isFactoryMember(userId: string): Promise<boolean> {
  const role = await getFactoryMemberRole(userId)
  return role !== null
}

export async function isFactoryOwner(userId: string): Promise<boolean> {
  const role = await getFactoryMemberRole(userId)
  return role === 'owner'
}

export async function isFactoryApprover(userId: string): Promise<boolean> {
  const role = await getFactoryMemberRole(userId)
  return role === 'owner' || role === 'approver'
}
