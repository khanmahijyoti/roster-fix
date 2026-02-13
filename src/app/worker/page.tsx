'use client'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HardHat, Lightbulb, Calendar, Clock } from 'lucide-react'

export default function WorkerPortal() {
  const router = useRouter()
  const supabase = createClient()
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

      // 2. Find their Employee ID, Name, and Role
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name, system_role, role')
        .eq('auth_user_id', user.id)
        .single()
      
      if (emp) {
        // Check if user has admin access (system_role = 'admin' OR role = 'Owner')
        const hasAdminAccess = emp.system_role === 'admin' || emp.role === 'Owner'
        
        if (hasAdminAccess) {
          console.log('User has admin access, redirecting to admin panel')
          router.push('/admin')
          return
        }
        
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
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        
        {/* HEADER */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0">
                <HardHat className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-card-foreground">Worker Portal</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Set your weekly availability</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="text-right flex-1 sm:flex-initial">
                <div className="font-semibold text-sm sm:text-base text-card-foreground">{employeeName}</div>
                <div className="text-xs text-muted-foreground">Worker</div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="flex-shrink-0"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* QUICK NAVIGATION CARDS */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <Card 
            className="p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
            onClick={() => router.push('/worker/schedule')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-card-foreground mb-1">My Schedule</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">View your assigned shifts</p>
              </div>
              <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                →
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-muted/30 border-dashed">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-card-foreground mb-1">Set Availability</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Update your weekly availability below</p>
              </div>
            </div>
          </Card>
        </div>

        {/* AVAILABILITY GRID */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-6">
          <AvailabilityGrid employeeId={employeeId} />
        </div>

        {/* FOOTER INFO */}
        <div className="bg-muted/30 border border-border rounded-lg p-3 sm:p-4 text-sm text-muted-foreground">
          <p className="font-semibold mb-1 flex items-center gap-1 text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 flex-shrink-0" />
            Tips:
          </p>
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
