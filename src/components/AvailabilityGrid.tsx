'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, RotateCcw, AlertTriangle, Lightbulb, Check, X } from 'lucide-react'

export function AvailabilityGrid({ employeeId }: { employeeId: string }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const shifts = ['morning', 'afternoon']
  // Store availability: { "Mon-morning": true, "Mon-afternoon": false }
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Helper: Check if we're in the availability lock period (after Saturday 11:59 PM)
  function isAvailabilityLocked(): boolean {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    const hour = now.getHours()
    
    // Lock after Saturday 11:59 PM (dayOfWeek=6, hour>=23) until Sunday night archive
    return dayOfWeek === 6 && hour >= 23
  }

  // Helper: Check if current day is Sunday (admin scheduling day)
  function isSunday(): boolean {
    return new Date().getDay() === 0
  }

  // 1. Load initial data
  useEffect(() => {
    async function load() {
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
    // Prevent changes after Saturday 11:59 PM (availability locked for scheduling)
    if (isAvailabilityLocked()) {
      alert(`🚫 Availability Locked!\n\nAvailability for next week is locked after Saturday 11:59 PM.\n\nYou can update availability again on Monday after the schedule is published.`)
      return
    }
    
    // Prevent changes on Sunday (admin scheduling day)
    if (isSunday()) {
      alert(`🚫 Schedule Publishing Day!\n\nSunday is reserved for admin to build the schedule.\n\nYou can update next week's availability starting Monday.`)
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
    if (isAvailabilityLocked()) {
      alert('🚫 Availability is locked after Saturday 11:59 PM. Try again on Monday.')
      return
    }
    
    if (isSunday()) {
      alert('🚫 Sunday is admin scheduling day. Try again on Monday.')
      return
    }
    
    const confirmed = confirm(
      '⚠️ Reset Availability\n\nThis will mark you as AVAILABLE for all days and shifts NEXT WEEK.\n\nContinue?'
    )
    
    if (!confirmed) return

    // Delete all existing availability records for this employee
    await supabase
      .from('availability')
      .delete()
      .eq('employee_id', employeeId)

    // Reset state to all available (empty object means everything defaults to true)
    setAvailability({})
    
    alert('✅ Availability has been reset! You are now available for all shifts next week.')
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
        <div>
          <h3 className="font-bold text-card-foreground">Set Your Weekly Availability</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isSunday() 
              ? '📅 Sunday: Admin scheduling day - Updates resume Monday'
              : isAvailabilityLocked()
              ? '🔒 Locked: Availability locked until schedule is published'
              : '📝 Setting availability for NEXT WEEK (Mon-Sun)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAvailabilityLocked() && !isSunday() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </Button>
          )}
          {(isAvailabilityLocked() || isSunday()) && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Lock className="w-3 h-3" />
              {isSunday() ? 'Scheduling Day' : 'Locked'}
            </Badge>
          )}
        </div>
      </div>
      
      {(isAvailabilityLocked() || isSunday()) && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary flex items-start gap-2">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {isSunday() 
                ? 'Sunday is reserved for admin to build the schedule. You can update next week\'s availability starting Monday.'
                : 'Availability is locked after Saturday 11:59 PM to allow admin to build the schedule. Updates resume Monday.'}
            </span>
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
                  const isLocked = isAvailabilityLocked() || isSunday()
                  const isDisabled = isLocked
                  
                  return (
                    <td key={day} className="border border-border p-1">
                      <button
                        onClick={() => toggleSlot(day, shiftTime)}
                        disabled={isDisabled}
                        className={`
                          w-full h-12 rounded font-semibold text-xs transition-colors relative
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${isAvailable 
                            ? 'bg-primary/20 border border-primary text-primary hover:bg-primary/30' 
                            : 'bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/30'
                          }
                          ${isDisabled && 'hover:bg-current'}
                        `}
                        title={
                          isLocked 
                            ? `${day} ${shiftTime}: Locked (${isSunday() ? 'scheduling day' : 'after Sat 11:59 PM'})` 
                            : `${day} ${shiftTime}: ${isAvailable ? 'Available' : 'Unavailable'}`
                        }
                      >
                        {isLocked && <Lock className="w-3 h-3 absolute top-1 right-1 opacity-50" />}
                        {isAvailable ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
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
        <p className="font-semibold mb-1 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5" />
          Weekly Availability Schedule:
        </p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><strong>Monday-Saturday:</strong> Set availability for NEXT WEEK freely</li>
          <li><strong>Saturday 11:59 PM:</strong> Availability LOCKS for next week</li>
          <li><strong>Sunday:</strong> Admin builds schedule (no worker updates allowed)</li>
          <li><strong>Sunday Night:</strong> Schedule published, availability resets for new week</li>
          <li>Green (✓) = Available, Red (✗) = Unavailable</li>
          <li><Lock className="w-3 h-3 inline" /> = Locked (cannot edit)</li>
        </ul>
      </div>
    </div>
  )
}