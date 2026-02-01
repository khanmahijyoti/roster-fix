'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      console.log('🔐 Update Password Page - Checking session...')
      
      // Parse hash fragment for token_hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const tokenHash = hashParams.get('token_hash')
      const type = hashParams.get('type')
      
      console.log('Hash params:', { tokenHash: tokenHash?.substring(0, 10), type })
      
      if (tokenHash && type === 'recovery') {
        console.log('🔐 Token hash found, verifying OTP...')
        
        // Use verifyOtp for PKCE flow
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        
        if (error) {
          console.error('❌ Error verifying OTP:', error)
          setError('Failed to verify reset link. Please try requesting a new password reset link.')
        } else if (data.session) {
          console.log('✅ Session established successfully')
          setIsReady(true)
          // Clean up URL
          window.history.replaceState(null, '', '/update-password')
        }
      } else {
        // Check if there's already a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          console.log('✅ Session already exists')
          setIsReady(true)
        } else {
          console.log('❌ No session and no valid token found')
          setError('No valid session found. Please try requesting a new password reset link.')
        }
      }
    }
    
    handlePasswordRecovery()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      alert('Error updating password: ' + error.message)
      setLoading(false)
    } else {
      alert('Password updated successfully! Please log in with your new password.')
      
      // Sign out the user
      await supabase.auth.signOut()
      
      // Redirect to login
      router.push('/login')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/forgot-password')} className="w-full">
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium block">
                New Password
              </label>
              <Input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
