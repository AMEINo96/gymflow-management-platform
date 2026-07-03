import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateHardwareRequest } from '@/utils/hardware-auth'

export async function GET(request) {
  const authError = validateHardwareRequest(request)
  if (authError) return authError

  // Use the Service Role Key for backend hardware endpoints to securely bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // 1. Check global system settings for hardware overrides
    const { data: settings } = await supabase
      .from('system_settings')
      .select('door_mode')
      .eq('id', 1)
      .single()

    if (settings) {
      if (settings.door_mode === 'unlock') {
        // Reset to normal automatically after sending unlock signal
        await supabase.from('system_settings').update({ door_mode: 'normal' }).eq('id', 1)
        return NextResponse.json({ mode: 'unlock' })
      }
      if (settings.door_mode === 'locked') {
        return NextResponse.json({ mode: 'locked' })
      }
    }

    // 2. Normal mode: check if any member is enrolling
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
