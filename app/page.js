import Link from 'next/link'
import { Dumbbell, Users, BarChart3, ScanFace, LogIn } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-hidden">
      {/* Premium Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-zinc-600/10 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center border-b border-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            GymFlow
          </span>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-all bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-zinc-700 shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Link>
      </header>

      {/* Main Hero and Options Portal */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center flex-1">
        <div className="text-center max-w-2xl mb-16">
          <span className="px-3 py-1 text-xs font-semibold text-red-400 bg-red-950/50 border border-red-900/30 rounded-full uppercase tracking-wider">
            Gym Management Platform
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mt-6 leading-tight">
            Streamline Your Gym Operations
          </h1>
          <p className="text-lg text-zinc-400 mt-4 leading-relaxed">
            Manage members, track attendance with biometric integrations, monitor live check-ins, and analyze revenue in one beautiful, integrated dashboard.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Card 1: Admin Dashboard */}
          <Link 
            href="/admin" 
            className="group p-8 bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 hover:border-red-500/30 rounded-3xl transition-all duration-300 flex flex-col justify-between h-64 hover:-translate-y-1 shadow-lg shadow-zinc-950"
          >
            <div>
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 group-hover:border-red-500/40 rounded-2xl flex items-center justify-center transition-colors mb-6">
                <BarChart3 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors">Admin Dashboard</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Analyze revenue growth, view busy hours, and track registration statistics.
              </p>
            </div>
            <div className="text-xs font-semibold text-red-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-4">
              Enter Admin Portal →
            </div>
          </Link>

          {/* Card 2: Staff Operations */}
          <Link 
            href="/staff" 
            className="group p-8 bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 hover:border-zinc-500/30 rounded-3xl transition-all duration-300 flex flex-col justify-between h-64 hover:-translate-y-1 shadow-lg shadow-zinc-950"
          >
            <div>
              <div className="w-12 h-12 bg-zinc-500/10 border border-zinc-500/20 group-hover:bg-zinc-500/20 group-hover:border-zinc-500/40 rounded-2xl flex items-center justify-center transition-colors mb-6">
                <Users className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-zinc-400 transition-colors">Staff Dashboard</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Check member statuses, mark dues as paid, and trigger fingerprint scanner enrollments.
              </p>
            </div>
            <div className="text-xs font-semibold text-zinc-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-4">
              Enter Staff Portal →
            </div>
          </Link>

          {/* Card 3: Live Scan Monitor */}
          <Link 
            href="/attendance-monitor" 
            className="group p-8 bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 hover:border-zinc-500/30 rounded-3xl transition-all duration-300 flex flex-col justify-between h-64 hover:-translate-y-1 shadow-lg shadow-zinc-950"
          >
            <div>
              <div className="w-12 h-12 bg-zinc-500/10 border border-zinc-500/20 group-hover:bg-zinc-500/20 group-hover:border-zinc-500/40 rounded-2xl flex items-center justify-center transition-colors mb-6">
                <ScanFace className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-zinc-400 transition-colors">Attendance Monitor</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Launch the dedicated fullscreen display that flashes member entry logs in real-time.
              </p>
            </div>
            <div className="text-xs font-semibold text-zinc-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-4">
              Launch Live Monitor →
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center border-t border-zinc-900/50 text-xs text-zinc-600 gap-4">
        <div>
          © {new Date().getFullYear()} GymFlow. All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link href="/schema.sql" className="hover:text-zinc-400 transition-colors">Database Schema</Link>
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Supabase Backend</a>
        </div>
      </footer>
    </div>
  )
}
