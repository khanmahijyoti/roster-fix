import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  console.log('🔔 CALLBACK HIT!')
  console.log('📧 Callback params:', { 
    code: code ? code.substring(0, 10) + '...' : 'MISSING',
    token_hash: token_hash ? token_hash.substring(0, 10) + '...' : 'MISSING',
    type, 
    next, 
    origin 
  })

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('✅ Auth Exchange Successful! Type:', type, 'Next:', next)
      
      // Priority 1: Always redirect to /update-password for password recovery
      if (type === 'recovery') {
        console.log('🔐 Password recovery detected, redirecting to /update-password')
        return NextResponse.redirect(`${origin}/update-password`)
      }
      
      // Priority 2: If 'next' includes /update-password, honor it
      if (next.includes('update-password')) {
        console.log('🔐 Update password requested via next param')
        return NextResponse.redirect(`${origin}/update-password`)
      }
      
      // Priority 3: Default redirect
      console.log('🔀 Default redirect to:', next)
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('❌ Auth Exchange Failed:', error.message)
    }
  } else if (token_hash) {
    // Handle PKCE flow for password recovery
    console.log('🔐 PKCE token_hash detected for password recovery')
    
    // For PKCE flow, we need to pass the token_hash to the destination page
    // Supabase will handle the exchange on the client side
    if (type === 'recovery') {
      console.log('🔐 Redirecting to /update-password with token_hash')
      // Redirect and include the token_hash as a hash fragment
      return NextResponse.redirect(`${origin}/update-password#token_hash=${token_hash}&type=${type}`)
    }
    
    // For other PKCE flows, redirect with token_hash
    return NextResponse.redirect(`${origin}${next}#token_hash=${token_hash}`)
  } else {
    console.error('❌ No "code" or "token_hash" parameter found in URL')
  }

  // If something broke, send them to an error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
