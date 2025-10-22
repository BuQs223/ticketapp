import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: factoryMember } = await supabase
    .from('factory_members')
    .select('role, approved_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (factoryMember?.approved_at) {
    redirect('/factory')
  }

  const { data: gymMember } = await supabase
    .from('gym_members')
    .select('role, approved_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (gymMember?.approved_at) {
    redirect('/gym')
  }

  redirect('/dashboard')
}
