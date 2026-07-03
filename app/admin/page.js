import { createClient } from '@/utils/supabase/server'
import SignOutButton from '@/app/components/SignOutButton'
import AdminDashboardClient from './AdminDashboardClient'
import { Dumbbell } from 'lucide-react'

import { cookies } from 'next/headers'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.has('gymflow_demo_role')

  let activeMembersCount = 0
  let newSignupsCount = 0
  let totalMonthlyRevenue = 0
  let revenueData = []
  let busyHoursData = []
  let growthData = []

  let genderSplitData = []
  let revenueByGenderData = []
  let attendanceConsistencyData = []

  if (isDemo) {
    activeMembersCount = 142
    newSignupsCount = 28
    totalMonthlyRevenue = 7450.00
    
    // Mock 6 months revenue growth
    revenueData = [
      { name: 'Jan', revenue: 4200 },
      { name: 'Feb', revenue: 4800 },
      { name: 'Mar', revenue: 5300 },
      { name: 'Apr', revenue: 6100 },
      { name: 'May', revenue: 6900 },
      { name: 'Jun', revenue: 7450 }
    ]

    // Mock busy hours
    busyHoursData = [
      { time: '6:00', visits: 12 },
      { time: '8:00', visits: 34 },
      { time: '10:00', visits: 15 },
      { time: '12:00', visits: 22 },
      { time: '14:00', visits: 8 },
      { time: '16:00', visits: 29 },
      { time: '18:00', visits: 54 },
      { time: '20:00', visits: 41 },
      { time: '22:00', visits: 10 }
    ]

    // Mock growth data
    growthData = [
      { week: 'Week 1', signups: 5 },
      { week: 'Week 2', signups: 8 },
      { week: 'Week 3', signups: 4 },
      { week: 'Week 4', signups: 11 }
    ]

    genderSplitData = [
      { name: 'Male', value: 85 },
      { name: 'Female', value: 57 }
    ]

    revenueByGenderData = [
      { name: 'Male', revenue: 4500 },
      { name: 'Female', revenue: 2950 }
    ]

    attendanceConsistencyData = [
      { name: 'Male', visits: 12.5 },
      { name: 'Female', visits: 8.2 }
    ]
  } else {
    const supabase = await createClient()

    // Fetch metrics
    const { data: activeMembersData } = await supabase
      .from('members')
      .select('id, gender')
      .is('deleted_at', null)
      .gte('next_due_date', new Date().toISOString())

    const { data: newSignups } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .gte('join_date', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, date, members!inner(gender)')
      .gte('date', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())
      
    const { data: attendance } = await supabase
      .from('attendance')
      .select('timestamp, members!inner(gender)')
      .gte('timestamp', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

    // Calculate total monthly revenue
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const thisMonthPayments = payments?.filter(p => p.date >= thisMonthStart) || []
    totalMonthlyRevenue = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

    activeMembersCount = activeMembersData?.length || 0
    newSignupsCount = newSignups?.length || 0

    // Format data for Line Chart (Revenue Growth)
    const revenueByMonth = {}
    payments?.forEach(p => {
      const month = new Date(p.date).toLocaleString('default', { month: 'short' })
      revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(p.amount)
    })
    revenueData = Object.keys(revenueByMonth).map(month => ({
      name: month,
      revenue: revenueByMonth[month]
    }))

    // Format data for Bar Chart (Busy Hours)
    const hoursCount = {}
    attendance?.forEach(a => {
      const hour = new Date(a.timestamp).getHours()
      hoursCount[hour] = (hoursCount[hour] || 0) + 1
    })
    busyHoursData = Object.keys(hoursCount).map(hour => ({
      time: `${hour}:00`,
      visits: hoursCount[hour]
    })).sort((a, b) => parseInt(a.time) - parseInt(b.time))

    // Format data for Growth Chart (New Signups past 4 weeks)
    const { data: recentSignups } = await supabase
      .from('members')
      .select('join_date')
      .gte('join_date', new Date(new Date().setDate(new Date().getDate() - 28)).toISOString())

    const weeksCount = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 }
    const now = new Date()
    recentSignups?.forEach(m => {
      const daysAgo = Math.floor((now - new Date(m.join_date)) / (1000 * 60 * 60 * 24))
      if (daysAgo <= 7) weeksCount['Week 4']++
      else if (daysAgo <= 14) weeksCount['Week 3']++
      else if (daysAgo <= 21) weeksCount['Week 2']++
      else if (daysAgo <= 28) weeksCount['Week 1']++
    })
    growthData = Object.keys(weeksCount).map(w => ({ week: w, signups: weeksCount[w] }))

    // Calculate Demographic Stats
    let males = 0, females = 0
    activeMembersData?.forEach(m => {
      if (m.gender === 'female') females++
      else if (m.gender === 'male') males++
    })
    genderSplitData = [
      { name: 'Male', value: males },
      { name: 'Female', value: females }
    ]

    let maleRevenue = 0, femaleRevenue = 0
    thisMonthPayments?.forEach(p => {
      const g = p.members?.gender
      if (g === 'female') femaleRevenue += parseFloat(p.amount)
      else if (g === 'male') maleRevenue += parseFloat(p.amount)
    })
    revenueByGenderData = [
      { name: 'Male', revenue: maleRevenue },
      { name: 'Female', revenue: femaleRevenue }
    ]

    let maleVisits = 0, femaleVisits = 0
    attendance?.forEach(a => {
      const g = a.members?.gender
      if (g === 'female') femaleVisits++
      else if (g === 'male') maleVisits++
    })
    
    // Average monthly visits per active user (prevent division by zero)
    attendanceConsistencyData = [
      { name: 'Male', visits: males > 0 ? (maleVisits / males).toFixed(1) : 0 },
      { name: 'Female', visits: females > 0 ? (femaleVisits / females).toFixed(1) : 0 }
    ]
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-zinc-400">GymFlow Business Overview</p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminDashboardClient 
          totalMonthlyRevenue={totalMonthlyRevenue}
          activeMembersCount={activeMembersCount}
          newSignupsCount={newSignupsCount}
          revenueData={revenueData}
          busyHoursData={busyHoursData}
          growthData={growthData}
          genderSplitData={genderSplitData}
          revenueByGenderData={revenueByGenderData}
          attendanceConsistencyData={attendanceConsistencyData}
        />
      </div>
    </div>
  )
}
