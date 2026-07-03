import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateHardwareRequest } from '@/utils/hardware-auth'

export async function POST(request) {
  const authError = validateHardwareRequest(request)
  if (authError) return authError

  // Use the Service Role Key for backend hardware endpoints to securely bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { member_id, fingerprint_id } = await request.json()

    if (!member_id || !fingerprint_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase
      .from('members')
      .update({ 
        fingerprint_id: fingerprint_id,
        is_enrolling: false 
      })
      .eq('id', member_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
