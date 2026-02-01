'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
const supabase = createClient()
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function InviteWorker({ organizationId, employeeId }: { organizationId: string, employeeId: string }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  async function generateInvite() {
    setIsGenerating(true)
    
    // Generate a random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        code: code,
        created_by: employeeId,
        max_uses: 10, // Can be used 10 times
        is_active: true
      })
      .select()
      .single()

    if (error) {
      alert('Error creating invite: ' + error.message)
    } else {
      setInviteCode(code)
    }
    setIsGenerating(false)
  }

  const inviteUrl = inviteCode 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/login?invite=${inviteCode}`
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Invite Workers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!inviteCode ? (
          <Button 
            onClick={generateInvite} 
            disabled={isGenerating}
            size="sm"
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate Invite Link'}
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Invite Code:</label>
              <Input 
                value={inviteCode} 
                readOnly 
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Invite Link:</label>
              <Input 
                value={inviteUrl || ''} 
                readOnly 
                className="text-xs"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl || '')
                alert('Link copied to clipboard!')
              }}
              size="sm"
              variant="outline"
              className="w-full"
            >
              Copy Link
            </Button>
            <Button 
              onClick={() => setInviteCode(null)}
              size="sm"
              variant="ghost"
              className="w-full"
            >
              Generate New
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
