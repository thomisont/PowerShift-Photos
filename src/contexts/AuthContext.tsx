'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null } | null
  }>
  signUp: (email: string, password: string) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null } | null
  }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setIsLoading(true)
      
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        if (data?.session) {
          console.log('Session found, user is authenticated')
          setSession(data.session)
          setUser(data.session.user)
        } else {
          console.log('No session found, user is not authenticated')
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to get session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    getInitialSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event)
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.data?.session) {
        console.log('Sign in successful')
      } else if (result.error) {
        console.error('Sign in error:', result.error)
      }
      return result
    } catch (error) {
      console.error('Unexpected error during sign in:', error)
      return { error: error as Error, data: null }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const result = await supabase.auth.signUp({ email, password })
      if (result.data?.user) {
        console.log('Sign up successful')
      } else if (result.error) {
        console.error('Sign up error:', result.error)
      }
      return result
    } catch (error) {
      console.error('Unexpected error during sign up:', error)
      return { error: error as Error, data: null }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      console.log('Sign out successful')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 