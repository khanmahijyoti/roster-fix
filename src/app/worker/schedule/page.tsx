'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import { Clock, Calendar, MapPin, ArrowLeft, Coffee, AlertCircle, RefreshCw } from 'lucide-react'

interface Shift {
  id: string
  day_of_week: string
  shift_time: 'morning' | 'afternoon'
  start_time: string
  end_time: string
  hours_worked: number
  business_id: string
  businesses: {
    name: string
    location: string
  }
}

export default function WorkerSchedulePage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    async function loadData() {
      // Get logged-in user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get employee profile
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single()

      if (emp) {
        setEmployeeId(emp.id)
        setEmployeeName(emp.name)
        await loadShifts(emp.id)
        
        // Set up real-time subscription for shift changes
        const channel = supabase
          .channel('shifts-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'shifts',
              filter: `employee_id=eq.${emp.id}`
            },
            () => {
              // Reload shifts when any change occurs
              loadShifts(emp.id)
            }
          )
          .subscribe()

        // Cleanup subscription on unmount
        return () => {
          supabase.removeChannel(channel)
        }
      } else {
        setIsLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadShifts(empId: string) {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id,
          day_of_week,
          shift_time,
          start_time,
          end_time,
          hours_worked,
          business_id,
          businesses!inner (
            name,
            location
          )
        `)
        .eq('employee_id', empId)

      if (error) {
        console.error('Error loading shifts:', error)
      } else if (data) {
        setShifts(data as Shift[])
      }
    } catch (err) {
      console.error('Exception loading shifts:', err)
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }

  const calculateHours = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }
    
    return (endMinutes - startMinutes) / 60
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const sortedShifts = [...shifts].sort((a, b) => {
    const dayCompare = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
    if (dayCompare !== 0) return dayCompare
    return a.shift_time === 'morning' ? -1 : 1
  })

  const totalHours = sortedShifts.reduce((sum, shift) => {
    if (shift.hours_worked) {
      return sum + Number(shift.hours_worked)
    }
    return sum + calculateHours(shift.start_time || '08:00', shift.end_time || '17:00')
  }, 0)

  const groupedByDay = sortedShifts.reduce((acc, shift) => {
    if (!acc[shift.day_of_week]) {
      acc[shift.day_of_week] = []
    }
    acc[shift.day_of_week].push(shift)
    return acc
  }, {} as Record<string, Shift[]>)

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="flex flex-col sm:flex-row h-auto sm:h-16 items-start sm:items-center px-4 sm:px-6 py-3 sm:py-0 gap-3 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/worker')}
            className="sm:mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg flex-shrink-0">
              <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-card-foreground truncate">My Weekly Schedule</h1>
              <p className="text-xs text-muted-foreground truncate">{employeeName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => employeeId && loadShifts(employeeId)}
              disabled={isRefreshing}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Badge variant="outline" className="border-primary/30 text-primary hidden sm:flex">
              Worker
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        
        {/* SUMMARY CARD */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Weekly Hours</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Shifts</p>
                <p className="text-xl sm:text-2xl font-bold text-card-foreground">{shifts.length}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Working Days</p>
                <p className="text-xl sm:text-2xl font-bold text-card-foreground">
                  {Object.keys(groupedByDay).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NO SHIFTS MESSAGE */}
        {shifts.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Shifts Assigned Yet</p>
                <p className="text-sm">Your manager hasn't assigned any shifts to you this week.</p>
                <p className="text-sm mt-2">Check back later or contact your manager.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DAILY SCHEDULE CARDS */}
        <div className="space-y-4 sm:space-y-6">
        {dayOrder.map(day => {
          const dayShifts = groupedByDay[day]
          if (!dayShifts || dayShifts.length === 0) return null

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  {day === 'Mon' ? 'Monday' : 
                   day === 'Tue' ? 'Tuesday' :
                   day === 'Wed' ? 'Wednesday' :
                   day === 'Thu' ? 'Thursday' :
                   day === 'Fri' ? 'Friday' :
                   day === 'Sat' ? 'Saturday' : 'Sunday'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayShifts.map(shift => {
                    const hours = shift.hours_worked 
                      ? Number(shift.hours_worked)
                      : calculateHours(shift.start_time || '08:00', shift.end_time || '17:00')

                    return (
                      <div 
                        key={shift.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg border border-border gap-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className="flex flex-col items-start sm:items-center w-full sm:w-auto">
                            <Badge 
                              variant={shift.shift_time === 'morning' ? 'default' : 'secondary'}
                              className="mb-1"
                            >
                              {shift.shift_time === 'morning' ? 'Morning' : 'Afternoon'}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-mono font-semibold">
                                {shift.start_time || '08:00'} - {shift.end_time || '17:00'}
                              </span>
                            </div>
                          </div>

                          <div className="hidden sm:block h-10 w-px bg-border" />

                          <div className="w-full sm:w-auto">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{shift.businesses.name}</span>
                            </div>
                            {shift.businesses.location && (
                              <div className="text-xs text-muted-foreground ml-5 sm:ml-6 truncate">
                                {shift.businesses.location}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right w-full sm:w-auto flex items-center justify-between sm:block">
                          <span className="text-xs text-muted-foreground sm:hidden">Hours:</span>
                          <div>
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                              {hours.toFixed(1)}h
                            </div>
                            <div className="text-xs text-muted-foreground hidden sm:block">Hours</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>

        {/* WEEK OVERVIEW TABLE */}
        {shifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Week Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                <table className="w-full text-sm sm:text-base">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Day</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Location</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Shifts</th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-xs sm:text-sm">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayOrder.map(day => {
                      const dayShifts = groupedByDay[day]
                      if (!dayShifts || dayShifts.length === 0) return null

                      const dayHours = dayShifts.reduce((sum, shift) => {
                        if (shift.hours_worked) {
                          return sum + Number(shift.hours_worked)
                        }
                        return sum + calculateHours(shift.start_time || '08:00', shift.end_time || '17:00')
                      }, 0)

                      const locations = [...new Set(dayShifts.map(s => s.businesses.name))].join(', ')

                      return (
                        <tr key={day} className="border-b hover:bg-muted/50">
                          <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{day}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[100px] sm:max-w-none">{locations}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3">
                            <div className="flex gap-1">
                              {dayShifts.map(shift => (
                                <Badge 
                                  key={shift.id}
                                  variant={shift.shift_time === 'morning' ? 'default' : 'secondary'}
                                  className="text-[10px] sm:text-xs px-1 sm:px-2"
                                >
                                  {shift.shift_time === 'morning' ? 'AM' : 'PM'}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-right font-semibold text-primary text-xs sm:text-sm">
                            {dayHours.toFixed(1)}h
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="font-bold bg-muted/30">
                      <td className="p-2 sm:p-3 text-xs sm:text-sm">Total</td>
                      <td className="p-2 sm:p-3"></td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm">{shifts.length} shifts</td>
                      <td className="p-2 sm:p-3 text-right text-primary text-base sm:text-lg">
                        {totalHours.toFixed(1)}h
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
