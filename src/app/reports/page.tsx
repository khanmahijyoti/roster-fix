'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Calendar, TrendingUp, Users, Archive, AlertCircle, RefreshCw } from 'lucide-react'

interface WeekData {
  week_start: string
  week_end: string
  is_current: boolean
  employee_count: number
  total_shifts: number
}

interface EmployeeReport {
  employee_id: string
  employee_name: string
  business_id: string
  business_name: string
  total_hours: number
  shift_count: number
  working_days: string[]
  week_start: string
  week_end: string
  shifts_data?: any[]
}

export default function ReportsPage() {
  const [businesses, setBusinesses] = useState<any[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null)
  const [reports, setReports] = useState<EmployeeReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    loadBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusinessId) {
      loadWeeks()
    }
  }, [selectedBusinessId])

  useEffect(() => {
    if (selectedWeek) {
      loadReports()
    }
  }, [selectedWeek])

  async function loadBusinesses() {
    const { data } = await supabase.from('businesses').select('*').order('name')
    if (data && data.length > 0) {
      setBusinesses(data)
      setSelectedBusinessId(data[0].id)
    }
    setIsLoading(false)
  }

  async function loadWeeks() {
    if (!selectedBusinessId) return

    const { data, error } = await supabase.rpc('get_all_report_weeks', {
      bus_id: selectedBusinessId
    })

    if (data && data.length > 0) {
      setWeeks(data)
      // Auto-select current week
      const currentWeek = data.find((w: WeekData) => w.is_current)
      setSelectedWeek(currentWeek || data[0])
    } else {
      setWeeks([])
      setSelectedWeek(null)
    }
  }

  async function loadReports() {
    if (!selectedWeek || !selectedBusinessId) return

    if (selectedWeek.is_current) {
      // Load current week data
      const { data } = await supabase
        .from('current_week_hours')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .order('employee_name')

      if (data) {
        setReports(data.map(r => ({
          ...r,
          week_start: selectedWeek.week_start,
          week_end: selectedWeek.week_end
        })))
      } else {
        // No data - clear reports
        setReports([])
      }
    } else {
      // Load archived week data
      const { data } = await supabase
        .from('weekly_reports')
        .select(`
          *,
          employees!inner(name),
          businesses!inner(name)
        `)
        .eq('business_id', selectedBusinessId)
        .eq('week_start', selectedWeek.week_start)
        .order('employees(name)')

      if (data) {
        setReports(data.map(r => ({
          employee_id: r.employee_id,
          employee_name: r.employees.name,
          business_id: r.business_id,
          business_name: r.businesses.name,
          total_hours: r.total_hours,
          shift_count: r.shift_count,
          working_days: r.working_days || [],
          week_start: r.week_start,
          week_end: r.week_end,
          shifts_data: r.shifts_data || []
        })))
      }
    }
  }

  async function archiveCurrentWeek() {
    setIsArchiving(true)
    
    try {
      const { data, error } = await supabase.rpc('archive_weekly_reports')
      
      if (error) {
        alert('Error archiving reports: ' + error.message)
      } else if (data && data.length > 0) {
        const result = data[0]
        alert(`✅ Archived ${result.archived_count} employee reports for week ${formatDate(result.week_start)} - ${formatDate(result.week_end)}`)
        loadWeeks() // Reload weeks list
      } else {
        alert('No data to archive for last week.')
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setIsArchiving(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatWeekLabel(week: WeekData) {
    const label = `${formatDate(week.week_start)} - ${formatDate(week.week_end)}`
    return week.is_current ? `${label} (Current)` : label
  }

  const totalHours = reports.reduce((sum, r) => sum + Number(r.total_hours || 0), 0)
  const totalShifts = reports.reduce((sum, r) => sum + (r.shift_count || 0), 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              Weekly Reports
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Track employee hours and view historical data</p>
          </div>
          
          <Button
            onClick={() => window.location.href = '/admin'}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* BUSINESS SELECTOR */}
        {businesses.length > 0 && (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <label className="text-sm font-semibold">Location:</label>
                <Select value={selectedBusinessId || ''} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WEEK SELECTOR & ARCHIVE BUTTON */}
        {weeks.length > 0 && (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
                  <label className="text-sm font-semibold whitespace-nowrap">Week:</label>
                  <Select 
                    value={selectedWeek ? `${selectedWeek.week_start}` : ''} 
                    onValueChange={(val) => {
                      const week = weeks.find(w => w.week_start === val)
                      if (week) setSelectedWeek(week)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weeks.map(w => (
                        <SelectItem key={w.week_start} value={w.week_start}>
                          <div className="flex items-center gap-2">
                            {w.is_current ? (
                              <Calendar className="w-4 h-4 text-primary" />
                            ) : (
                              <Archive className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span>{formatWeekLabel(w)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={archiveCurrentWeek}
                  disabled={isArchiving}
                  variant="secondary"
                  className="gap-2 w-full lg:w-auto"
                  size="sm"
                >
                  {isArchiving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Archiving...</span>
                      <span className="sm:hidden">Archiving...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span className="hidden sm:inline">Archive Last Week</span>
                      <span className="sm:hidden">Archive</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SUMMARY CARDS */}
        {selectedWeek && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">{reports.length}</p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
                  </div>
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Shifts</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">{totalShifts}</p>
                  </div>
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Avg Hours/Employee</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {reports.length > 0 ? (totalHours / reports.length).toFixed(1) : '0.0'}h
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EMPLOYEE REPORTS TABLE */}
        {selectedWeek && reports.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate">Employee Hours - Week of {formatDate(selectedWeek.week_start)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Employee</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden lg:table-cell">Working Days</th>
                      <th className="text-center p-2 sm:p-3 font-semibold text-xs sm:text-sm">Shifts</th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-xs sm:text-sm">Total Hours</th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden md:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.employee_id} className="border-b hover:bg-muted/50">
                        <td className="p-2 sm:p-3">
                          <div className="font-medium text-xs sm:text-sm">{report.employee_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{report.business_name}</div>
                        </td>
                        <td className="p-2 sm:p-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(report.working_days || []).map(day => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          <Badge variant="secondary" className="text-xs">{report.shift_count}</Badge>
                        </td>
                        <td className="p-2 sm:p-3 text-right">
                          <span className="font-semibold text-base sm:text-lg">{Number(report.total_hours || 0).toFixed(1)}h</span>
                        </td>
                        <td className="p-2 sm:p-3 text-right hidden md:table-cell">
                          {Number(report.total_hours || 0) >= 40 ? (
                            <Badge className="bg-green-500 text-xs">Full Time</Badge>
                          ) : Number(report.total_hours || 0) >= 20 ? (
                            <Badge variant="secondary" className="text-xs">Part Time</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Minimal</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : selectedWeek && reports.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p>No employee data for this week</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p>Select a location to view reports</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
