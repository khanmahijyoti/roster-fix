'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AvailabilityGrid({ employeeId }: { employeeId: string }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Store availability: { "Mon": true, "Tue": false }
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  // 1. Load initial data
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('availability')
        .select('day_of_week, is_available')
        .eq('employee_id', employeeId)
      
      // Convert database list to a simple object
      const map: Record<string, boolean> = {}
      data?.forEach(row => {
        map[row.day_of_week] = row.is_available
      })
      setAvailability(map)
    }
    load()
  }, [employeeId])

  // 2. Handle toggling
  async function toggleDay(day: string) {
    const newValue = !availability[day] // Flip true/false
    
    // Optimistic UI update (update screen immediately)
    setAvailability(prev => ({ ...prev, [day]: newValue }))

    // Update Database
    const { error } = await supabase
      .from('availability')
      .upsert({ 
        employee_id: employeeId, 
        day_of_week: day, 
        is_available: newValue 
      }, { onConflict: 'employee_id, day_of_week' })

    if (error) console.error("Save failed:", error)
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm max-w-md">
      <h3 className="font-bold mb-4">Set Your Weekly Availability</h3>
      <div className="grid grid-cols-7 gap-2 text-center">
        {days.map(day => {
          const isGreen = availability[day] !== false // Default to true if missing
          return (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`
                p-3 rounded border font-semibold transition-colors
                ${isGreen 
                  ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20' 
                  : 'bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20'
                }
              `}
            >
              <div>{day}</div>
              <div className="text-xs mt-1">{isGreen ? '✓' : '✕'}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}