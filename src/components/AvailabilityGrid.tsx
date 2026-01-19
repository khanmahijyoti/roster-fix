'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AvailabilityGrid({ employeeId }: { employeeId: string }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const shifts = ['morning', 'afternoon']
  // Store availability: { "Mon-morning": true, "Mon-afternoon": false }
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [hasAssignedShifts, setHasAssignedShifts] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 1. Load initial data
  useEffect(() => {
    async function load() {
      // Check if employee has any assigned shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id')
        .eq('employee_id', employeeId)
        .limit(1)
      
      setHasAssignedShifts((shifts && shifts.length > 0) || false)
      
      // Load availability data
      const { data } = await supabase
        .from('availability')
        .select('day_of_week, shift_time, is_available')
        .eq('employee_id', employeeId)
      
      // Convert database list to a simple object
      const map: Record<string, boolean> = {}
      data?.forEach(row => {
        const key = `${row.day_of_week}-${row.shift_time}`
        map[key] = row.is_available
      })
      setAvailability(map)
      setIsLoading(false)
    }
    load()
  }, [employeeId])

  // 2. Handle toggling
  async function toggleSlot(day: string, shiftTime: string) {
    // Prevent changes if shifts are assigned
    if (hasAssignedShifts) {
      return
    }
    
    const key = `${day}-${shiftTime}`
    const newValue = !availability[key] // Flip true/false
    
    // Optimistic UI update (update screen immediately)
    setAvailability(prev => ({ ...prev, [key]: newValue }))

    // Update Database
    const { error } = await supabase
      .from('availability')
      .upsert({ 
        employee_id: employeeId, 
        day_of_week: day,
        shift_time: shiftTime,
        is_available: newValue 
      }, { onConflict: 'employee_id, day_of_week, shift_time' })

    if (error) console.error("Save failed:", error)
  }

  // 3. Handle Reset - Set all slots to available
  async function handleReset() {
    if (hasAssignedShifts) {
      alert('Cannot reset availability while you have shifts assigned. Contact your admin.')
      return
    }
    
    const confirmed = confirm(
      '⚠️ Reset Availability\n\nThis will mark you as AVAILABLE for all days and shifts.\n\nContinue?'
    )
    
    if (!confirmed) return

    // Delete all existing availability records for this employee
    await supabase
      .from('availability')
      .delete()
      .eq('employee_id', employeeId)

    // Reset state to all available (empty object means everything defaults to true)
    setAvailability({})
    
    alert('✅ Availability has been reset! You are now available for all shifts.')
  }

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card shadow-sm">
        <div className="text-muted-foreground text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-card-foreground">Set Your Weekly Availability</h3>
        <div className="flex items-center gap-2">
          {!hasAssignedShifts && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              🔄 Reset All
            </Button>
          )}
          {hasAssignedShifts && (
            <Badge variant="destructive" className="text-xs">
              🔒 Locked
            </Badge>
          )}
        </div>
      </div>
      
      {hasAssignedShifts && (
        <div className="mb-4 p-3 bg-muted border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            ⚠️ Your availability is locked because you have shifts assigned. Contact your admin to make changes.
          </p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border bg-muted p-2 text-xs font-semibold text-muted-foreground w-24">
                Shift
              </th>
              {days.map(day => (
                <th key={day} className="border border-border bg-muted p-2 text-xs font-semibold text-muted-foreground">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map(shiftTime => (
              <tr key={shiftTime}>
                <td className="border border-border bg-muted/50 p-2 text-xs font-medium text-muted-foreground capitalize">
                  {shiftTime === 'morning' ? '🌅 Morning' : '🌆 Afternoon'}
                </td>
                {days.map(day => {
                  const key = `${day}-${shiftTime}`
                  const isAvailable = availability[key] !== false // Default to true if missing
                  return (
                    <td key={day} className="border border-border p-1">
                      <button
                        onClick={() => toggleSlot(day, shiftTime)}
                        disabled={hasAssignedShifts}
                        className={`
                          w-full h-12 rounded font-semibold text-xs transition-colors
                          ${hasAssignedShifts ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${isAvailable 
                            ? 'bg-primary/20 border border-primary text-primary hover:bg-primary/30' 
                            : 'bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/30'
                          }
                          ${hasAssignedShifts && 'hover:bg-current'}
                        `}
                        title={`${day} ${shiftTime}: ${isAvailable ? 'Available' : 'Unavailable'}`}
                      >
                        {isAvailable ? '✓' : '✕'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">💡 How it works:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Click cells to toggle availability for specific shifts</li>
          <li>Green (✓) = Available, Red (✕) = Unavailable</li>
          <li>Changes save automatically</li>
        </ul>
      </div>
    </div>
  )
}