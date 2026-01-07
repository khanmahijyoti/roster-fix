'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RosterBoard } from '@/components/roster/RosterBoard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'
import { Onboarding } from '@/components/Onboarding'
import { AddBusiness } from '@/components/AddBusiness'

export default function Home() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState<boolean | null>(null)
  const [activeNav, setActiveNav] = useState('schedule')

  useEffect(() => {
    async function loadAdminContext() {
      // 1. Get Session
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (!session) {
        router.push('/login')
        return
      }

      // 2. Check if Employee Record Exists
      const { data: emp, error } = await supabase
        .from('employees')
        .select('organization_id, id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      // Log for debugging
      console.log('Employee lookup:', { emp, error })

      // If we found a row, they are set up. If error/null, they are new.
      setHasEmployeeProfile(!!emp)

      if (emp) {
        console.log('Setting org and employee IDs:', { orgId: emp.organization_id, empId: emp.id })
        setOrgId(emp.organization_id)
        setCurrentEmployeeId(emp.id)
        await loadEmpireData(emp.organization_id)
      }
    }
    loadAdminContext()
  }, [])

  async function loadEmpireData(organizationId: string) {
    console.log('Loading empire data for org:', organizationId)
    // 1. Get Businesses
    const { data: bData, error: bError } = await supabase.from('businesses').select('*').eq('organization_id', organizationId)
    console.log('Businesses:', { bData, bError })
    if (bData && bData.length > 0) {
      setBusinesses(bData)
      if (!selectedBusinessId) setSelectedBusinessId(bData[0].id)
    }
    // 2. Get all employees first to debug
    const { data: allEmps } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
    console.log('All employees in org:', allEmps)
    
    // 3. Get Workers only (exclude admins)
    const { data: eData, error: eError } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('system_role', 'worker')
    console.log('Workers only:', { eData, eError })
    setEmployees(eData || [])
  }

  async function refreshBusinesses() {
    if (orgId) {
      const { data: bData } = await supabase.from('businesses').select('*').eq('organization_id', orgId)
      if (bData) {
        setBusinesses(bData)
        // If no business selected or selected one was deleted, select first one
        if (!selectedBusinessId || !bData.find(b => b.id === selectedBusinessId)) {
          if (bData.length > 0) setSelectedBusinessId(bData[0].id)
        }
      }
    }
  }

  // 1. Loading State
  if (hasEmployeeProfile === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // 2. User is logged in but has no data -> SHOW ONBOARDING
  if (session && !hasEmployeeProfile) {
    return <Onboarding user={session.user} />
  }

  // 3. User is fully set up -> SHOW DASHBOARD
  if (!orgId || !currentEmployeeId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading Admin Portal...</div>
      </div>
    )
  }

  // 4. No businesses exist -> Show create business prompt
  if (businesses.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Create Your First Business Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need at least one business location to start scheduling.
            </p>
            <Button 
              onClick={async () => {
                const { data, error } = await supabase
                  .from('businesses')
                  .insert({
                    name: 'Main Location',
                    organization_id: orgId
                  })
                  .select()
                  .single()
                
                if (data) {
                  setBusinesses([data])
                  setSelectedBusinessId(data.id)
                }
                if (error) alert('Error: ' + error.message)
              }}
              className="w-full"
            >
              Create Main Location
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-16 items-center px-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mr-8">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
              ☕
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-card-foreground">Morning Brew Empire</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>

          {/* Page Title - Center */}
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-xl font-semibold text-card-foreground">Schedule Management</h2>
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              Admin
            </Badge>
            <Button 
              variant="ghost" 
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
      </header>

      <div className="flex">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-56 min-h-[calc(100vh-4rem)] border-r border-border bg-card px-3 py-6">
          <nav className="space-y-1">
            {[
              { id: 'schedule', label: 'Schedule', icon: '📅' },
              { id: 'employees', label: 'Employees', icon: '👥' },
              { id: 'locations', label: 'Locations', icon: '📍' },
              { id: 'reports', label: 'Reports', icon: '📊' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeNav === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Location Selector Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-card-foreground">Current Location:</label>
                  <Select value={selectedBusinessId || ''} onValueChange={setSelectedBusinessId}>
                    <SelectTrigger className="w-64 bg-card border-border">
                      <SelectValue placeholder="Select a Store" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{b.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary" className="ml-auto">
                    {employees.length} Workers
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Board */}
            <Card>
              <CardHeader className="border-b border-border bg-muted/50">
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {selectedBusinessId ? (
                  <RosterBoard employees={employees} businessId={selectedBusinessId} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Select a location to view schedule
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* RIGHT SIDEBAR - ADMIN TOOLS */}
        <aside className="w-80 min-h-[calc(100vh-4rem)] border-l border-border bg-card p-6 space-y-4">
          <div className="space-y-4">
            {/* Add Business */}
            <AddBusiness organizationId={orgId} onBusinessAdded={refreshBusinesses} />
            
            {/* Stats Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-card-foreground">
                  Organization Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Workers</span>
                  <span className="text-lg font-bold text-primary">{employees.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Locations</span>
                  <span className="text-lg font-bold text-primary">{businesses.length}</span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">Org ID</p>
                  <p className="text-xs font-mono text-muted-foreground/70 truncate">{orgId?.slice(0, 18)}...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}
