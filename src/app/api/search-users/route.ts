import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role (server-side only, never exposed to client)
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

export async function GET(request: NextRequest) {
  try {
    // Create regular client to check user authentication
    const { createClient: createServerClient } = await import('@/lib/supabase-server')
    const supabase = await createServerClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is factory owner/approver
    const { data: factoryMember } = await supabase
      .from('factory_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!factoryMember || !['owner', 'approver'].includes(factoryMember.role)) {
      return NextResponse.json({ error: 'Forbidden - Factory owner/approver only' }, { status: 403 })
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Server-side query to auth.users using admin client (secure!)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Filter users by email match
    const filteredUsers = data.users
      .filter(u => u.email?.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at
      }))

    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error('Error in search-users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
