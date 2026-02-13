'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/browser'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        window.location.href = '/'
      }
    }

    check()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        window.location.href = '/'
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : 'http://localhost:3000/auth/callback'

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Smart Bookmark App
        </h1>
        <p className="text-gray-600">
          Manage your bookmarks with real-time sync
        </p>
        <button
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          onClick={signIn}
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
