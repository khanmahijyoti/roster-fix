'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Calendar, MapPin } from 'lucide-react'

interface WeeklyHoursDisplayProps {
  employeeId: string
}

interface ShiftInfo {
  day_of_week: string
  shift_time: string
  start_time: string
  end_time: string
  hours_worked: number
  business_name: string
}

export function WeeklyHoursDisplay({ employeeId }: WeeklyHoursDisplayProps) {
  const [shifts, setShifts] = useState<ShiftInfo[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadShifts() {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          day_of_week,
          shift_time,
          start_time,
          end_time,
          businesses (name)
        `)
        .eq('employee_id', employeeId)
        .order('day_of_week')

      if (error) {
        console.error('Error loading shifts:', error)
        setIsLoading(false)
        return
      }

      if (data) {
        const formattedShifts = data.map((shift: any) => {
          // Use default times if columns don't exist yet
          const startTime = shift.start_time || (shift.shift_time === 'morning' ? '08:00' : '14:00')
          const endTime = shift.end_time || (shift.shift_time === 'morning' ? '14:00' : '23:00')
          
          // Calculate hours from time strings
          const calculateHours = (start: string, end: string) => {
            const [startHour, startMin] = start.split(':').map(Number)
            const [endHour, endMin] = end.split(':').map(Number)
            let hours = endHour - startHour
            let minutes = endMin - startMin
            if (minutes < 0) {
              hours -= 1
              minutes += 60
            }
            return hours + (minutes / 60)
          }

          return {
            day_of_week: shift.day_of_week,
            shift_time: shift.shift_time,
            start_time: startTime,
            end_time: endTime,
            hours_worked: calculateHours(startTime, endTime),
            business_name: shift.businesses?.name || 'Unknown'
          }
        })

        setShifts(formattedShifts)
        
        // Calculate total hours
        const total = formattedShifts.reduce((sum, shift) => sum + shift.hours_worked, 0)
        setTotalHours(total)
      }

      setIsLoading(false)
    }

    loadShifts()
  }, [employeeId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (shifts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            <Calendar className="w-12 h-12 mb-2 mx-auto text-muted-foreground" />
            <div className="text-sm">No shifts assigned yet</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const sortedShifts = [...shifts].sort((a, b) => {
    const dayCompare = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
    if (dayCompare !== 0) return dayCompare
    return a.shift_time === 'morning' ? -1 : 1
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Weekly Schedule
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{totalHours.toFixed(1)} hrs</div>
            <div className="text-xs text-muted-foreground">Total This Week</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedShifts.map((shift, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary text-sm">{shift.day_of_week}</span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-card-foreground capitalize">
                    {shift.shift_time}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shift.start_time} - {shift.end_time}
                  </div>
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {shift.business_name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{shift.hours_worked.toFixed(1)}h</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{shifts.length}</div>
            <div className="text-xs text-muted-foreground">Shifts</div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {new Set(shifts.map(s => s.day_of_week)).size}
            </div>
            <div className="text-xs text-muted-foreground">Days Working</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
