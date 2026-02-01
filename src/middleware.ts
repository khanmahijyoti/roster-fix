import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🚦 Middleware hit:', request.nextUrl.pathname)
  
  // 1. Setup response
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 2. Initialize Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Get the current User
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('👤 User status:', user ? `Logged in (${user.id})` : 'Not logged in')

  // 4. TRAFFIC CONTROL LOGIC 🚦
  
  // Rule A: User IS logged in
  if (user) {
    console.log('✅ User is authenticated')
    
    // 🟢 ALLOW: Update password page (they need to change their password)
    if (request.nextUrl.pathname === '/update-password') {
      console.log('🔐 Allowing access to /update-password')
      return response
    }
    
    // 🔴 BLOCK: Don't let them see Login page (Redirect to Admin)
    if (request.nextUrl.pathname === '/login') {
      console.log('🔀 Redirecting from /login to /admin')
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Rule B: User is NOT logged in
  if (!user) {
    console.log('❌ User is NOT authenticated')
    // 🟢 ALLOW: Public routes that don't need auth
    const publicRoutes = ['/login', '/forgot-password', '/auth/callback', '/auth/auth-code-error']
    if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      return response
    }

    // 🟢 ALLOW: Update password page (auth happens on page load via magic link)
    if (request.nextUrl.pathname === '/update-password') {
      return response
    }

    // 🔴 BLOCK: Protect all other routes (admin, worker, etc.)
    if (request.nextUrl.pathname.startsWith('/admin') || 
        request.nextUrl.pathname.startsWith('/worker') ||
        request.nextUrl.pathname.startsWith('/reports')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  console.log('✅ Allowing request to proceed')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}