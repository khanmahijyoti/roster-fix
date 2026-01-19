'use client'
import { useDraggable } from '@dnd-kit/core'

interface DraggableEmployeeProps {
  employee: any
  availability?: Record<string, boolean>
}

export function DraggableEmployee({ employee, availability = {} }: DraggableEmployeeProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `employee-${employee.id}`,
    data: { employee }, // We carry the employee data with the drag
  })

  // This style moves the card when you drag it
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-card border border-border hover:border-primary/50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md active:cursor-grabbing touch-none transition-all duration-200"
    >
      <div className="font-semibold text-sm text-card-foreground">{employee.name}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{employee.role}</div>
      
      {/* Availability indicators */}
      <div className="flex gap-1 mt-2">
        {days.map(day => {
          const isAvailable = availability[day] !== false // Default to true if not set
          return (
            <div
              key={day}
              className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-semibold border ${
                isAvailable 
                  ? 'bg-primary/20 text-primary border-primary/40' 
                  : 'bg-destructive/20 text-destructive border-destructive/40'
              }`}
              title={`${day}: ${isAvailable ? 'Available' : 'Unavailable'}`}
            >
              {day[0]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
