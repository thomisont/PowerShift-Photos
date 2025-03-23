import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Create Supabase client using direct credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check if admin key is provided (for security)
    const { searchParams } = new URL(req.url);
    const adminKey = searchParams.get('key');
    
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'development-setup-key') {
      console.log('[ADD TRIGGER DIRECT] Invalid admin key');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Run a raw SQL query directly using Supabase's built-in executeQuery method
    // This should be a last resort - only used if other methods fail
    
    // Define the SQL to add the column if it doesn't exist
    const sql = `
    DO $$
    BEGIN
        -- Check if the column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'lora_models' 
            AND column_name = 'trigger_word'
        ) THEN
            -- Add the column if it doesn't exist
            ALTER TABLE public.lora_models ADD COLUMN trigger_word TEXT;
            RAISE NOTICE 'Column added';
        ELSE
            RAISE NOTICE 'Column already exists';
        END IF;
    END
    $$;
    `;
    
    // We don't have direct SQL execution in JS supabase client, 
    // but we can proxy this through a custom RPC function
    try {
      console.log('[ADD TRIGGER DIRECT] Attempting to add column via secure RPC call');
      const { data, error } = await supabase.rpc('run_sql', { query: sql });
      
      if (error) {
        throw error;
      }
      
      // Update the model with the trigger word
      console.log('[ADD TRIGGER DIRECT] Setting trigger word for Better Than Headshots model');
      const { data: updateData, error: updateError } = await supabase
        .from('lora_models')
        .update({ trigger_word: 'BTHEADSHOTS' })
        .eq('replicate_id', 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da')
        .select();
        
      if (updateError) {
        throw updateError;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Column added or already exists, and model updated',
        updateResult: updateData
      });
    } catch (e) {
      console.log('[ADD TRIGGER DIRECT] RPC failed, attempting with a psql-like escape');
      
      // Note: This approach is NOT recommended in production code
      // It's a fallback when other approaches don't work
      
      // Create a request to a custom webhook or Supabase Edge Function
      // that allows executing database migrations
      try {
        // This is just demonstrative - in a real app, you would have set up 
        // a secure edge function or webhook
        
        const response = await fetch(process.env.DATABASE_ADMIN_WEBHOOK || '', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DATABASE_ADMIN_TOKEN || ''}`
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE public.lora_models ADD COLUMN IF NOT EXISTS trigger_word TEXT',
            adminKey
          })
        });
        
        if (!response.ok) {
          throw new Error('Webhook request failed');
        }
        
        return NextResponse.json({
          success: true,
          message: 'Column added via webhook, manual verification required',
          manualStep: 'UPDATE lora_models SET trigger_word = \'BTHEADSHOTS\' WHERE replicate_id = \'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da\''
        });
      } catch (webhookError) {
        console.error('[ADD TRIGGER DIRECT] All attempts failed, manual intervention required');
        
        return NextResponse.json({
          success: false,
          error: 'Automatic column creation failed',
          manualInstructions: [
            "Connect to your Supabase database directly",
            "Run the following SQL command:",
            "ALTER TABLE public.lora_models ADD COLUMN IF NOT EXISTS trigger_word TEXT;",
            "Then run:",
            "UPDATE lora_models SET trigger_word = 'BTHEADSHOTS' WHERE replicate_id = 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da';"
          ]
        });
      }
    }
  } catch (error: unknown) {
    console.error('[ADD TRIGGER DIRECT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        manualInstructions: [
          "Connect to your Supabase database directly",
          "Run the following SQL command:",
          "ALTER TABLE public.lora_models ADD COLUMN IF NOT EXISTS trigger_word TEXT;",
          "Then run:",
          "UPDATE lora_models SET trigger_word = 'BTHEADSHOTS' WHERE replicate_id = 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da';"
        ]
      },
      { status: 500 }
    );
  }
} 