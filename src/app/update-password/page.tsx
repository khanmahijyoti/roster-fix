'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Check for session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      
      // If no session, they shouldn't be here - send to login
      if (!session) {
        router.push('/login')
      }
    })
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

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    
    // Update the user's password
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      alert('Error updating password: ' + error.message)
      setLoading(false)
    } else {
      alert('Password updated successfully!')
      // Redirect to appropriate portal
      if (session?.user?.id) {
        await checkRoleAndRedirect(session.user.id)
      }
    }
  }

  if (!session) {
    return <div className="p-6 sm:p-10 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleUpdatePassword}
            disabled={loading || !password || !confirmPassword}
            className="w-full"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

}
