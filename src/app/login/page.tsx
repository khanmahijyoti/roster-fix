'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<any>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  useEffect(() => {
    // Check if we're in password reset mode
    const resetMode = searchParams.get('reset') === 'true'
    setShowPasswordReset(resetMode)

    // 1. Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // Only redirect if NOT in reset mode
      if (session && !resetMode) checkRoleAndRedirect(session.user.id)
    })

    // 2. Listen for login events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Redirect after password update
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true)
      }
      // Only redirect if NOT in reset mode
      if (session && !resetMode && event !== 'PASSWORD_RECOVERY') {
        checkRoleAndRedirect(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [searchParams])

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

  // Show password reset form if in reset mode (regardless of session)
  if (showPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-card p-6 sm:p-8 rounded-xl shadow-lg border border-border">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-6 text-card-foreground">Reset Password</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            view="update_password"
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    )
  }

  // Show login form if no session
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-card p-6 sm:p-8 rounded-xl shadow-lg border border-border">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-6 text-card-foreground">Morning Brew Login</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            view="sign_in"
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    )
  }
  
  return <div className="p-6 sm:p-10 text-center">Redirecting...</div>
}
