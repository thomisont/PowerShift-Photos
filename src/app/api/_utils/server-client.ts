import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClientWithToken } from '@/lib/supabase'

/**
 * Creates a standardized Supabase client for server components and API routes
 * This centralizes the cookie handling for all server-side operations
 */
export function createServerSupabaseClient() {
  try {
    const cookieStore = cookies()
    
    // Debug environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if environment variables are defined
    if (!supabaseUrl || !supabaseKey) {
      console.error('[SERVER CLIENT] Missing Supabase credentials:', {
        urlDefined: !!supabaseUrl,
        keyDefined: !!supabaseKey
      });
    }
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            try {
              return cookieStore.get(name)?.value
            } catch (error) {
              console.error(`[SERVER CLIENT] Error getting cookie ${name}:`, error);
              return undefined;
            }
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error(`[SERVER CLIENT] Error setting cookie ${name}:`, error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.error(`[SERVER CLIENT] Error removing cookie ${name}:`, error);
            }
          }
        }
      }
    )
  } catch (error) {
    console.error('[SERVER CLIENT] Error creating server client:', error);
    // Return a fallback client - it won't work properly but prevents crashes
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.com',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key',
      { cookies: { get: () => undefined, set: () => {}, remove: () => {} } }
    );
  }
}

/**
 * Gets a Supabase client for API routes, prioritizing token-based auth
 * @param authToken Optional auth token from Authorization header
 */
export function getSupabaseClient(authToken?: string) {
  if (authToken) {
    console.log('[API] Using token-based authentication')
    return createClientWithToken(authToken)
  }

  console.log('[API] Using cookie-based authentication')
  return createServerSupabaseClient()
} 