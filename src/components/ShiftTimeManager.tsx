'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface ShiftTimeManagerProps {
  day: string
  shiftTime: string
  currentStartTime?: string
  currentEndTime?: string
  afternoonStartTime?: string // For showing the linked afternoon time
  onSave: (startTime: string, endTime: string, autoLinkAfternoon: boolean) => Promise<void>
  onClose: () => void
}

export function ShiftTimeManager({
  day,
  shiftTime,
  currentStartTime = '08:00',
  currentEndTime = '17:00',
  afternoonStartTime,
  onSave,
  onClose
}: ShiftTimeManagerProps) {
  const [startTime, setStartTime] = useState(currentStartTime)
  const [endTime, setEndTime] = useState(currentEndTime)
  const [autoLinkAfternoon, setAutoLinkAfternoon] = useState(shiftTime === 'morning')
  const [isSaving, setIsSaving] = useState(false)

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

  // Calculate linked afternoon start time
  const getLinkedAfternoonStart = () => {
    if (shiftTime !== 'morning') return null
    const [hour, min] = endTime.split(':').map(Number)
    let newMin = min + 1
    let newHour = hour
    if (newMin >= 60) {
      newMin = 0
      newHour += 1
    }
    return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`
  }

  const handleSave = async () => {
    if (!startTime || !endTime) {
      alert('Please enter both start and end times')
      return
    }

    const totalHours = calculateHours()
    if (totalHours <= 0) {
      alert('End time must be after start time')
      return
    }

    setIsSaving(true)
    try {
      await onSave(startTime, endTime, autoLinkAfternoon)
      onClose()
    } catch (error) {
      alert('Error saving shift times')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">
            Set Shift Time - {day} {shiftTime}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                End Time
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Hours Display */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Total Hours</div>
            <div className="text-2xl font-bold text-primary">
              {calculateHours().toFixed(2)} hrs
            </div>
          </div>

          {/* Auto-link afternoon shift option (only for morning shifts) */}
          {shiftTime === 'morning' && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLinkAfternoon}
                  onChange={(e) => setAutoLinkAfternoon(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium">Auto-link afternoon shift</span>
              </label>
              {autoLinkAfternoon && (
                <div className="text-xs text-muted-foreground pl-6 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <div>
                    <span>Afternoon shift will start at <span className="font-semibold text-primary">{getLinkedAfternoonStart()}</span></span>
                    {afternoonStartTime && afternoonStartTime !== getLinkedAfternoonStart() && (
                      <span className="block mt-1 text-amber-600">
                        (Currently: {afternoonStartTime})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preset Buttons */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Quick Presets:</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartTime('08:00')
                  setEndTime('14:00')
                }}
              >
                Morning (8am-2pm)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartTime('14:00')
                  setEndTime('23:00')
                }}
              >
                Afternoon (2pm-11pm)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartTime('09:00')
                  setEndTime('17:00')
                }}
              >
                Standard (9am-5pm)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartTime('00:00')
                  setEndTime('08:00')
                }}
              >
                Night (12am-8am)
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Times'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
