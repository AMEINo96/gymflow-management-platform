'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function AddMemberModal({ isOpen, onClose, plans, onAdd }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [planId, setPlanId] = useState('')
  const [fingerprintId, setFingerprintId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
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
      await onAdd({
        name,
        phone,
        plan_id: planId,
        plan: selectedPlan,
        fingerprint_id: fingerprintId ? parseInt(fingerprintId) : null
      })
      
      setName('')
      setPhone('')
      setPlanId('')
      setFingerprintId('')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Biometric Fingerprint ID (Optional)</label>
            <input
              type="number"
              value={fingerprintId}
              onChange={(e) => setFingerprintId(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 text-white"
              placeholder="e.g. 104"
              min="1"
            />
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
      </div>
    </div>
  )
}
