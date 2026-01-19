'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'
import { Coffee } from 'lucide-react'

export function Onboarding({ user }: { user: any }) {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  async function handleCreateAccount() {
    setIsCreating(true)
    
    // All new users are workers - automatically join the first organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()
    
    if (orgError || !orgs) {
      alert('No organization found. Please contact your admin to set up the organization first.')
      setIsCreating(false)
      return
    }

    // Create the Employee Record as worker
    const employeeData = {
      id: user.id,
      name: user.email?.split('@')[0] || 'Worker',
      email: user.email,
      auth_user_id: user.id,
      organization_id: orgs.id,
      system_role: 'worker',
      role: 'Employee'
    }
    
    console.log('Creating worker account:', employeeData)
    
    const { error: empError } = await supabase
      .from('employees')
      .insert(employeeData)

    if (empError) {
      alert('Error creating account: ' + empError.message)
    } else {
      // Success! Redirect to worker portal
      router.push('/worker')
      window.location.reload()
    }
    setIsCreating(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Welcome! <Coffee className="w-5 h-5" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Click below to create your worker account and join the team.
          </p>
          
          <Button 
            onClick={handleCreateAccount} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Creating Account...' : 'Join as Worker'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
