'use client'
import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { DraggableEmployee } from './DraggableEmployee'
import { ShiftSlot } from './ShiftSlot'
import { supabase } from '@/lib/supabase'

interface RosterBoardProps {
  employees: any[]
  businessId: string
  availability: Record<string, Record<string, boolean>>
}

export function RosterBoard({ employees, businessId, availability }: RosterBoardProps) {
  const [assignments, setAssignments] = useState<Record<string, any>>({})
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // 1. Load Shifts
  useEffect(() => {
    async function loadShifts() {
      const { data } = await supabase.from('shifts').select(`*, employees (*)`).eq('business_id', businessId)
      if (data) {
        const newAssignments: Record<string, any> = {}
        data.forEach((shift: any) => {
          newAssignments[`${shift.day_of_week}::${shift.shift_time}`] = shift.employees
        })
        setAssignments(newAssignments)
      }
    }
    loadShifts()
  }, [businessId])

  // 2. Handle Drag
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (!over) return

    const employee = active.data.current?.employee
    const [day, shiftTime] = (over.id as string).split('::')

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

    // ✅ 2. NO CONFLICT? UPDATE UI
    setAssignments((prev) => ({
      ...prev,
      [over.id as string]: employee,
    }))

    // ✅ 3. SAVE TO DB (Using INSERT to prevent overwriting)
    const { error } = await supabase
      .from('shifts')
      .insert({  // 👈 CHANGED FROM UPSERT TO INSERT
        employee_id: employee.id,
        business_id: businessId,
        organization_id: employee.organization_id,
        day_of_week: day,
        shift_time: shiftTime
      })

    if (error) {
      console.error("Save error:", error)
      // If the database blocks it (due to unique constraint), revert the UI
      if (error.code === '23505') { // 23505 is the code for "Unique Violation"
         alert("🚫 Database blocked this: Double Booking detected.")
         // Ideally, you would revert the UI state here too
         setAssignments((prev) => {
            const newState = { ...prev }
            delete newState[over.id as string]
            return newState
         })
      }
    }
  }

  // 3. Handle Remove
  async function handleRemove(day: string, shiftTime: string) {
    const slotId = `${day}::${shiftTime}`
    const employee = assignments[slotId]
    
    if (!employee) return

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
      .eq('employee_id', employee.id)
      .eq('business_id', businessId)
      .eq('day_of_week', day)
      .eq('shift_time', shiftTime)

    if (error) {
      console.error("Remove error:", error)
      // Revert UI if deletion failed
      setAssignments((prev) => ({
        ...prev,
        [slotId]: employee
      }))
    }
  }

  return (
    <DndContext 
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
      collisionDetection={pointerWithin}
      autoScroll={false}
    >
      <div className="flex h-full overflow-hidden">{/* Added overflow-hidden */}
        {/* LEFT SIDEBAR: STAFF LIST (Fixed Width: w-72) */}
        <div className="w-72 bg-card border-r border-border flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-border bg-muted/30">
             <h2 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Available Staff</h2>
             <p className="text-[10px] text-muted-foreground/70 mt-1">Drag to assign shifts</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {employees.map((emp) => (
              <DraggableEmployee key={emp.id} employee={emp} availability={availability[emp.id] || {}} />
            ))}
          </div>
        </div>

        {/* RIGHT: CALENDAR GRID (Flexible) */}
        <div className="flex-1 overflow-auto bg-background p-8">
          {/* We add min-w-[1260px] to force horizontal scroll if screen is too small */}
          <div className="grid grid-cols-7 gap-5 min-w-[1260px]">
            {days.map((day) => (
              <div key={day} className="flex flex-col gap-4">
                {/* Column Header */}
                <div className="bg-muted text-muted-foreground text-center py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm">
                  {day}
                </div>
                
                {/* Morning Slot */}
                <ShiftSlot 
                  day={day} 
                  shiftTime="morning" 
                  assignedEmployee={assignments[`${day}::morning`]}
                  onRemove={handleRemove}
                />
                
                {/* Afternoon Slot */}
                <ShiftSlot 
                  day={day} 
                  shiftTime="afternoon" 
                  assignedEmployee={assignments[`${day}::afternoon`]}
                  onRemove={handleRemove}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}