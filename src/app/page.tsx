'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No session, redirect to login
        router.push('/login')
        return
      }

      // User is logged in, check their role
      const { data: emp } = await supabase
        .from('employees')
        .select('system_role, role')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!emp) {
        // No employee profile, redirect to admin (will show access denied message)
        router.push('/admin')
        return
      }

      // Redirect based on role (admin access for system_role='admin' OR role='Owner')
      const hasAdminAccess = emp.system_role === 'admin' || emp.role === 'Owner'
      
      if (hasAdminAccess) {
        router.push('/admin')
      } else {
        router.push('/worker')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}