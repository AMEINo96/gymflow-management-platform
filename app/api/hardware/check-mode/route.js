import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { },
      },
    }
  )

  try {
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .eq('is_enrolling', true)
      .limit(1)

    if (error) throw error

    if (data && data.length > 0) {
      return NextResponse.json({ mode: 'enroll', member_id: data[0].id })
    }

    return NextResponse.json({ mode: 'standby' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
