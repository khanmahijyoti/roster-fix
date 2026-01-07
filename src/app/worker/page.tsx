'use client'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function WorkerPortal() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string>('')

  useEffect(() => {
    async function getMe() {
      // 1. Get the logged-in user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login') // Kick them out if not logged in
        return
      }

      // 2. Find their Employee ID and Name
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single()
      
      if (emp) {
        setEmployeeId(emp.id)
        setEmployeeName(emp.name)
      }
    }
    getMe()
  }, [])

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading Profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                👷
              </div>
              <div>
                <h1 className="text-xl font-bold text-card-foreground">Worker Portal</h1>
                <p className="text-sm text-muted-foreground">Set your weekly availability</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-card-foreground">{employeeName}</div>
                <div className="text-xs text-muted-foreground">Worker</div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* AVAILABILITY GRID */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <AvailabilityGrid employeeId={employeeId} />
        </div>

        {/* FOOTER INFO */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-semibold mb-1">💡 Tips:</p>
          <ul className="space-y-1 text-xs ml-4 list-disc">
            <li>Click cells to toggle your availability</li>
            <li>Green = Available, Red = Unavailable</li>
            <li>Changes save automatically</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
