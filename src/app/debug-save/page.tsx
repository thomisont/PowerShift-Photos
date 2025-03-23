'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function DebugSavePage() {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const { user, session } = useAuth()

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`])
  }

  // Test direct Supabase access
  const testSupabaseAccess = async () => {
    try {
      setStatus('testing')
      setError(null)
      setResult(null)
      addLog('Starting Supabase connection test...')

      // Step 1: Check connection by querying images
      addLog('Testing database connection...')
      const { data: connectionTest, error: connectionError } = await supabase
        .from('images')
        .select('id')
        .limit(1)

      if (connectionError) {
        addLog(`❌ Connection Error: ${connectionError.message}`)
        throw connectionError
      }
      
      addLog('✅ Database connection successful')

      // Step 2: Check auth status
      addLog('Checking authentication...')
      if (!user || !session) {
        addLog('❌ Not authenticated')
        throw new Error('Authentication required. Please log in.')
      }
      
      addLog(`✅ Authenticated as: ${user.email} (${user.id})`)
      
      // Step 3: Check profile
      addLog('Checking profile...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        addLog(`⚠️ Profile error: ${profileError.message}`)
        
        // Try to create profile
        addLog('Attempting to create profile...')
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user'
          })
        
        if (createProfileError) {
          addLog(`❌ Failed to create profile: ${createProfileError.message}`)
          throw createProfileError
        }
        
        addLog('✅ Profile created successfully')
      } else {
        addLog(`✅ Profile found: ${profile.username}`)
      }
      
      // Step 4: Try saving an image
      addLog('Testing image save...')
      const testImageData = {
        owner_id: user.id,
        image_url: 'https://placekitten.com/200/300?test=' + Date.now(),
        title: 'Debug Test Image',
        description: 'Created via debug page',
        prompt: 'Test prompt for debugging',
        is_public: true,
        model_parameters: { debug: true, timestamp: Date.now() }
      }
      
      addLog(`Image data: ${JSON.stringify(testImageData, null, 2)}`)
      
      const { data: savedImage, error: saveError } = await supabase
        .from('images')
        .insert(testImageData)
        .select()
      
      if (saveError) {
        addLog(`❌ Image save error: ${saveError.message}`)
        addLog(`Error details: ${JSON.stringify({
          code: saveError.code,
          details: saveError.details,
          hint: saveError.hint
        }, null, 2)}`)
        throw saveError
      }
      
      if (!savedImage || savedImage.length === 0) {
        addLog('❌ No image data returned')
        throw new Error('No data returned after image save')
      }
      
      addLog(`✅ Image saved successfully: ${savedImage[0].id}`)
      setResult(savedImage[0])
      setStatus('success')
      
    } catch (err: any) {
      console.error('Debug test error:', err)
      setError(err)
      setStatus('error')
      addLog(`❌ ERROR: ${err.message || 'Unknown error'}`)
    }
  }
  
  // Test API endpoint
  const testApiEndpoint = async () => {
    try {
      setStatus('testing-api')
      setError(null)
      setResult(null)
      addLog('Testing API endpoint...')
      
      if (!session?.access_token) {
        addLog('❌ No auth token available')
        throw new Error('Authentication token not available')
      }
      
      addLog('Sending request to /api/test-save...')
      const response = await fetch('/api/test-save')
      const data = await response.json()
      
      if (!response.ok) {
        addLog(`❌ API error: ${data.error || 'Unknown error'}`)
        throw new Error(data.error || 'Failed to save test image via API')
      }
      
      addLog(`✅ API test successful: ${JSON.stringify(data, null, 2)}`)
      setResult(data)
      setStatus('api-success')
      
    } catch (err: any) {
      console.error('API test error:', err)
      setError(err)
      setStatus('api-error')
      addLog(`❌ API ERROR: ${err.message || 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Image Save Debugging</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 border rounded-md">
          <h2 className="text-xl font-semibold mb-4">Test Direct Database Access</h2>
          <p className="mb-4 text-sm text-gray-600">
            This will test saving an image directly using the Supabase client.
          </p>
          <button
            onClick={testSupabaseAccess}
            disabled={status === 'testing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {status === 'testing' ? 'Testing...' : 'Test Direct Save'}
          </button>
        </div>
        
        <div className="p-4 border rounded-md">
          <h2 className="text-xl font-semibold mb-4">Test API Endpoint</h2>
          <p className="mb-4 text-sm text-gray-600">
            This will test saving an image through the API endpoint.
          </p>
          <button
            onClick={testApiEndpoint}
            disabled={status === 'testing-api'}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {status === 'testing-api' ? 'Testing API...' : 'Test API Endpoint'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Error:</p>
          <p>{error.message || JSON.stringify(error)}</p>
          {error.code && <p>Code: {error.code}</p>}
          {error.details && <p>Details: {error.details}</p>}
          {error.hint && <p>Hint: {error.hint}</p>}
        </div>
      )}
      
      {result && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <p className="font-bold">Success!</p>
          <pre className="mt-2 text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="border rounded-md p-4 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet. Run a test to see logs.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 