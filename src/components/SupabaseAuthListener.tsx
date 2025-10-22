"use client"

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseAuthListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, session }),
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
