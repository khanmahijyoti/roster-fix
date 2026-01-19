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

  async function handleCreateEmpire() {
    setIsCreating(true)
    
    // Check if this is the admin account
    const isAdmin = user.email === 'khanmahijyoti@gmail.com'
    console.log('Creating account for:', user.email, 'isAdmin:', isAdmin)
    
    let organizationId: string
    
    if (isAdmin) {
      // Admin: Create new organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: 'My New Empire' })
        .select()
        .single()

      if (orgError) {
        alert('Error creating org: ' + orgError.message)
        setIsCreating(false)
        return
      }
      organizationId = org.id
    } else {
      // Worker: Automatically join the first/main organization
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()
      
      if (orgError || !orgs) {
        alert('No organization found. Please contact your admin.')
        setIsCreating(false)
        return
      }
      
      organizationId = orgs.id
    }

    // 2. Create the Employee Record
    const employeeData = {
      id: user.id, // Link to Auth ID
      name: user.email?.split('@')[0] || (isAdmin ? 'Admin' : 'Worker'),
      email: user.email,
      auth_user_id: user.id,
      organization_id: organizationId,
      system_role: isAdmin ? 'admin' : 'worker',
      role: isAdmin ? 'Owner' : 'Employee'
    }
    
    console.log('Inserting employee with data:', employeeData)
    
    const { error: empError } = await supabase
      .from('employees')
      .insert(employeeData)

    if (empError) {
      alert('Error creating employee: ' + empError.message)
    } else {
      // Success! Redirect based on role
      if (isAdmin) {
        router.push('/admin')
      } else {
        router.push('/worker')
      }
      window.location.reload()
    }
    setIsCreating(false)
  }

  const isAdmin = user.email === 'khanmahijyoti@gmail.com'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Welcome to Morning Brew! <Coffee className="w-5 h-5" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Set up your organization to get started.'
              : 'Click below to join as a worker. Your admin will assign you to shifts.'}
          </p>
          
          <Button 
            onClick={handleCreateEmpire} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Setting up...' : (isAdmin ? 'Create Organization' : 'Join as Worker')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
