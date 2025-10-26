import { NextRequest, NextResponse } from 'next/server'

async function getAuthenticatedUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase-server')
  const supabase = await createServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized' }
  }
  
  return { user, supabase, error: null }
}

async function verifyGymMember(supabase: any, userId: string, gymId: string) {
  const { data: gymMember } = await supabase
    .from('gym_members')
    .select('role')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .single()

  return gymMember?.role || null
}

// GET - Fetch gym members with pagination
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const gymId = searchParams.get('gym_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!gymId) {
      return NextResponse.json({ error: 'Missing gym_id' }, { status: 400 })
    }

    // Verify user is a member of this gym
    const role = await verifyGymMember(supabase, user.id, gymId)
    if (!role) {
      return NextResponse.json({ error: 'Forbidden - Not a gym member' }, { status: 403 })
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Fetch members with pagination
    const { data: members, error: fetchError, count } = await supabase
      .from('gym_members')
      .select('*', { count: 'exact' })
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) throw fetchError

    // Check if there are more members
    const hasMore = count ? offset + limit < count : false

    return NextResponse.json({
      members: members || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore
      }
    })
  } catch (error: any) {
    console.error('Error fetching gym members:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
