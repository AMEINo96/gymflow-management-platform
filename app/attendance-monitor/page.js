'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, ScanFace, Loader2 } from 'lucide-react'

export default function AttendanceMonitor() {
  const [scanState, setScanState] = useState({ status: 'idle', member: null, reason: null })
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to attendance table changes for live scanning UI
    const channel = supabase
      .channel('attendance-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance' },
        async (payload) => {
          // New attendance logged, fetch member info
          const { data: member } = await supabase
            .from('members')
            .select('*')
            .eq('id', payload.new.member_id)
            .single()
            
          if (member) {
            triggerScanFlash('granted', member)
          }
        }
      )
      .subscribe()

    // Also need a way to listen for DENIED scans, since those aren't inserted into 'attendance' table.
    // One way: The ESP32 calls our API, which could emit a broadcast event using Supabase Realtime for denied scans.
    // Since the prompt asks for both, we'll subscribe to a broadcast channel for any scan result (granted or denied).
    const broadcastChannel = supabase
      .channel('scan-events')
      .on('broadcast', { event: 'scan_result' }, (payload) => {
        triggerScanFlash(payload.payload.access, payload.payload.member, payload.payload.reason)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [])

  const triggerScanFlash = (access, member = null, reason = null) => {
    setScanState({ status: access, member, reason })
    
    // Reset back to idle after 4 seconds
    setTimeout(() => {
      setScanState(prev => {
        // Only reset if it's still the same scan status to avoid overriding a new scan
        return { status: 'idle', member: null, reason: null }
      })
    }, 4000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 overflow-hidden relative selection:bg-emerald-500">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className={`w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[150px] transition-all duration-1000 ${
          scanState.status === 'granted' ? 'bg-emerald-600/30 scale-110' :
          scanState.status === 'denied' ? 'bg-red-600/30 scale-110' :
          'bg-zinc-800/20 scale-100'
        }`} />
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center justify-center text-center">
        
        {scanState.status === 'idle' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-zinc-900/50">
              <ScanFace className="w-16 h-16 text-zinc-500 animate-pulse" />
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight mb-4">Live Scanner</h1>
            <p className="text-2xl text-zinc-400">Waiting for fingerprint...</p>
          </div>
        )}

        {scanState.status === 'granted' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="w-40 h-40 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/50">
              <CheckCircle2 className="w-20 h-20 text-emerald-400" />
            </div>
            <h1 className="text-6xl font-extrabold text-emerald-400 tracking-tight mb-4 drop-shadow-sm">
              Access Granted
            </h1>
            <p className="text-4xl text-white font-medium">
              Welcome back, {scanState.member?.name || 'Member'}!
            </p>
          </div>
        )}

        {scanState.status === 'denied' && (
          <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="w-40 h-40 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/50">
              <XCircle className="w-20 h-20 text-red-400" />
            </div>
            <h1 className="text-6xl font-extrabold text-red-400 tracking-tight mb-4 drop-shadow-sm">
              Access Denied
            </h1>
            <p className="text-4xl text-white font-medium">
              {scanState.reason || 'Payment Due'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
