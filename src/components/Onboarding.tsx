'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'
import { Coffee, Crown } from 'lucide-react'

export function Onboarding({ user }: { user: any }) {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreateOwnerAccount() {
    setIsCreating(true)
    
    // Create new organization for owner
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `${user.email?.split('@')[0]}'s Organization`
      })
      .select()
      .single()
    
    if (orgError || !org) {
      alert('Error creating organization: ' + orgError?.message)
      setIsCreating(false)
      return
    }

    // Create the Employee Record as owner/admin
    const employeeData = {
      id: user.id,
      name: user.email?.split('@')[0] || 'Owner',
      email: user.email,
      auth_user_id: user.id,
      organization_id: org.id,
      system_role: 'admin',
      role: 'Owner'
    }
    
    console.log('Creating owner account:', employeeData)
    
    const { error: empError } = await supabase
      .from('employees')
      .insert(employeeData)

    if (empError) {
      alert('Error creating account: ' + empError.message)
    } else {
      // Success! Redirect to admin portal
      router.push('/admin')
      window.location.reload()
    }
    setIsCreating(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            Welcome to Morning Brew Empire! <Coffee className="w-6 h-6" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Crown className="w-10 h-10 text-primary" />
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Set Up Your Business</h3>
              <p className="text-sm text-muted-foreground">
                We'll create your organization and give you admin access to manage:
              </p>
            </div>

            <ul className="text-left list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Business locations</li>
              <li>Employee roster and scheduling</li>
              <li>Weekly reports and analytics</li>
              <li>Availability management</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleCreateOwnerAccount} 
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? 'Creating Your Account...' : 'Create Business Account'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Workers will be added by you from the admin dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
