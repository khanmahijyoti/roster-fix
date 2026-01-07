'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function AddBusiness({ organizationId, onBusinessAdded }: { 
  organizationId: string
  onBusinessAdded: () => void 
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [location, setLocation] = useState('')

  async function handleAddBusiness() {
    if (!businessName.trim()) {
      alert('Please enter a business name')
      return
    }

    setIsAdding(true)
    
    const { error } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        location: location || null,
        organization_id: organizationId
      })

    if (error) {
      alert('Error creating business: ' + error.message)
    } else {
      setBusinessName('')
      setLocation('')
      setShowForm(false)
      onBusinessAdded() // Refresh the business list
    }
    setIsAdding(false)
  }

  if (!showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manage Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowForm(true)}
            size="sm"
            className="w-full"
          >
            + Add New Location
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Add New Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Business Name *</label>
          <Input 
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Downtown Cafe"
            disabled={isAdding}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Location (Optional)</label>
          <Input 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., 123 Main St"
            disabled={isAdding}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleAddBusiness}
            disabled={isAdding || !businessName.trim()}
            size="sm"
            className="flex-1"
          >
            {isAdding ? 'Creating...' : 'Create'}
          </Button>
          <Button 
            onClick={() => {
              setShowForm(false)
              setBusinessName('')
              setLocation('')
            }}
            disabled={isAdding}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
