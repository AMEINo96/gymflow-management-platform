import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'revenue', 'signups', 'attendance'
  const timeframe = searchParams.get('timeframe') || '30d'

  const now = new Date()
  let startDate = new Date(0)
  
  if (timeframe === '7d') startDate = new Date(now.setDate(now.getDate() - 7))
  else if (timeframe === '30d') startDate = new Date(now.setDate(now.getDate() - 30))
  else if (timeframe === '3m') startDate = new Date(now.setMonth(now.getMonth() - 3))
  else if (timeframe === 'ytd') startDate = new Date(now.getFullYear(), 0, 1)

  const startDateIso = startDate.toISOString()

  try {
    if (type === 'revenue') {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          date,
          members (name, next_due_date)
        `)
        .gte('date', startDateIso)
        .order('date', { ascending: false })

      if (error) throw error

      // Aggregate for chart
      const chartMap = {}
      data.forEach(p => {
        let label = ''
        const d = new Date(p.date)
        if (timeframe === '7d' || timeframe === '30d') {
          label = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
        } else {
          label = d.toLocaleDateString([], { month: 'short', year: '2-digit' })
        }
        chartMap[label] = (chartMap[label] || 0) + parseFloat(p.amount)
      })

      const chartData = Object.keys(chartMap).map(k => ({ name: k, value: chartMap[k] }))
      // keep chronological order for chart
      chartData.sort((a, b) => new Date(a.name) - new Date(b.name)) 

      return NextResponse.json({ raw: data, chart: chartData })
    }

    if (type === 'signups') {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          phone,
          gender,
          join_date,
          next_due_date,
          plans (name)
        `)
        .gte('join_date', startDateIso)
        .order('join_date', { ascending: false })

      if (error) throw error

      // Aggregate for chart
      const chartMap = {}
      data.forEach(m => {
        let label = ''
        const d = new Date(m.join_date)
        if (timeframe === '7d' || timeframe === '30d') {
          label = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
        } else {
          label = d.toLocaleDateString([], { month: 'short', year: '2-digit' })
        }
        chartMap[label] = (chartMap[label] || 0) + 1
      })

      const chartData = Object.keys(chartMap).map(k => ({ name: k, value: chartMap[k] }))
      chartData.sort((a, b) => new Date(a.name) - new Date(b.name))

      return NextResponse.json({ raw: data, chart: chartData })
    }

    if (type === 'attendance') {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          timestamp,
          members (name, gender)
        `)
        .gte('timestamp', startDateIso)
        .order('timestamp', { ascending: false })

      if (error) throw error

      // Aggregate for chart (Busy Hours)
      const hoursCount = {}
      data.forEach(a => {
        const hour = new Date(a.timestamp).getHours()
        hoursCount[hour] = (hoursCount[hour] || 0) + 1
      })
      const chartData = Object.keys(hoursCount).map(hour => ({
        name: `${hour}:00`,
        value: hoursCount[hour]
      })).sort((a, b) => parseInt(a.name) - parseInt(b.name))

      return NextResponse.json({ raw: data, chart: chartData })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
