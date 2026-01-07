'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Master Availability Map</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">Employee</th>
              {days.map(day => (
                <th key={day} className="px-4 py-3 text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-card-foreground">
                  {emp.name}
                  <div className="text-xs text-muted-foreground font-normal">{emp.role}</div>
                </td>
                
                {days.map(day => {
                  // Check our lookup map
                  const key = `${emp.id}-${day}`
                  // If no data exists, assume they are Available (Green) by default
                  const isAvailable = availabilityMap[key] !== false 
                  
                  return (
                    <td key={day} className="px-2 py-3 text-center">
                      <div className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
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
  )
}