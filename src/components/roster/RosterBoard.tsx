'use client'
import { useState, useEffect } from 'react'
import { ShiftSlot } from './ShiftSlot'
import { ShiftTimeManager } from '@/components/ShiftTimeManager'
import { createClient } from '@/lib/supabase-browser'

interface RosterBoardProps {
  employees: any[]
  businessId: string
  availability: Record<string, Record<string, boolean>>
}

interface ShiftData {
  employee: any
  start_time: string
  end_time: string
  hours_worked: number
}

export function RosterBoard({ employees, businessId, availability }: RosterBoardProps) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<Record<string, ShiftData>>({})
  const [editingSlot, setEditingSlot] = useState<{ day: string; shiftTime: string } | null>(null)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // 1. Load Shifts
  useEffect(() => {
    async function loadShifts() {
      const { data } = await supabase
        .from('shifts')
        .select(`
          *,
          employees (*)
        `)
        .eq('business_id', businessId)
      
      if (data) {
        const newAssignments: Record<string, ShiftData> = {}
        data.forEach((shift: any) => {
          const key = `${shift.day_of_week}::${shift.shift_time}`
          newAssignments[key] = {
            employee: shift.employees,
            start_time: shift.start_time || '08:00',
            end_time: shift.end_time || '17:00',
            hours_worked: shift.hours_worked || 0
          }
        })
        setAssignments(newAssignments)
      }
    }
    loadShifts()
  }, [businessId])

  // Helper: Check if shift is in the past or currently running
  function isShiftPast(day: string, shiftTime: string): boolean {
    const now = new Date()
    const currentDayIndex = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight
    
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    
    const shiftDayIndex = dayMap[day]
    
    // If shift day is before current day in the week, it's past
    if (shiftDayIndex < currentDayIndex) return true
    
    // If shift day is after current day, it's in the future
    if (shiftDayIndex > currentDayIndex) return false
    
    // Same day - check time
    // Morning shifts typically start at 08:00, afternoon at 14:00
    const shiftStartMinutes = shiftTime === 'morning' ? 8 * 60 : 14 * 60
    
    // Shift has started if current time >= shift start time
    return currentTime >= shiftStartMinutes
  }

  // Helper: Get available employees for a specific slot
  function getAvailableEmployees(day: string, shiftTime: string): any[] {
    const availKey = `${day}-${shiftTime}`
    
    return employees.filter(emp => {
      const empAvailability = availability[emp.id]?.[availKey]
      // Employee is available if they haven't set availability yet (undefined) 
      // or explicitly marked as available (true)
      // Only unavailable if explicitly marked as false
      return empAvailability !== false
    })
  }

  // Handle Assignment from dropdown
  async function handleAssign(day: string, shiftTime: string, employeeId: string) {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return

    // Check if shift is in the past
    if (isShiftPast(day, shiftTime)) {
      alert(`🚫 PAST SHIFT!\n\nYou cannot assign employees to shifts that have already started or ended.`)
      return
    }

    // 🛑 0. CHECK AVAILABILITY FIRST (for specific shift)
    const availKey = `${day}-${shiftTime}`
    const employeeAvailability = availability[employee.id]?.[availKey]
    if (employeeAvailability === false) {
      alert(`🚫 UNAVAILABLE!\n\n${employee.name} has marked themselves as unavailable for ${day} ${shiftTime} shift.`)
      return
    }

    console.log(`🔍 Checking conflict for ${employee.name} on ${day} ${shiftTime}...`)

    // 🛑 1. ASK THE TRAFFIC COP (Check for conflicts)
    const { data: conflictData, error: rpcError } = await supabase
      .rpc('check_double_booking', {
        target_employee_id: employee.id,
        target_day: day,
        target_time: shiftTime,
        target_org_id: employee.organization_id
      })

    // Debugging: See what the database actually said
    console.log("🚦 Traffic Cop Result:", conflictData)

    if (conflictData && conflictData.length > 0) {
      const busyAt = conflictData[0].business_name
      
      // If the business returned is DIFFERENT from the current one, it's a conflict
      if (busyAt !== 'current_business_name_placeholder') { 
          // (We don't strictly need to check name if we know he's busy anywhere)
          alert(`🚫 CONFLICT!\n\n${employee.name} is already working at "${busyAt}" on ${day} ${shiftTime}.`)
          return; // <--- STOP! DO NOT SAVE.
      }
    }

    // ✅ 2. NO CONFLICT? UPDATE UI with default times
    const defaultStartTime = shiftTime === 'morning' ? '08:00' : '14:00'
    const defaultEndTime = shiftTime === 'morning' ? '14:00' : '23:00'
    
    const slotId = `${day}::${shiftTime}`
    setAssignments((prev) => ({
      ...prev,
      [slotId]: {
        employee,
        start_time: defaultStartTime,
        end_time: defaultEndTime,
        hours_worked: shiftTime === 'morning' ? 6 : 9
      },
    }))

    // ✅ 3. SAVE TO DB (Using INSERT to prevent overwriting)
    const { error } = await supabase
      .from('shifts')
      .insert({  // 👈 CHANGED FROM UPSERT TO INSERT
        employee_id: employee.id,
        business_id: businessId,
        organization_id: employee.organization_id,
        day_of_week: day,
        shift_time: shiftTime,
        start_time: defaultStartTime,
        end_time: defaultEndTime
      })

    if (error) {
      console.error("Save error:", error)
      // If the database blocks it (due to unique constraint), revert the UI
      if (error.code === '23505') { // 23505 is the code for "Unique Violation"
         alert("🚫 Database blocked this: Double Booking detected.")
         // Ideally, you would revert the UI state here too
         setAssignments((prev) => {
            const newState = { ...prev }
            delete newState[slotId]
            return newState
         })
      }
    }
  }

  // 3. Handle Remove
  async function handleRemove(day: string, shiftTime: string) {
    const slotId = `${day}::${shiftTime}`
    const shiftData = assignments[slotId]
    
    if (!shiftData) return

    // Prevent removing past shifts
    if (isShiftPast(day, shiftTime)) {
      alert(`🚫 PAST SHIFT!\n\nYou cannot remove shifts that have already started or ended.`)
      return
    }

    // Optimistically remove from UI
    setAssignments((prev) => {
      const newState = { ...prev }
      delete newState[slotId]
      return newState
    })

    // Delete from database
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('employee_id', shiftData.employee.id)
      .eq('business_id', businessId)
      .eq('day_of_week', day)
      .eq('shift_time', shiftTime)

    if (error) {
      console.error("Remove error:", error)
      // Revert UI if deletion failed
      setAssignments((prev) => ({
        ...prev,
        [slotId]: shiftData
      }))
    }
  }

  // 4. Handle Edit Time
  function handleEditTime(day: string, shiftTime: string) {
    // Prevent editing past shifts
    if (isShiftPast(day, shiftTime)) {
      alert(`🚫 PAST SHIFT!\n\nYou cannot edit shift times that have already started or ended.`)
      return
    }
    setEditingSlot({ day, shiftTime })
  }

  // 5. Save Shift Time
  async function saveShiftTime(startTime: string, endTime: string, autoLinkAfternoon: boolean) {
    if (!editingSlot) return

    const { day, shiftTime } = editingSlot
    const slotId = `${day}::${shiftTime}`
    const shiftData = assignments[slotId]

    if (!shiftData) return

    // Calculate hours
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    let hours = endHour - startHour
    let minutes = endMin - startMin
    if (minutes < 0) {
      hours -= 1
      minutes += 60
    }
    const hoursWorked = hours + (minutes / 60)

    // Update UI
    setAssignments((prev) => ({
      ...prev,
      [slotId]: {
        ...shiftData,
        start_time: startTime,
        end_time: endTime,
        hours_worked: hoursWorked
      }
    }))

    // Update database
    const { error } = await supabase
      .from('shifts')
      .update({
        start_time: startTime,
        end_time: endTime
      })
      .eq('employee_id', shiftData.employee.id)
      .eq('business_id', businessId)
      .eq('day_of_week', day)
      .eq('shift_time', shiftTime)

    if (error) {
      console.error("Update error:", error)
      alert('Error updating shift times')
      return
    }

    // If this is a morning shift and auto-link is enabled, update afternoon shift
    if (shiftTime === 'morning' && autoLinkAfternoon) {
      const afternoonSlotId = `${day}::afternoon`
      const afternoonShift = assignments[afternoonSlotId]

      // Calculate afternoon start time (morning end + 1 minute)
      let newMin = endMin + 1
      let newHour = endHour
      if (newMin >= 60) {
        newMin = 0
        newHour += 1
      }
      const afternoonStartTime = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`

      // If afternoon shift exists, update it
      if (afternoonShift) {
        // Calculate new afternoon hours
        const [aftEndHour, aftEndMin] = afternoonShift.end_time.split(':').map(Number)
        let aftHours = aftEndHour - newHour
        let aftMinutes = aftEndMin - newMin
        if (aftMinutes < 0) {
          aftHours -= 1
          aftMinutes += 60
        }
        const aftHoursWorked = aftHours + (aftMinutes / 60)

        // Update UI
        setAssignments((prev) => ({
          ...prev,
          [afternoonSlotId]: {
            ...afternoonShift,
            start_time: afternoonStartTime,
            hours_worked: aftHoursWorked
          }
        }))

        // Update database
        await supabase
          .from('shifts')
          .update({
            start_time: afternoonStartTime
          })
          .eq('employee_id', afternoonShift.employee.id)
          .eq('business_id', businessId)
          .eq('day_of_week', day)
          .eq('shift_time', 'afternoon')
      }
    }
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-auto bg-background p-4 sm:p-6 lg:p-8">
          {/* Force horizontal scroll on smaller screens */}
          <div className="grid grid-cols-7 gap-3 sm:gap-4 lg:gap-5 min-w-[900px]">
            {days.map((day) => (
              <div key={day} className="flex flex-col gap-3 sm:gap-4">
                {/* Column Header */}
                <div className="bg-muted text-muted-foreground text-center py-2 sm:py-3 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm">
                  {day}
                </div>
                
                {/* Morning Slot */}
                <ShiftSlot 
                  day={day} 
                  shiftTime="morning" 
                  assignedEmployee={assignments[`${day}::morning`]?.employee}
                  startTime={assignments[`${day}::morning`]?.start_time || '08:00'}
                  endTime={assignments[`${day}::morning`]?.end_time || '14:00'}
                  onRemove={handleRemove}
                  onEditTime={handleEditTime}
                  isPast={isShiftPast(day, 'morning')}
                  onAssign={handleAssign}
                  availableEmployees={getAvailableEmployees(day, 'morning')}
                />
                
                {/* Afternoon Slot */}
                <ShiftSlot 
                  day={day} 
                  shiftTime="afternoon" 
                  assignedEmployee={assignments[`${day}::afternoon`]?.employee}
                  startTime={assignments[`${day}::afternoon`]?.start_time || '14:00'}
                  endTime={assignments[`${day}::afternoon`]?.end_time || '23:00'}
                  onRemove={handleRemove}
                  onEditTime={handleEditTime}
                  isPast={isShiftPast(day, 'afternoon')}
                  onAssign={handleAssign}
                  availableEmployees={getAvailableEmployees(day, 'afternoon')}
                />
              </div>
            ))}
          </div>
        </div>

      {/* Shift Time Manager Modal */}
      {editingSlot && (
        <ShiftTimeManager
          day={editingSlot.day}
          shiftTime={editingSlot.shiftTime}
          currentStartTime={assignments[`${editingSlot.day}::${editingSlot.shiftTime}`]?.start_time || '08:00'}
          currentEndTime={assignments[`${editingSlot.day}::${editingSlot.shiftTime}`]?.end_time || '17:00'}
          afternoonStartTime={assignments[`${editingSlot.day}::afternoon`]?.start_time}
          onSave={saveShiftTime}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  )
}