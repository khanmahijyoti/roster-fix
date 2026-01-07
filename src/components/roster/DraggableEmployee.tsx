'use client'
import { useDraggable } from '@dnd-kit/core'

export function DraggableEmployee({ employee }: { employee: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `employee-${employee.id}`,
    data: { employee }, // We carry the employee data with the drag
  })

  // This style moves the card when you drag it
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

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
    </div>
  )
}
