'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * AutoArchiver Component
 * Automatically archives weekly reports on Sunday night (11:59 PM)
 * or Monday morning when the page is first loaded.
 * 
 * Usage: Add this component to admin layout or dashboard
 */
export function AutoArchiver() {
  const [hasCheckedToday, setHasCheckedToday] = useState(false)

  useEffect(() => {
    // Check if we need to archive on component mount
    checkAndArchive()

    // Set up interval to check every hour
    const interval = setInterval(() => {
      checkAndArchive()
    }, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, [])

  async function checkAndArchive() {
    const now = new Date()
    const today = now.toDateString()
    
    // Check if we've already archived today
    const lastArchiveDate = localStorage.getItem('lastArchiveDate')
    if (lastArchiveDate === today) {
      setHasCheckedToday(true)
      return
    }

    // Check if it's Monday (day 1) or Sunday night (day 0) after 11 PM
    const dayOfWeek = now.getDay()
    const hour = now.getHours()
    
    const shouldArchive = 
      dayOfWeek === 1 || // Monday
      (dayOfWeek === 0 && hour >= 23) // Sunday after 11 PM

    if (shouldArchive && !hasCheckedToday) {
      console.log('🗄️ Auto-archiving weekly reports...')
      
      try {
        const { data, error } = await supabase.rpc('archive_weekly_reports')
        
        if (error) {
          // Check if function doesn't exist (migration not run)
          if (error.message?.includes('function') && error.message?.includes('does not exist')) {
            console.warn('⚠️ Weekly reports migration not run yet. Run migration_weekly_reports.sql in Supabase.')
            // Mark as checked to avoid repeated warnings
            localStorage.setItem('lastArchiveDate', today)
            setHasCheckedToday(true)
          } else {
            console.error('Auto-archive error:', error.message || error)
          }
        } else if (data && data.length > 0) {
          const result = data[0]
          console.log(`✅ Auto-archived ${result.archived_count} employee reports`)
          
          // Mark that we've archived today
          localStorage.setItem('lastArchiveDate', today)
          setHasCheckedToday(true)
        }
      } catch (err: any) {
        console.error('Auto-archive exception:', err?.message || err)
      }
    }
  }

  // This component doesn't render anything
  return null
}

/**
 * WeekHelper - Utility functions for week calculations
 */
export class WeekHelper {
  /**
   * Get the start of the current week (Monday)
   */
  static getCurrentWeekStart(): Date {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(now.setDate(diff))
  }

  /**
   * Get the end of the current week (Sunday)
   */
  static getCurrentWeekEnd(): Date {
    const start = this.getCurrentWeekStart()
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  }

  /**
   * Check if today is Sunday
   */
  static isSunday(): boolean {
    return new Date().getDay() === 0
  }

  /**
   * Check if today is Monday
   */
  static isMonday(): boolean {
    return new Date().getDay() === 1
  }

  /**
   * Format date as YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Get week label (e.g., "Dec 16 - Dec 22, 2024")
   */
  static getWeekLabel(startDate: Date): string {
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const start = startDate.toLocaleDateString('en-US', options)
    const end = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })
    
    return `${start} - ${end}`
  }
}
