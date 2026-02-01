'use client'
import { createClient } from '@/lib/supabase-browser'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkRoleAndRedirect(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkRoleAndRedirect(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkRoleAndRedirect(userId: string) {
    const { data: emp } = await supabase
      .from('employees')
      .select('system_role')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (!emp) {
      router.push('/admin') 
      return
    }

    if (emp.system_role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/worker')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">Morning Brew Login</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
          <div className="text-center mt-4">
            <Link href="/forgot-password" className="text-sm text-slate-500 hover:text-slate-800 underline">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  return <div className="p-6 sm:p-10 text-center">Redirecting...</div>
}
