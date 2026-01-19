'use client'
import { clsx } from 'clsx'
import { Clock, X, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ShiftSlotProps {
  day: string      // e.g., "Mon"
  shiftTime: string // e.g., "morning"
  assignedEmployee?: any
  startTime?: string // e.g., "08:00"
  endTime?: string   // e.g., "14:00"
  onRemove?: (day: string, shiftTime: string) => void
  onEditTime?: (day: string, shiftTime: string) => void
  onAssign?: (day: string, shiftTime: string, employeeId: string) => void
  availableEmployees?: any[] // Employees available for this specific slot
  isPast?: boolean   // Whether this shift has started or ended
}

export function ShiftSlot({ 
  day, 
  shiftTime, 
  assignedEmployee, 
  startTime = '08:00',
  endTime = '17:00',
  onRemove,
  onEditTime,
  onAssign,
  availableEmployees = [],
  isPast = false
}: ShiftSlotProps) {
  // Unique ID for this specific slot (e.g., "Mon::morning")
  const slotId = `${day}::${shiftTime}`

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(day, shiftTime)
    }
  }

  const handleEditTime = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEditTime) {
      onEditTime(day, shiftTime)
    }
  }

  const handleAssign = (employeeId: string) => {
    if (onAssign && employeeId) {
      onAssign(day, shiftTime, employeeId)
    }
  }

  // Calculate hours
  const calculateHours = () => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    let hours = endHour - startHour
    let minutes = endMin - startMin
    
    if (minutes < 0) {
      hours -= 1
      minutes += 60
    }
    
    return hours + (minutes / 60)
  }

  return (
    <div
      className={clsx(
        "h-32 border rounded-lg p-3 transition-all duration-200 relative group",
        isPast ? "bg-muted/50 border-muted opacity-60" : "bg-card border-border",
        assignedEmployee && !isPast ? "bg-accent/50 border-accent" : ""
      )}
    >
      {/* Header with shift time and time range */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          {shiftTime}
          {isPast && <span className="ml-1 text-red-500">(Past)</span>}
        </div>
        {!isPast && (
          <button
            onClick={handleEditTime}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit shift times"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Time range display */}
      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
        <span>{startTime}</span>
        <span>-</span>
        <span>{endTime}</span>
        <span className="ml-1 text-primary font-semibold">({calculateHours().toFixed(1)}h)</span>
      </div>
      
      {assignedEmployee ? (
        <div className="relative">
          <div className="bg-card p-2 rounded-md shadow-sm text-sm border border-border font-medium text-card-foreground">
            {assignedEmployee.name}
          </div>
          
          {/* Remove Button - Appears on Hover (only for future shifts) */}
          {!isPast && (
            <button
              onClick={handleRemove}
              className="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
              title="Remove assignment"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-1">
          {!isPast ? (
            <Select onValueChange={handleAssign} value="" disabled={availableEmployees.length === 0}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={availableEmployees.length === 0 ? "None available" : "Select employee..."} />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.length > 0 ? (
                  availableEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <span className="text-muted-foreground text-[10px]">({emp.role || 'Worker'})</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                    None available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-xs text-muted-foreground/50 text-center">No assignment</div>
          )}
        </div>
      )}
    </div>
  )
}