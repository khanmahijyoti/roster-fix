'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // 1. Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkRoleAndRedirect(session.user.id)
    })

    // 2. Listen for login events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkRoleAndRedirect(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 3. Figure out where to send them
  async function checkRoleAndRedirect(userId: string) {
    const { data: emp } = await supabase
      .from('employees')
      .select('system_role')
      .eq('auth_user_id', userId)
      .maybeSingle()

    // If no employee record found, they are a new user.
    // Send them to Admin page so the Onboarding component can catch them.
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-card p-6 sm:p-8 rounded-xl shadow-lg border border-border">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-6 text-card-foreground">Morning Brew Login</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]} // We stick to Email/Password for now
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    )
  }
  
  return <div className="p-6 sm:p-10 text-center">Redirecting...</div>
}
