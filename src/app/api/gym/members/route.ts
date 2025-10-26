import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function getAuthenticatedUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase-server')
  const supabase = await createServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized' }
  }
  
  return { user, supabase, error: null }
}

async function verifyGymOwner(supabase: any, userId: string, gymId: string) {
  const { data: gymMember } = await supabase
    .from('gym_members')
    .select('role')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .single()

  return gymMember?.role === 'owner'
}

// POST - Add new gym member
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, gym_id, role, email } = body

    // Validate input
    if (!user_id || !gym_id || !role || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify requester is gym owner
    const isOwner = await verifyGymOwner(supabase, user.id, gym_id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden - Gym owner only' }, { status: 403 })
    }

    // Check if user exists in auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (!authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('gym_members')
      .select('user_id')
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    // Add member with approved_at
    const { data: newMember, error: insertError } = await supabase
      .from('gym_members')
      .insert({
        user_id,
        gym_id,
        role,
        email,
        approved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ member: newMember }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding gym member:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update member role
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, gym_id, role } = body

    // Validate input
    if (!user_id || !gym_id || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify requester is gym owner
    const isOwner = await verifyGymOwner(supabase, user.id, gym_id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden - Gym owner only' }, { status: 403 })
    }

    // Check if target member is an owner
    const { data: targetMember } = await supabase
      .from('gym_members')
      .select('role')
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update role
    const { data: updatedMember, error: updateError } = await supabase
      .from('gym_members')
      .update({ role })
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ member: updatedMember })
  } catch (error: any) {
    console.error('Error updating gym member:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove member
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const user_id = searchParams.get('user_id')
    const gym_id = searchParams.get('gym_id')

    // Validate input
    if (!user_id || !gym_id) {
      return NextResponse.json({ error: 'Missing user_id or gym_id' }, { status: 400 })
    }

    // Verify requester is gym owner
    const isOwner = await verifyGymOwner(supabase, user.id, gym_id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden - Gym owner only' }, { status: 403 })
    }

    // Check if target member is an owner
    const { data: targetMember } = await supabase
      .from('gym_members')
      .select('role')
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove gym owner' }, { status: 403 })
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('gym_members')
      .delete()
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing gym member:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
