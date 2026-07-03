'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { Users, DollarSign, UserPlus, Activity, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function AdminDashboardClient({ 
  totalMonthlyRevenue, 
  activeMembersCount, 
  newSignupsCount, 
  revenueData, 
  busyHoursData 
}) {
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
  }, [])

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
      const { data } = await supabase
        .from('members')
        .select(`
          *,
          plans:plan_id (name)
        `)
        .order('created_at', { ascending: false })
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Are you sure you want to delete this member?')) return
    
    setDeletingId(memberId)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    
    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_members') || '[]')
      const updated = stored.filter(m => m.id !== memberId)
      localStorage.setItem('gymflow_members', JSON.stringify(updated))
      setMembers(updated)
      setDeletingId(null)
      return
    }

    try {
      await supabase
        .from('members')
        .delete()
        .eq('id', memberId)
      
      await fetchMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Failed to delete member')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Monthly Revenue</h3>
          </div>
          <p className="text-4xl font-bold text-white">${totalMonthlyRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Active Members</h3>
          </div>
          <p className="text-4xl font-bold text-white">{activeMembersCount}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Revenue Growth (6 Months)
          </h3>
          <div className="h-80 w-full">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#34d399' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Busy Hours
          </h3>
          <div className="h-80 w-full">
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
                  <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No attendance data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Member Management */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Member Management
          </h3>
          <p className="text-sm text-zinc-400 mt-1">View and remove gym members.</p>
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
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                    No members found.
                  </td>
                </tr>
              ) : members.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {member.phone}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-300">{member.plans?.name || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      disabled={deletingId === member.id}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50 inline-block"
                      title="Delete Member"
                    >
                      {deletingId === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
