'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import SignOutButton from '@/app/components/SignOutButton'
import AddMemberModal from '@/app/components/AddMemberModal'
import { addDays, differenceInDays } from 'date-fns'
import { Plus, Fingerprint, MessageCircle, Check, Loader2, AlertCircle } from 'lucide-react'

export default function StaffDashboard() {
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // ID of member being processed
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
    // Subscribe to members table changes for realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload) => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
          plans:plan_id (name, price, duration_days)
        `)
        .order('created_at', { ascending: false })
      
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
      return
    }

    // 1. Insert Member
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        name: memberData.name,
        phone: memberData.phone,
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
  }

  const handleMarkPaid = async (member) => {
    setActionLoading(member.id)
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    const today = new Date()
    const nextDueDate = addDays(today, member.plans.duration_days)

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
      await supabase
        .from('members')
        .update({ next_due_date: nextDueDate.toISOString().split('T')[0] })
        .eq('id', member.id)

      // Insert payment
      await supabase
        .from('payments')
        .insert({
          member_id: member.id,
          amount: member.plans.price,
          date: today.toISOString().split('T')[0]
        })
        
      await fetchData()
    } catch (error) {
      console.error('Error marking paid:', error)
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
      await supabase
        .from('members')
        .update({ is_enrolling: true })
        .eq('id', memberId)
    } catch (error) {
      console.error('Error starting enrollment:', error)
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-zinc-400">Daily Operations & Member Management</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5" />
              Add New Member
            </button>
            <SignOutButton />
          </div>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Fingerprint</th>
                  <th className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                      No members found. Add one to get started.
                    </td>
                  </tr>
                ) : members.map((member) => {
                  const statusColor = getStatusColor(member.next_due_date)
                  
                  return (
                    <tr key={member.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{member.name}</div>
                        <div className="text-sm text-zinc-500">{member.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-300">{member.plans?.name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                          {getStatusText(member.next_due_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {member.fingerprint_id ? (
                          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                            <Check className="w-4 h-4" /> Enrolled ({member.fingerprint_id})
                          </span>
                        ) : member.is_enrolling ? (
                          <span className="inline-flex items-center gap-2 text-sm text-yellow-400 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> Waiting for hardware...
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnrollScanner(member.id)}
                            disabled={actionLoading === member.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 disabled:opacity-50"
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            Enroll Scanner
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleMarkPaid(member)}
                            disabled={actionLoading === member.id}
                            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-colors border border-transparent hover:border-emerald-400/20 tooltip-trigger relative group"
                            title="Mark as Paid"
                          >
                            <DollarSignIcon className="w-5 h-5" />
                          </button>
                          
                          {member.phone && (
                            <a
                              href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=Hi ${member.name}, this is a reminder from GymFlow regarding your membership.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-400 hover:text-green-400 hover:bg-green-400/10 rounded-xl transition-colors border border-transparent hover:border-green-400/20 inline-block"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <AddMemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plans={plans}
        onAdd={handleAddMember}
      />
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
