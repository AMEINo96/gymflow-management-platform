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
    const { fingerprint_id } = await request.json()

    if (!fingerprint_id) {
      return NextResponse.json({ error: 'Missing fingerprint_id' }, { status: 400 })
    }

    // 1. Find the member with this fingerprint ID (include gender for schedule check)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, gender, next_due_date, deleted_at')
      .eq('fingerprint_id', fingerprint_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found for this fingerprint' }, { status: 404 })
    }

    // 1b. Check if the member has been soft-deleted
    if (member.deleted_at) {
      await broadcastScan(supabase, 'denied', member, 'Membership Removed')
      return NextResponse.json({
        status: 'access_denied',
        message: 'Membership has been removed'
      })
    }

    // 2. Check if the fee is overdue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (new Date(member.next_due_date) < today) {
      await broadcastScan(supabase, 'denied', member, 'Fee Overdue')
      return NextResponse.json({
        status: 'access_denied',
        message: 'Fee Overdue'
      })
    }

    // 3. Check system door mode — remote overrides skip schedule enforcement
    const { data: settings } = await supabase
      .from('system_settings')
      .select('door_mode')
      .eq('id', 1)
      .single()

    const doorMode = settings?.door_mode || 'normal'

    // If manager remotely locked the door, deny everyone
    if (doorMode === 'locked') {
      await broadcastScan(supabase, 'denied', member, 'Gym Locked by Manager')
      return NextResponse.json({
        status: 'access_denied',
        message: 'Gym is currently locked by the manager'
      })
    }

    // If manager remotely unlocked, skip schedule checks entirely
    const skipScheduleCheck = (doorMode === 'unlock')

    // 4. Schedule enforcement (only in normal mode)
    if (!skipScheduleCheck) {
      const now = new Date()
      const currentTimeStr = now.toTimeString().substring(0, 8) // "HH:MM:SS"

      // Fetch all defined schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')

      // If the table doesn't exist yet, skip enforcement gracefully
      if (schedError && schedError.code === '42P01') {
        // Table not created yet — allow entry (no schedules = open)
      } else if (schedError) {
        throw schedError
      } else if (schedules && schedules.length > 0) {
        // Schedules ARE defined — enforce them

        // Find if ANY schedule covers the current time
        const activeSchedules = schedules.filter(s => {
          return currentTimeStr >= s.start_time && currentTimeStr < s.end_time
        })

        if (activeSchedules.length === 0) {
          // No schedule covers this time — deny everyone
          await broadcastScan(supabase, 'denied', member, 'Gym Closed (No Active Schedule)')
          return NextResponse.json({
            status: 'access_denied',
            message: 'Gym is closed at this time — no active schedule'
          })
        }

        // Check if the member's gender matches any active schedule
        const genderAllowed = activeSchedules.some(s => s.gender === member.gender)

        if (!genderAllowed) {
          const allowedGender = activeSchedules[0].gender
          const reason = `${allowedGender.charAt(0).toUpperCase() + allowedGender.slice(1)} Only`
          await broadcastScan(supabase, 'denied', member, reason)
          return NextResponse.json({
            status: 'access_denied',
            message: `Access denied — current session is for ${allowedGender} members only`
          })
        }
      }
      // If schedules array is empty (no schedules defined), deny everyone
      else if (schedules && schedules.length === 0) {
        await broadcastScan(supabase, 'denied', member, 'No Schedules Configured')
        return NextResponse.json({
          status: 'access_denied',
          message: 'No gym schedules have been configured by the manager'
        })
      }
    }

    // 5. Check if attendance already marked for today
    const { data: existingAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id')
      .eq('member_id', member.id)
      .gte('timestamp', today.toISOString())
      .limit(1)

    if (attendanceError) throw attendanceError

    if (existingAttendance && existingAttendance.length > 0) {
      // Already marked today — still let them in, just notify
      await broadcastScan(supabase, 'granted', member, 'Already Marked Today')
      return NextResponse.json({
        status: 'already_marked',
        message: `Attendance already marked today for ${member.name}`
      })
    }

    // 6. Mark attendance
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({ member_id: member.id })

    if (insertError) throw insertError

    // Broadcast success to Attendance Monitor
    await broadcastScan(supabase, 'granted', member, 'Welcome')

    return NextResponse.json({
      status: 'success',
      message: `Attendance marked successfully for ${member.name}`
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper to broadcast scan events to the real-time Attendance Monitor
async function broadcastScan(supabase, access, member, reason) {
  try {
    await supabase.channel('scan-events').send({
      type: 'broadcast',
      event: 'scan_result',
      payload: { access, member, reason }
    })
  } catch (e) {
    console.error('Failed to broadcast scan event:', e)
  }
}
