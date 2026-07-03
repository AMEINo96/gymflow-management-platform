'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import SignOutButton from '@/app/components/SignOutButton'
import AddMemberModal from '@/app/components/AddMemberModal'
import { addDays, differenceInDays } from 'date-fns'
import { Plus, Fingerprint, MessageCircle, Check, Loader2, AlertCircle, Trash2, Activity } from 'lucide-react'

export default function StaffDashboard() {
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [recentScans, setRecentScans] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // ID of member being processed
  const [enrollModalMember, setEnrollModalMember] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
    // Subscribe to members and attendance table changes for realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload) => {
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Handle 30s timeout for scanner enrollment
  useEffect(() => {
    let timeoutId
    if (enrollModalMember) {
      timeoutId = setTimeout(() => {
        const memberId = enrollModalMember.id
        setEnrollModalMember(null)
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_enrolling: false } : m))
        supabase.from('members').update({ is_enrolling: false }).eq('id', memberId).then()
        alert("Hardware Scanner Enrollment Timed Out (30s). Please try again.")
      }, 30000)
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enrollModalMember])

  // Automatically close modal on success (when realtime update detects fingerprint_id)
  useEffect(() => {
    if (enrollModalMember) {
      const updatedMember = members.find(m => m.id === enrollModalMember.id)
      if (updatedMember && updatedMember.fingerprint_id) {
        setEnrollModalMember(null)
        alert('Fingerprint enrolled successfully!')
      }
    }
  }, [members, enrollModalMember])

  const fetchData = async () => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    
    if (isDemo) {
      // Load plans
      const localPlans = [
        { id: 'p1', name: 'Basic', price: 30, duration_days: 30 },
        { id: 'p2', name: 'Advance', price: 75, duration_days: 90 },
        { id: 'p3', name: 'Super', price: 250, duration_days: 365 }
      ]
      setPlans(localPlans)

      // Load members from localStorage or defaults
      let storedMembers = localStorage.getItem('gymflow_members')
      if (!storedMembers) {
        const defaultMembers = [
          { id: 'm1', name: 'Arnold Schwarzenegger', phone: '+1234567890', join_date: '2026-01-01', next_due_date: '2026-08-01', fingerprint_id: 1, plan_id: 'p1', plans: { name: 'Basic', price: 30, duration_days: 30 } },
          { id: 'm2', name: 'Lou Ferrigno', phone: '+1987654321', join_date: '2026-02-01', next_due_date: '2026-07-05', fingerprint_id: null, plan_id: 'p2', plans: { name: 'Advance', price: 75, duration_days: 90 } },
          { id: 'm3', name: 'Ronnie Coleman', phone: '+1122334455', join_date: '2026-03-01', next_due_date: '2026-06-30', fingerprint_id: 3, plan_id: 'p3', plans: { name: 'Super', price: 250, duration_days: 365 } }
        ]
        localStorage.setItem('gymflow_members', JSON.stringify(defaultMembers))
        storedMembers = JSON.stringify(defaultMembers)
      }
      setMembers(JSON.parse(storedMembers))
      setLoading(false)
      return
    }

    try {
      const { data: plansData } = await supabase.from('plans').select('*')
      setPlans(plansData || [])

      const { data: membersData } = await supabase
        .from('members')
        .select(`
          *,
          plans:plan_id (name, price, duration_days),
          attendance (timestamp)
        `)
        .order('created_at', { ascending: false })
      
      if (membersData) {
        const overdue90Days = membersData.filter(m => !m.deleted_at && differenceInDays(new Date(m.next_due_date), new Date()) < -90)
        for (const m of overdue90Days) {
          await supabase.from('members').update({ deleted_at: new Date().toISOString() }).eq('id', m.id)
          m.deleted_at = new Date().toISOString()
        }

        const allScans = membersData.flatMap(m => 
          (m.attendance || []).map(a => ({
            memberId: m.id,
            memberName: m.name,
            timestamp: a.timestamp
          }))
        )
        allScans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        setRecentScans(allScans.slice(0, 10))
      }

      setMembers(membersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (memberData) => {
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    const today = new Date()
    const nextDueDate = addDays(today, memberData.plan.duration_days)

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_members') || '[]')
      const newMem = {
        id: 'm_' + Math.random().toString(36).substr(2, 9),
        name: memberData.name,
        phone: memberData.phone,
        gender: memberData.gender,
        plan_id: memberData.plan_id,
        join_date: today.toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        fingerprint_id: memberData.fingerprint_id || null,
        plans: {
          name: memberData.plan.name,
          price: memberData.plan.price,
          duration_days: memberData.plan.duration_days
        }
      }
      const updated = [newMem, ...stored]
      localStorage.setItem('gymflow_members', JSON.stringify(updated))
      setMembers(updated)
      return newMem
    }

    // 1. Insert Member
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        name: memberData.name,
        phone: memberData.phone,
        gender: memberData.gender,
        plan_id: memberData.plan_id,
        join_date: today.toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        fingerprint_id: memberData.fingerprint_id || null,
      })
      .select()
      .single()

    if (memberError) throw memberError

    // 2. Insert Initial Payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        member_id: newMember.id,
        amount: memberData.plan.price,
        date: today.toISOString().split('T')[0]
      })

    if (paymentError) throw paymentError
    
    await fetchData()
    return newMember
  }

  const handleMarkPaid = async (member) => {
    setActionLoading(member.id)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    const today = new Date()
    
    // Fallback to 30 days if plan details are missing
    const durationDays = member.plans?.duration_days || 30
    const price = member.plans?.price || 0
    const nextDueDate = addDays(today, durationDays)

    if (isDemo) {
      const stored = JSON.parse(localStorage.getItem('gymflow_members') || '[]')
      const updated = stored.map(m => {
        if (m.id === member.id) {
          return { ...m, next_due_date: nextDueDate.toISOString().split('T')[0] }
        }
        return m
      })
      localStorage.setItem('gymflow_members', JSON.stringify(updated))
      setMembers(updated)
      setActionLoading(null)
      return
    }

    try {
      // Update member
      const { error: updateError } = await supabase
        .from('members')
        .update({ next_due_date: nextDueDate.toISOString().split('T')[0] })
        .eq('id', member.id)
        
      if (updateError) throw updateError

      // Insert payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: member.id,
          amount: price,
          date: today.toISOString().split('T')[0]
        })
        
      if (paymentError) throw paymentError
        
      await fetchData()
    } catch (error) {
      console.error('Error marking paid:', error)
      alert(`Failed to mark as paid: ${error.message || 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEnrollScanner = async (memberId) => {
    setActionLoading(memberId)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    if (isDemo) {
      alert("Hardware scanner not detected. Please ensure the ZK Teco device is connected via USB or Network to enroll fingerprints.")
      setActionLoading(null)
      return
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_enrolling: true })
        .eq('id', memberId)
        
      if (error) throw error

      // Optimistically update local state so UI reacts instantly
      setMembers(members.map(m => m.id === memberId ? { ...m, is_enrolling: true } : m))
      setEnrollModalMember(members.find(m => m.id === memberId))
      
    } catch (error) {
      console.error('Error starting enrollment:', error)
      alert("Failed to start enrollment. Please check database permissions.")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (nextDueDate) => {
    const daysLeft = differenceInDays(new Date(nextDueDate), new Date())
    if (daysLeft < 0) return 'text-red-400 bg-red-400/10 border-red-400/20'
    if (daysLeft <= 3) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  }

  const getStatusText = (nextDueDate) => {
    const daysLeft = differenceInDays(new Date(nextDueDate), new Date())
    if (daysLeft < 0) return 'Overdue'
    if (daysLeft <= 3) return `Due in ${daysLeft} days`
    return 'Paid'
  }

  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getFilteredMembers = () => {
    return members.filter(member => {
      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = member.name.toLowerCase().includes(query)
        const matchesPhone = member.phone && member.phone.includes(query)
        if (!matchesName && !matchesPhone) return false
      }

      // Apply category filter
      if (filter === 'deleted') return member.deleted_at != null
      if (member.deleted_at) return false

      if (filter === 'all') return true
      
      const daysLeft = differenceInDays(new Date(member.next_due_date), new Date())
      
      if (filter === 'overdue') return daysLeft < 0
      if (filter === 'due_soon') return daysLeft >= 0 && daysLeft <= 3
      if (filter === 'paid') return daysLeft > 3
      return true
    })
  }

  const filteredMembers = getFilteredMembers()

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-zinc-400">Daily Operations & Member Management</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Member
            </button>
            <SignOutButton />
          </div>
        </header>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search members by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="flex overflow-x-auto gap-2 no-scrollbar md:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${filter === 'all' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'}`}
            >
              All Members
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${filter === 'paid' ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 text-emerald-500 hover:bg-zinc-800 border border-zinc-800'}`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilter('due_soon')}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${filter === 'due_soon' ? 'bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-zinc-900 text-yellow-500 hover:bg-zinc-800 border border-zinc-800'}`}
            >
              Due Soon
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${filter === 'overdue' ? 'bg-red-500 text-red-950 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-900 text-red-500 hover:bg-zinc-800 border border-zinc-800'}`}
            >
              Overdue
            </button>
            <button
              onClick={() => setFilter('deleted')}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${filter === 'deleted' ? 'bg-zinc-700 text-white shadow-[0_0_15px_rgba(63,63,70,0.5)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white border border-zinc-800'}`}
            >
              Recently Deleted
            </button>
          </div>
        </div>

        {/* Recent Scans Feed */}
        {recentScans.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Live Scans
            </h3>
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
              {recentScans.map((scan, i) => {
                const date = new Date(scan.timestamp)
                const isToday = date.toDateString() === new Date().toDateString()
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const dayStr = isToday ? 'Today' : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                
                return (
                  <div key={i} className="flex-none flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-4 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <div className="text-sm font-medium text-white">{scan.memberName}</div>
                      <div className="text-xs text-zinc-500">{dayStr} at {timeStr}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-sm">
              No members found in this category.
            </div>
          ) : filteredMembers.map((member) => {
            const statusColor = getStatusColor(member.next_due_date)
            const thisMonthVisits = (member.attendance || []).filter(a => {
              const date = new Date(a.timestamp)
              const now = new Date()
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            }).length
            
            return (
              <div key={member.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col backdrop-blur-sm hover:bg-zinc-800/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-bold text-white">{member.name}</div>
                    <div className="text-sm text-zinc-400">{member.phone}</div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                    {getStatusText(member.next_due_date)}
                  </span>
                </div>

                <div className="text-sm text-zinc-400 mb-6 flex-grow space-y-1">
                  <div>Plan: <strong className="text-zinc-200">{member.plans?.name || 'Unknown'}</strong></div>
                  <div>Visits this Month: <strong className="text-zinc-200">{thisMonthVisits}</strong></div>
                </div>

                <div className="space-y-3 mt-auto">
                  {/* Fingerprint Status / Action */}
                  <div className="bg-zinc-950/50 rounded-2xl p-2 border border-zinc-800/50">
                    {member.fingerprint_id ? (
                      <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-emerald-400">
                        <Check className="w-5 h-5" /> Enrolled (ID: {member.fingerprint_id})
                      </div>
                    ) : member.is_enrolling ? (
                      <button
                        onClick={async () => {
                          setMembers(members.map(m => m.id === member.id ? { ...m, is_enrolling: false } : m))
                          if (enrollModalMember?.id === member.id) setEnrollModalMember(null)
                          await supabase.from('members').update({ is_enrolling: false }).eq('id', member.id)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-xl transition-colors border border-yellow-400/20"
                      >
                        <Loader2 className="w-5 h-5 animate-spin" /> Cancel Waiting...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollScanner(member.id)}
                        disabled={actionLoading === member.id}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      >
                        <Fingerprint className="w-5 h-5" />
                        Enroll Fingerprint
                      </button>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2">
                    {member.deleted_at ? (
                      <>
                        <button
                          onClick={async () => {
                            if (!confirm('Recover this member?')) return
                            setActionLoading(member.id)
                            await supabase.from('members').update({ deleted_at: null }).eq('id', member.id)
                            await fetchData()
                            setActionLoading(null)
                          }}
                          disabled={actionLoading === member.id}
                          className="flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-colors border text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/20 disabled:opacity-50"
                        >
                          {actionLoading === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Recover'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Permanently delete this member? This cannot be undone.')) return
                            setActionLoading(member.id)
                            await supabase.from('members').delete().eq('id', member.id)
                            await fetchData()
                            setActionLoading(null)
                          }}
                          disabled={actionLoading === member.id}
                          className="flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-colors border text-red-400 bg-red-400/10 hover:bg-red-400/20 border-red-400/20 disabled:opacity-50"
                        >
                          {actionLoading === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete Forever'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMarkPaid(member)}
                          disabled={actionLoading === member.id}
                          className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                            differenceInDays(new Date(member.next_due_date), new Date()) > 3
                              ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/20'
                              : 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border-zinc-700'
                          }`}
                        >
                          {actionLoading === member.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing...
                            </>
                          ) : differenceInDays(new Date(member.next_due_date), new Date()) > 3 ? (
                            <>
                              <Check className="w-5 h-5" />
                              Up to Date
                            </>
                          ) : (
                            <>
                              <DollarSignIcon className="w-5 h-5" />
                              Mark Paid
                            </>
                          )}
                        </button>
                        
                        {member.phone && (
                          <a
                            href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=Hi ${member.name}, this is a reminder from GymFlow regarding your membership.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-none flex items-center justify-center p-3 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors border border-emerald-400/20"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </a>
                        )}

                        <button
                          onClick={async () => {
                            if (!confirm('Move to Recently Deleted?')) return
                            setActionLoading(member.id)
                            await supabase.from('members').update({ deleted_at: new Date().toISOString() }).eq('id', member.id)
                            await fetchData()
                            setActionLoading(null)
                          }}
                          disabled={actionLoading === member.id}
                          className="flex-none flex items-center justify-center p-3 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-xl transition-colors border border-red-400/20 disabled:opacity-50"
                        >
                          {actionLoading === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <AddMemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plans={plans}
        onAdd={handleAddMember}
      />

      {/* Enrollment Scanner Modal */}
      {enrollModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            {/* Background scanner line effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 blur-[2px] animate-[scan_2s_ease-in-out_infinite]" />
            
            <div className="w-20 h-20 bg-zinc-950 border border-emerald-500/30 rounded-2xl mx-auto mb-6 flex items-center justify-center relative shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Fingerprint className="w-10 h-10 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-ping opacity-20" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Hardware Scanner Mode</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Listening for ZK Teco device...<br/>
              Please ask <strong className="text-white">{enrollModalMember?.name}</strong> to place their finger on the scanner now.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 py-3 px-4 rounded-xl border border-emerald-400/20 mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for biometric data...
            </div>
            
            <button
              onClick={() => {
                setEnrollModalMember(null)
                // Also reset is_enrolling in local state so UI updates
                setMembers(members.map(m => m.id === enrollModalMember.id ? { ...m, is_enrolling: false } : m))
                // Reset in DB just in case they canceled
                supabase.from('members').update({ is_enrolling: false }).eq('id', enrollModalMember.id).then()
              }}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors border border-zinc-700"
            >
              Cancel Enrollment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DollarSignIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  )
}
