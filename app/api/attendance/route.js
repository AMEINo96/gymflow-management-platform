import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { differenceInDays } from 'date-fns'

export async function POST(request) {
  // Use the Service Role Key for backend hardware endpoints to securely bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { fingerprint_id } = await request.json()

    if (!fingerprint_id) {
      return NextResponse.json({ error: 'Missing fingerprint_id' }, { status: 400 })
    }

    // Find member by fingerprint
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('fingerprint_id', fingerprint_id)
      .single()

    if (fetchError || !member) {
      // Broadcast the result to the Live Scanner UI
      await supabase.channel('scan-events').send({
        type: 'broadcast',
        event: 'scan_result',
        payload: { access: 'denied', reason: 'Member not found', member: null }
      })
      return NextResponse.json({ access: 'denied', reason: 'Member not found' })
    }

    const today = new Date()
    const nextDueDate = new Date(member.next_due_date)
    const daysLeft = differenceInDays(nextDueDate, today)

    if (daysLeft < 0) {
      await supabase.channel('scan-events').send({
        type: 'broadcast',
        event: 'scan_result',
        payload: { access: 'denied', reason: 'Payment Due', member }
      })
      return NextResponse.json({ access: 'denied', reason: 'Payment Due' })
    }

    // Log attendance
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert({ member_id: member.id })

    if (attendanceError) throw attendanceError

    await supabase.channel('scan-events').send({
      type: 'broadcast',
      event: 'scan_result',
      payload: { access: 'granted', reason: null, member }
    })

    return NextResponse.json({ access: 'granted', member_name: member.name })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
