'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Fingerprint, Check } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function AddMemberModal({ isOpen, onClose, plans, onAdd }) {
  const [step, setStep] = useState('details') // 'details' | 'prompt-biometric' | 'enrolling' | 'success'
  const [newMember, setNewMember] = useState(null)
  
  // Details form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [planId, setPlanId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Biometric state
  const [enrolledId, setEnrolledId] = useState(null)

  const supabase = createClient()

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('details')
      setName('')
      setPhone('')
      setPlanId('')
      setNewMember(null)
      setEnrolledId(null)
      setError(null)
    }
  }, [isOpen])

  // Listen for realtime fingerprint_id updates in real mode
  useEffect(() => {
    if (step !== 'enrolling' || !newMember) return
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')
    if (isDemo) return // Handled via mock button

    // Subscribe to changes on the members table for this specific member
    const channel = supabase
      .channel(`member-${newMember.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'members', filter: `id=eq.${newMember.id}` },
        (payload) => {
          if (payload.new && payload.new.fingerprint_id) {
            setEnrolledId(payload.new.fingerprint_id)
            setStep('success')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [step, newMember])

  if (!isOpen) return null

  const handleSubmitDetails = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!planId) {
      setError('Please select a plan')
      setLoading(false)
      return
    }

    const selectedPlan = plans.find(p => p.id === planId)
    
    try {
      // Step 1: Save details to database/localStorage
      const member = await onAdd({
        name,
        phone,
        plan_id: planId,
        plan: selectedPlan,
        fingerprint_id: null // No biometric yet
      })
      
      setNewMember(member)
      setStep('prompt-biometric')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartBiometric = async () => {
    setStep('enrolling')
    const isDemo = typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role')

    if (isDemo) {
      // Demo: we just wait or let them click the simulator button
      return
    }

    try {
      // Real DB: Set is_enrolling = true so ESP32 knows to register
      await supabase
        .from('members')
        .update({ is_enrolling: true })
        .eq('id', newMember.id)
    } catch (err) {
      console.error('Error starting biometric enrollment:', err)
      setError('Could not connect to biometric system.')
      setStep('prompt-biometric')
    }
  }

  const handleSimulateScan = () => {
    const mockFingerprintId = Math.floor(Math.random() * 100) + 4
    
    // Update localStorage
    const stored = JSON.parse(localStorage.getItem('gymflow_members') || '[]')
    const updated = stored.map(m => {
      if (m.id === newMember.id) {
        return { ...m, fingerprint_id: mockFingerprintId, is_enrolling: false }
      }
      return m
    })
    localStorage.setItem('gymflow_members', JSON.stringify(updated))
    
    setEnrolledId(mockFingerprintId)
    setStep('success')
  }

  const handleFinish = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white">Add New Member</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {step === 'details' && (
          <form onSubmit={handleSubmitDetails} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 text-white"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 text-white"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Gym Plan</label>
              <select
                required
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white appearance-none"
              >
                <option value="" disabled>Select a plan...</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price} ({plan.duration_days} days)
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Onboarding'}
              </button>
            </div>
          </form>
        )}

        {step === 'prompt-biometric' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
              <Fingerprint className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Enroll Biometric ID Now?</h3>
              <p className="text-sm text-zinc-400 mt-2">
                Would you like to enroll this member's fingerprint scan on the biometric device now?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleFinish}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
              >
                Skip & Save
              </button>
              <button
                onClick={handleStartBiometric}
                className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Yes, Enroll
              </button>
            </div>
          </div>
        )}

        {step === 'enrolling' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto text-yellow-500 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Listening for Biometric Scan</h3>
              <p className="text-sm text-zinc-400 mt-2">
                Please place the member's finger on the hardware scanner.
              </p>
            </div>
            
            {/* Show simulation button in Demo Mode */}
            {typeof document !== 'undefined' && document.cookie.includes('gymflow_demo_role') && (
              <button
                onClick={handleSimulateScan}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-medium rounded-xl border border-zinc-700 transition-all text-sm"
              >
                Simulate Scan on Hardware
              </button>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Biometric Enrolled!</h3>
              <p className="text-sm text-emerald-400 font-medium mt-1">
                Linked Fingerprint ID: {enrolledId}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                The member's profile is fully active and ready for check-in.
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Finish & Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
