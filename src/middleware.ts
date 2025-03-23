import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// This middleware is executed on every request
export async function middleware(req: NextRequest) {
  // Create a response object that we can modify
  const res = NextResponse.next()
  
  try {
    // Log middleware execution
    console.log('[MIDDLEWARE] Processing request:', req.url)
    
    // Create a Supabase client configured for use in middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            const cookies = req.cookies.getAll()
            const cookie = cookies.find((cookie) => cookie.name === name)
            return cookie?.value
          },
          set: (name, value, options) => {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove: (name, options) => {
            res.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Check if we have a session, if not token is in the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      console.log('[MIDDLEWARE] Authorization header detected')
    }

    // Try to refresh the session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
      console.log('[MIDDLEWARE] Valid session found for user:', session.user.id)
    } else if (error) {
      console.log('[MIDDLEWARE] Session error:', error.message)
    } else {
      console.log('[MIDDLEWARE] No session found')
    }
  } catch (e) {
    console.error('[MIDDLEWARE] Error:', e)
  }

  return res
}

// Configure matcher to exclude static assets and API routes from middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/).*)',
  ],
} 