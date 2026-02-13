/**
 * Week Utilities
 * 
 * Shared functions for weekly roster management.
 * All week calculations use Monday as the start of the week.
 */

/**
 * Get the start of the current week (Monday at 00:00:00)
 * 
 * @returns ISO string representing Monday of the current week
 * 
 * @example
 * // On Tuesday, Feb 4, 2026
 * getCurrentWeekStart() // Returns "2026-02-03T00:00:00.000Z" (Monday, Feb 3)
 * 
 * // On Sunday, Feb 9, 2026
 * getCurrentWeekStart() // Returns "2026-02-03T00:00:00.000Z" (Previous Monday, Feb 3)
 */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  
  // Calculate days to subtract to get to Monday
  // Sunday (0) -> go back 6 days
  // Monday (1) -> go back 0 days
  // Tuesday (2) -> go back 1 day, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  
  return monday.toISOString()
}

/**
 * Get the start of a specific week (Monday at 00:00:00)
 * 
 * @param date - The date to find the week start for
 * @returns ISO string representing Monday of that week
 */
export function getWeekStart(date: Date): string {
  const dayOfWeek = date.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  const monday = new Date(date)
  monday.setDate(date.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  
  return monday.toISOString()
}

/**
 * Format a week range for display
 * 
 * @param weekStart - ISO string or Date object for the week start
 * @param isCurrent - Whether this is the current week
 * @returns Formatted string like "Feb 3 - Feb 9, 2026 (Current)"
 */
export function formatWeekRange(weekStart: string | Date, isCurrent: boolean = false): string {
  const start = typeof weekStart === 'string' ? new Date(weekStart) : weekStart
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', options)
  const endStr = end.toLocaleDateString('en-US', options)
  const year = start.getFullYear()
  
  return `${startStr} - ${endStr}, ${year}${isCurrent ? ' (Current)' : ''}`
}

/**
 * Check if a given date is in the current week
 * 
 * @param date - The date to check
 * @returns True if the date falls within the current week
 */
export function isCurrentWeek(date: Date): boolean {
  const currentWeekStart = getCurrentWeekStart()
  const dateWeekStart = getWeekStart(date)
  return currentWeekStart === dateWeekStart
}

/**
 * Get the date for a specific day in the current week
 * 
 * @param dayOfWeek - Day name ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
 * @returns Date object for that day in the current week
 */
export function getDateForDay(dayOfWeek: string): Date {
  const dayMap: Record<string, number> = {
    'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
  }
  
  const daysFromMonday = dayMap[dayOfWeek] ?? 0
  const weekStart = new Date(getCurrentWeekStart())
  weekStart.setDate(weekStart.getDate() + daysFromMonday)
  
  return weekStart
}
