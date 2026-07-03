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
  } else {
    const supabase = await createClient()

    // Fetch metrics
    const { data: activeMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .gte('next_due_date', new Date().toISOString())

    const { data: newSignups } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .gte('join_date', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, date')
      .gte('date', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())
      
    const { data: attendance } = await supabase
      .from('attendance')
      .select('timestamp')
      .gte('timestamp', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

    // Calculate total monthly revenue
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const thisMonthPayments = payments?.filter(p => p.date >= thisMonthStart) || []
    totalMonthlyRevenue = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

    activeMembersCount = activeMembers?.length || 0
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
        />
      </div>
    </div>
  )
}
