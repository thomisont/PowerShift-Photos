import { createClient } from '@supabase/supabase-js'

// These will be set in Replit Secrets later
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Print environment variables for debugging (remove in production)
console.log('Supabase URL:', supabaseUrl ? 'Set (hidden for security)' : 'NOT SET')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set (hidden for security)' : 'NOT SET')

if (!supabaseUrl) {
  console.error('Supabase URL is missing. Please check your .env.local file.')
}

if (!supabaseAnonKey) {
  console.error('Supabase Anon Key is missing. Please check your .env.local file.')
}

// Create a single supabase client for browser-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'powershift-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Helper function for creating a client with auth token for API routes
export const createClientWithToken = (authToken?: string) => {
  const options = authToken 
    ? { 
        global: { 
          headers: { 
            Authorization: `Bearer ${authToken}` 
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      } 
    : undefined
  
  return createClient(supabaseUrl, supabaseAnonKey, options)
}

// Types
export interface Profile {
  id: string
  username: string
  created_at: string
  updated_at: string
}

export interface Image {
  id: string
  owner_id: string
  image_url: string
  title: string
  description: string
  prompt: string
  model_parameters: Record<string, any>
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: number
  profile_id: string
  image_id: string
  created_at: string
}

// Backward compatibility for existing code
export type SavedImage = Image 