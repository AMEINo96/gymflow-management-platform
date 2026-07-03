'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    document.cookie = 'gymflow_demo_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-800 rounded-lg border border-zinc-800"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  )
}
