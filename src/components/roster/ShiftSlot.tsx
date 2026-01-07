'use client'
import { useDroppable } from '@dnd-kit/core'
import { clsx } from 'clsx'

interface ShiftSlotProps {
  day: string      // e.g., "Mon"
  shiftTime: string // e.g., "morning"
  assignedEmployee?: any
  onRemove?: (day: string, shiftTime: string) => void
}

export function ShiftSlot({ day, shiftTime, assignedEmployee, onRemove }: ShiftSlotProps) {
  // Unique ID for this specific slot (e.g., "Mon::morning")
  const slotId = `${day}::${shiftTime}`

  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: { day, shiftTime }, // We need to know WHERE we dropped it
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(day, shiftTime)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "h-28 border rounded-lg p-3 transition-all duration-200 relative group",
        isOver ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20" : "bg-card border-border",
        assignedEmployee ? "bg-accent/50 border-accent" : ""
      )}
    >
      <div className="text-[10px] text-muted-foreground mb-2 uppercase font-bold tracking-wider">{shiftTime}</div>
      
      {assignedEmployee ? (
        <div className="relative">
          <div className="bg-card p-2.5 rounded-md shadow-sm text-sm border border-border font-medium text-card-foreground">
            {assignedEmployee.name}
          </div>
          
          {/* Remove Button - Appears on Hover */}
          <button
            onClick={handleRemove}
            className="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
            title="Remove assignment"
          >
            <span className="text-sm font-bold leading-none">×</span>
          </button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/50 text-center mt-4">Drag staff here</div>
      )}
    </div>
  )
}
