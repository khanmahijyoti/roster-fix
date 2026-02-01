'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()
import { BarChart3 } from 'lucide-react'

export function ManagerDashboard() {
  const [employees, setEmployees] = useState<any[]>([])
  // We will store availability as a quick lookup map:
  // Key: "employeeID-Mon", Value: true/false
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({})
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  useEffect(() => {
    async function loadData() {
      // 1. Get All Employees
      const { data: empData } = await supabase.from('employees').select('*')
      if (empData) setEmployees(empData)

      // 2. Get ALL Availability for EVERYONE
      const { data: avData } = await supabase.from('availability').select('*')
      
      // 3. Transform into a lookup object for speed
      const map: Record<string, boolean> = {}
      avData?.forEach(record => {
        // Create a unique key like "123-Mon"
        const key = `${record.employee_id}-${record.day_of_week}`
        map[key] = record.is_available
      })
      setAvailabilityMap(map)
    }
    loadData()
  }, [])

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
        Master Availability Map
      </h2>
      
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-[10px] sm:text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 sticky left-0 bg-gray-50 z-10">Employee</th>
              {days.map(day => (
                <th key={day} className="px-2 sm:px-4 py-2 sm:py-3 text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b hover:bg-muted/50">
                <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-card-foreground sticky left-0 bg-background z-10">
                  <div className="min-w-[80px] sm:min-w-0">
                    {emp.name}
                    <div className="text-[10px] sm:text-xs text-muted-foreground font-normal truncate">{emp.role}</div>
                  </div>
                </td>
                
                {days.map(day => {
                  // Check our lookup map
                  const key = `${emp.id}-${day}`
                  // If no data exists, assume they are Available (Green) by default
                  const isAvailable = availabilityMap[key] !== false 
                  
                  return (
                    <td key={day} className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                      <div className={`
                        inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm
                        ${isAvailable 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                        }
                      `}>
                        {isAvailable ? '✓' : '✕'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}