'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { Users, DollarSign, UserPlus, Activity, Trash2, Loader2, TrendingUp, Lock, Unlock, Shield, RefreshCcw, Maximize2, X, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const COLORS = {
  Male: '#ef4444', // red-500
  Female: '#a1a1aa', // zinc-400
}

export default function AdminDashboardClient({ 
  totalMonthlyRevenue, 
  activeMembersCount, 
  newSignupsCount, 
  revenueData, 
  busyHoursData,
  growthData,
  genderSplitData = [],
  revenueByGenderData = [],
  attendanceConsistencyData = []
}) {
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingPlanId, setDeletingPlanId] = useState(null)
  const [showDeleted, setShowDeleted] = useState(false)

  // Member Modal State
  const [selectedMember, setSelectedMember] = useState(null)

  // Analytics Modal State
  const [expandedChart, setExpandedChart] = useState(null)
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30d')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  
  // Plan form state
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanPrice, setNewPlanPrice] = useState('')
  const [newPlanDuration, setNewPlanDuration] = useState('')
  const [submittingPlan, setSubmittingPlan] = useState(false)

  const [doorMode, setDoorMode] = useState('normal')
  const [loadingHardware, setLoadingHardware] = useState(false)

  // Schedules state
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [newScheduleGender, setNewScheduleGender] = useState('male')
  const [newScheduleStart, setNewScheduleStart] = useState('')
  const [newScheduleEnd, setNewScheduleEnd] = useState('')
  const [submittingSchedule, setSubmittingSchedule] = useState(false)
  const [deletingScheduleId, setDeletingScheduleId] = useState(null)
  
  // Mobile accordion state
  const [isPlansOpen, setIsPlansOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
    fetchPlans()
    fetchDoorMode()
    fetchSchedules()
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [showDeleted])

  useEffect(() => {
    if (expandedChart) {
      fetchAnalytics(expandedChart, analyticsTimeframe)
    }
  }, [expandedChart, analyticsTimeframe])

  const fetchAnalytics = async (type, timeframe) => {
    setLoadingAnalytics(true)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) {
      setTimeout(() => {
        setAnalyticsData({ chart: [], raw: [] })
        setLoadingAnalytics(false)
      }, 500)
      return
    }

    try {
      const res = await fetch(`/api/analytics?type=${type}&timeframe=${timeframe}`)
      const data = await res.json()
      setAnalyticsData(data)
    } catch (e) {
      console.error('Failed to fetch analytics', e)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const fetchDoorMode = async () => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) return
    try {
      const { data } = await supabase.from('system_settings').select('door_mode').eq('id', 1).single()
      if (data) setDoorMode(data.door_mode)
    } catch (e) {
      console.error('Failed to fetch door mode', e)
    }
  }

  const handleUpdateDoorMode = async (mode) => {
    setLoadingHardware(true)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) {
      alert(`Hardware mode changed to ${mode} (Demo)`)
      setDoorMode(mode)
      setLoadingHardware(false)
      return
    }
    
    try {
      await supabase.from('system_settings').update({ door_mode: mode }).eq('id', 1)
      setDoorMode(mode)
    } catch (error) {
      console.error('Error updating door mode:', error)
      alert('Failed to update hardware mode')
    } finally {
      setLoadingHardware(false)
    }
  }

  const fetchPlans = async () => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) {
      let storedPlans = localStorage.getItem('gymflow_plans')
      if (!storedPlans) {
        const defaultPlans = [
          { id: 'p1', name: 'Basic', price: 30, duration_days: 30 },
          { id: 'p2', name: 'Advance', price: 75, duration_days: 90 },
          { id: 'p3', name: 'Super', price: 250, duration_days: 365 }
        ]
        localStorage.setItem('gymflow_plans', JSON.stringify(defaultPlans))
        storedPlans = JSON.stringify(defaultPlans)
      }
      setPlans(JSON.parse(storedPlans))
      setLoadingPlans(false)
      return
    }

    try {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: true })
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const fetchSchedules = async () => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) {
      const stored = localStorage.getItem('gymflow_schedules')
      if (stored) {
        setSchedules(JSON.parse(stored))
      } else {
        const defaultSchedules = [
          { id: 1, gender: 'male', start_time: '06:00:00', end_time: '10:00:00' },
          { id: 2, gender: 'female', start_time: '10:00:00', end_time: '16:00:00' },
          { id: 3, gender: 'male', start_time: '16:00:00', end_time: '23:00:00' }
        ]
        setSchedules(defaultSchedules)
        localStorage.setItem('gymflow_schedules', JSON.stringify(defaultSchedules))
      }
      setLoadingSchedules(false)
      return
    }

    try {
      const { data, error } = await supabase.from('schedules').select('*').order('start_time')
      if (error) {
        if (error.code === '42P01') {
          console.warn('Schedules table does not exist yet.')
          setSchedules([])
        } else {
          throw error
        }
      } else {
        setSchedules(data || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoadingSchedules(false)
    }
  }

  const fetchMembers = async () => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) {
      const stored = localStorage.getItem('gymflow_members')
      if (stored) {
        setMembers(JSON.parse(stored))
      }
      setLoadingMembers(false)
      return
    }

    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          plans:plan_id (name),
          attendance (timestamp)
        `)
        .order('created_at', { ascending: false })
      
      if (showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      const { data } = await query
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleRecoverMember = async (id) => {
    setDeletingId(id)
    if (typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')) return
    try {
      const { error } = await supabase.from('members').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
      await fetchMembers()
    } catch (error) {
      alert('Failed to recover member')
    } finally {
      setDeletingId(null)
    }
  }

  const handleHardDeleteMember = async (id) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this member?')) return
    setDeletingId(id)
    if (typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')) return
    try {
      const memberToDelete = members.find(m => m.id === id)
      
      const { error } = await supabase.from('members').delete().eq('id', id)
      if (error) throw error

      // Clean up the photo from storage bucket if it exists
      if (memberToDelete?.image_url) {
        const fileName = memberToDelete.image_url.split('/').pop()
        if (fileName) {
          await supabase.storage.from('member_photos').remove([fileName])
        }
      }

      await fetchMembers()
    } catch (error) {
      alert('Failed to permanently delete member')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteMember = async (id) => {
    if (!confirm('Are you sure you want to move this member to Recently Deleted?')) return
    
    setDeletingId(id)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    
    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_members') || '[]')
      const updated = stored.filter(m => m.id !== id)
      localStorage.setItem('gymflow_members', JSON.stringify(updated))
      setMembers(updated)
      setDeletingId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        
      if (error) throw error
      await fetchMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Failed to delete member')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddPlan = async (e) => {
    e.preventDefault()
    if (!newPlanName || !newPlanPrice || !newPlanDuration) return

    setSubmittingPlan(true)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    const planData = {
      name: newPlanName,
      price: parseFloat(newPlanPrice),
      duration_days: parseInt(newPlanDuration)
    }

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_plans') || '[]')
      const newPlan = {
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        ...planData
      }
      const updated = [...stored, newPlan]
      localStorage.setItem('gymflow_plans', JSON.stringify(updated))
      setPlans(updated)
      
      setNewPlanName('')
      setNewPlanPrice('')
      setNewPlanDuration('')
      setSubmittingPlan(false)
      return
    }

    try {
      const { error } = await supabase
        .from('plans')
        .insert(planData)
      
      if (error) throw error

      await fetchPlans()
      setNewPlanName('')
      setNewPlanPrice('')
      setNewPlanDuration('')
    } catch (error) {
      console.error('Error adding plan:', error)
      alert('Failed to add plan')
    } finally {
      setSubmittingPlan(false)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan? Members currently on this plan might have issues.')) return

    setDeletingPlanId(planId)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_plans') || '[]')
      const updated = stored.filter(p => p.id !== planId)
      localStorage.setItem('gymflow_plans', JSON.stringify(updated))
      setPlans(updated)
      setDeletingPlanId(null)
      return
    }

    try {
      await supabase
        .from('plans')
        .delete()
        .eq('id', planId)
      
      await fetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      alert('Failed to delete plan. Check if members are still linked to it.')
    } finally {
      setDeletingPlanId(null)
    }
  }

  const handleAddSchedule = async (e) => {
    e.preventDefault()
    if (!newScheduleGender || !newScheduleStart || !newScheduleEnd) return

    setSubmittingSchedule(true)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    const scheduleData = {
      gender: newScheduleGender,
      start_time: newScheduleStart + ':00',
      end_time: newScheduleEnd + ':00'
    }

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_schedules') || '[]')
      const newSchedule = {
        id: Math.floor(Math.random() * 10000),
        ...scheduleData
      }
      const updated = [...stored, newSchedule]
      localStorage.setItem('gymflow_schedules', JSON.stringify(updated))
      setSchedules(updated)
      
      setNewScheduleStart('')
      setNewScheduleEnd('')
      setSubmittingSchedule(false)
      return
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .insert(scheduleData)
      
      if (error) {
        if (error.code === '42P01') alert("Please ask the admin to run the SQL to create the schedules table first!")
        else throw error
      } else {
        await fetchSchedules()
        setNewScheduleStart('')
        setNewScheduleEnd('')
      }
    } catch (error) {
      console.error('Error adding schedule:', error)
      alert('Failed to add schedule')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    setDeletingScheduleId(scheduleId)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_schedules') || '[]')
      const updated = stored.filter(s => s.id !== scheduleId)
      localStorage.setItem('gymflow_schedules', JSON.stringify(updated))
      setSchedules(updated)
      setDeletingScheduleId(null)
      return
    }

    try {
      await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)
      
      await fetchSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Failed to delete schedule.')
    } finally {
      setDeletingScheduleId(null)
    }
  }

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (member.phone && member.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Metric Cards */}
      <div className="flex overflow-x-auto snap-x md:grid md:grid-cols-3 gap-4 md:gap-6 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[85vw] md:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Monthly Revenue</h3>
          </div>
          <p className="text-4xl font-bold text-white">PKR {totalMonthlyRevenue.toFixed(2)}</p>
        </div>

        <div className="min-w-[85vw] md:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Users className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Active Members</h3>
          </div>
          <p className="text-4xl font-bold text-white">{activeMembersCount}</p>
        </div>

        <div className="min-w-[85vw] md:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserPlus className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <UserPlus className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">New Signups (30d)</h3>
          </div>
          <p className="text-4xl font-bold text-white">{newSignupsCount}</p>
        </div>
      </div>

      {/* All Analytics Charts (Swiping on Mobile) */}
      <div className="flex overflow-x-auto snap-x xl:grid xl:grid-cols-3 gap-4 md:gap-6 pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Revenue Growth (6 Months)
            </h3>
            <button onClick={() => setExpandedChart('revenue')} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 w-full h-56 md:min-h-[320px]">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `PKR ${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#f87171" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Signups (Last 4 Weeks)
            </h3>
            <button onClick={() => setExpandedChart('signups')} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 w-full h-56 md:min-h-[320px]">
            {growthData && growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="week" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="signups" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No growth data available</div>
            )}
          </div>
        </div>

        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-red-500" />
              Busy Hours
            </h3>
            <button onClick={() => setExpandedChart('attendance')} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 w-full h-56 md:min-h-[320px]">
            {busyHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={busyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="visits" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No attendance data available</div>
            )}
          </div>
        </div>
        
        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Active Members Split
          </h3>
          <div className="flex-1 w-full h-56 md:min-h-[320px]">
            {genderSplitData && genderSplitData.length > 0 && genderSplitData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderSplitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white font-bold text-2xl">
                    {genderSplitData.reduce((a, b) => a + b.value, 0)}
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-sm mt-2">
                    Total
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No data available</div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm text-zinc-400">Male</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-400"></div><span className="text-sm text-zinc-400">Female</span></div>
          </div>
        </div>

        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-500" />
            Revenue by Demographic
          </h3>
          <div className="flex-1 w-full h-56 md:min-h-[320px]">
            {revenueByGenderData && revenueByGenderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByGenderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `PKR ${v}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueByGenderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No data available</div>
            )}
          </div>
        </div>

        <div className="min-w-[90vw] md:min-w-[600px] xl:min-w-0 snap-center shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Attendance Consistency
          </h3>
          <p className="text-xs text-zinc-500 mb-4 text-center hidden md:block">Average monthly visits per active user</p>
          <div className="flex-1 w-full h-56 md:min-h-[290px]">
            {attendanceConsistencyData && attendanceConsistencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceConsistencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                    {attendanceConsistencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Hardware Controls */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 md:mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          Hardware & Security Override
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          <button 
            onClick={() => handleUpdateDoorMode('unlock')}
            disabled={loadingHardware}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${doorMode === 'unlock' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
          >
            <Unlock className="w-6 h-6" />
            <span className="font-medium">Remote Unlock (1-time)</span>
          </button>
          
          <button 
            onClick={() => handleUpdateDoorMode('locked')}
            disabled={loadingHardware}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${doorMode === 'locked' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
          >
            <Lock className="w-6 h-6" />
            <span className="font-medium">Lock Sensor (After Hours)</span>
          </button>
          
          <button 
            onClick={() => handleUpdateDoorMode('normal')}
            disabled={loadingHardware}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${doorMode === 'normal' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
          >
            <Activity className="w-6 h-6" />
            <span className="font-medium">Normal Mode</span>
          </button>
        </div>
      </div>

      {/* Management Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Member Management */}
        <div className="xl:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Member Management
              </h3>
              <p className="text-sm text-zinc-400 mt-1">View and remove gym members.</p>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <button 
                onClick={() => setShowDeleted(!showDeleted)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${showDeleted ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
              >
                {showDeleted ? 'Showing Deleted' : 'Recently Deleted'}
              </button>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:ring-1 focus:ring-purple-500 outline-none text-white transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loadingMembers ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                      {searchTerm ? 'No members match your search.' : 'No members found.'}
                    </td>
                  </tr>
                ) : filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedMember(member)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {member.name}
                        {member.gender && (
                          <div 
                            className={`w-2 h-2 rounded-full ${member.gender === 'female' ? 'bg-pink-500' : 'bg-red-500'}`} 
                            title={member.gender === 'female' ? 'Female' : 'Male'}
                          ></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {member.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-300">{member.plans?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {showDeleted ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRecoverMember(member.id); }}
                            disabled={deletingId === member.id}
                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50 inline-block mr-2"
                            title="Recover Member"
                          >
                            <RefreshCcw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleHardDeleteMember(member.id); }}
                            disabled={deletingId === member.id}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50 inline-block"
                            title="Permanently Delete"
                          >
                            {deletingId === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMember(member.id); }}
                          disabled={deletingId === member.id}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50 inline-block"
                          title="Move to Recently Deleted"
                        >
                          {deletingId === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Management */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
          <div 
            className="p-6 border-b border-zinc-800 flex justify-between items-center cursor-pointer md:cursor-default"
            onClick={() => setIsPlansOpen(!isPlansOpen)}
          >
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Plan Management
              </h3>
              <p className="text-sm text-zinc-400 mt-1">Add or remove subscription tiers.</p>
            </div>
            <button className="text-zinc-400 md:hidden">
              {isPlansOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          
          <div className={`${isPlansOpen ? 'block' : 'hidden'} md:block`}>
            {/* Add Plan Form */}
          <form onSubmit={handleAddPlan} className="p-6 border-b border-zinc-800/60 bg-zinc-900/20 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="Plan Name (e.g. Basic)"
                required
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Price (PKR)"
                  required
                  min="0"
                  step="0.01"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all"
                />
                <input
                  type="number"
                  placeholder="Duration (Days)"
                  required
                  min="1"
                  value={newPlanDuration}
                  onChange={(e) => setNewPlanDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingPlan}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              {submittingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Plan'}
            </button>
          </form>

          {/* Plan List */}
          <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-zinc-800/40">
            {loadingPlans ? (
              <div className="p-6 text-center text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading plans...
              </div>
            ) : plans.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">No plans defined.</div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/10 transition-colors">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{plan.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">PKR {plan.price} / {plan.duration_days} Days</p>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deletingPlanId === plan.id}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingPlanId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Gym Schedule */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm mb-8">
        <div 
          className="p-6 border-b border-zinc-800 flex justify-between items-center cursor-pointer md:cursor-default"
          onClick={() => setIsScheduleOpen(!isScheduleOpen)}
        >
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              Gym Schedule Management
            </h3>
            <p className="text-sm text-zinc-400 mt-1">Configure when members can access the gym.</p>
          </div>
          <button className="text-zinc-400 md:hidden">
            {isScheduleOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <div className={`${isScheduleOpen ? 'block' : 'hidden'} md:flex flex-col md:flex-row`}>
          <div className="p-6 border-b md:border-b-0 md:border-r border-zinc-800 flex-1">
          <p className="text-sm text-zinc-400 mb-6">Define active hours for each demographic. Scans outside these hours are denied.</p>
          
          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Demographic</label>
                <select
                  required
                  value={newScheduleGender}
                  onChange={(e) => setNewScheduleGender(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all appearance-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Start Time</label>
                <input
                  type="time"
                  required
                  value={newScheduleStart}
                  onChange={(e) => setNewScheduleStart(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">End Time</label>
                <input
                  type="time"
                  required
                  value={newScheduleEnd}
                  onChange={(e) => setNewScheduleEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-red-500/50 outline-none text-white transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingSchedule}
              className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
            >
              {submittingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Time Slot'}
            </button>
          </form>
        </div>

        <div className="flex-1 bg-zinc-900/20 max-h-[300px] overflow-y-auto divide-y divide-zinc-800/40">
          {loadingSchedules ? (
            <div className="p-6 text-center text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading schedules...
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">No schedules defined. The gym is currently open to everyone.</div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${schedule.gender === 'female' ? 'bg-pink-500' : 'bg-red-500'}`}></div>
                  <div>
                    <h4 className="font-semibold text-white text-sm capitalize">{schedule.gender} Timing</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{schedule.start_time.substring(0,5)} to {schedule.end_time.substring(0,5)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  disabled={deletingScheduleId === schedule.id}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingScheduleId === schedule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))
          )}
        </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {expandedChart === 'revenue' && <><Activity className="w-6 h-6 text-red-500"/> Revenue Deep Dive</>}
                {expandedChart === 'signups' && <><TrendingUp className="w-6 h-6 text-purple-500"/> Signups Deep Dive</>}
                {expandedChart === 'attendance' && <><Users className="w-6 h-6 text-red-500"/> Busy Hours Deep Dive</>}
              </h2>
              <button onClick={() => setExpandedChart(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['7d', '30d', '3m', 'ytd'].map(tf => (
                  <button 
                    key={tf}
                    onClick={() => setAnalyticsTimeframe(tf)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${analyticsTimeframe === tf ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}
                  >
                    {tf === '7d' ? 'Past 7 Days' : tf === '30d' ? 'Past 30 Days' : tf === '3m' ? 'Past 3 Months' : 'Year to Date'}
                  </button>
                ))}
              </div>

              {loadingAnalytics ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
                  Loading analytics data...
                </div>
              ) : analyticsData ? (
                <>
                  {/* Big Chart */}
                  <div className="h-80 w-full mb-8 bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/50">
                    <ResponsiveContainer width="100%" height="100%">
                      {expandedChart === 'revenue' ? (
                        <LineChart data={analyticsData.chart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `PKR ${v}`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} />
                          <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        </LineChart>
                      ) : expandedChart === 'signups' ? (
                        <BarChart data={analyticsData.chart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} cursor={{ fill: '#27272a' }} />
                          <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <BarChart data={analyticsData.chart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} cursor={{ fill: '#27272a' }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Raw Data Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Raw Data Overview</h3>
                    <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900 border-b border-zinc-800">
                            {expandedChart === 'revenue' && (
                              <>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Member Name</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Next Due Date</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase text-right">Amount (PKR)</th>
                              </>
                            )}
                            {expandedChart === 'signups' && (
                              <>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Join Date</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Member Name</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Phone</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Gender</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Plan</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Next Due Date</th>
                              </>
                            )}
                            {expandedChart === 'attendance' && (
                              <>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Time</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Member Name</th>
                                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Gender</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-sm">
                          {analyticsData.raw?.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-4 py-8 text-center text-zinc-500">No data found for this timeframe.</td>
                            </tr>
                          ) : (
                            analyticsData.raw?.map((row, i) => (
                              <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                                {expandedChart === 'revenue' && (
                                  <>
                                    <td className="px-4 py-3 text-zinc-300">{new Date(row.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 font-medium text-white">{row.members?.name || 'Unknown'}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.members?.next_due_date ? new Date(row.members.next_due_date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-red-400">PKR {parseFloat(row.amount).toFixed(2)}</td>
                                  </>
                                )}
                                {expandedChart === 'signups' && (
                                  <>
                                    <td className="px-4 py-3 text-zinc-300">{new Date(row.join_date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.phone || 'N/A'}</td>
                                    <td className="px-4 py-3 text-zinc-400 capitalize">{row.gender || 'N/A'}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.plans?.name || 'N/A'}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.next_due_date ? new Date(row.next_due_date).toLocaleDateString() : 'N/A'}</td>
                                  </>
                                )}
                                {expandedChart === 'attendance' && (
                                  <>
                                    <td className="px-4 py-3 text-zinc-300">{new Date(row.timestamp).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-zinc-300">{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 font-medium text-white">{row.members?.name || 'Unknown'}</td>
                                    <td className="px-4 py-3 text-zinc-400 capitalize">{row.members?.gender || 'N/A'}</td>
                                  </>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Selected Member Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-xl font-bold flex items-center gap-4">
                {selectedMember.image_url ? (
                  <img src={selectedMember.image_url} alt={selectedMember.name} className="w-12 h-12 rounded-xl object-cover border border-zinc-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <Users className="w-6 h-6 text-zinc-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    {selectedMember.name}
                    {selectedMember.gender && (
                      <div className={`w-2.5 h-2.5 rounded-full ${selectedMember.gender === 'female' ? 'bg-pink-500' : 'bg-red-500'}`} title={selectedMember.gender} />
                    )}
                  </div>
                  <div className="text-sm font-normal text-zinc-400 mt-0.5">
                    {selectedMember.phone} • {selectedMember.plans?.name || 'No Plan'}
                  </div>
                </div>
              </h2>
              <button onClick={() => setSelectedMember(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Charts Section */}
                <div className="space-y-6">
                  {/* Time of Day Chart */}
                  <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-md font-semibold mb-4 text-red-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Visits by Time of Day
                    </h3>
                    <div className="h-64 w-full">
                      {selectedMember.attendance && selectedMember.attendance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            (() => {
                              const hourCounts = {};
                              for(let i=0; i<24; i++) hourCounts[i] = 0;
                              selectedMember.attendance.forEach(a => {
                                hourCounts[new Date(a.timestamp).getHours()]++;
                              });
                              return Object.keys(hourCounts).map(h => ({ name: `${h}:00`, visits: hourCounts[h] }));
                            })()
                          }>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} cursor={{ fill: '#27272a' }} />
                            <Bar dataKey="visits" fill="#34d399" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">No attendance data</div>
                      )}
                    </div>
                  </div>

                  {/* Day of Week Chart */}
                  <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-md font-semibold mb-4 text-red-400 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Visits by Day of the Week
                    </h3>
                    <div className="h-64 w-full">
                      {selectedMember.attendance && selectedMember.attendance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            (() => {
                              const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
                              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              selectedMember.attendance.forEach(a => {
                                dayCounts[days[new Date(a.timestamp).getDay()]]++;
                              });
                              return Object.keys(dayCounts).map(d => ({ name: d, visits: dayCounts[d] }));
                            })()
                          }>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} cursor={{ fill: '#27272a' }} />
                            <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">No attendance data</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Raw Attendance Logs */}
                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 flex flex-col max-h-[calc(100vh-200px)]">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                    <h3 className="text-md font-semibold text-white">Recent Attendance Logs</h3>
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">
                      Total Visits: {selectedMember.attendance?.length || 0}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedMember.attendance && selectedMember.attendance.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                          <tr>
                            <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-sm">
                          {/* Sort attendance descending */}
                          {[...selectedMember.attendance]
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map((att, i) => (
                              <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="px-6 py-3 text-zinc-300">
                                  {new Date(att.timestamp).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-6 py-3 text-right text-zinc-400">
                                  {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-zinc-500">No recent visits recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
