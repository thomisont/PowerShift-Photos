import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/_utils/server-client';

export async function GET(req: NextRequest) {
  try {
    console.log('[LORA SETUP] Starting LoRA tables setup');
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // Check if admin key is provided (for security)
    const { searchParams } = new URL(req.url);
    const adminKey = searchParams.get('key');
    
    if (adminKey !== process.env.SETUP_ADMIN_KEY) {
      console.log('[LORA SETUP] Invalid admin key');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // 1. Check if LoRA tables exist
    console.log('[LORA SETUP] Checking if LoRA tables exist');
    
    // Create lora_models table if it doesn't exist
    const createLoraModelsResult = await supabase.rpc('setup_lora_models_table');
    
    // Create user_lora_access table if it doesn't exist
    const createUserLoraAccessResult = await supabase.rpc('setup_user_lora_access_table');
    
    // Insert the BetterThanHeadshots model if it doesn't exist
    const insertModelResult = await supabase
      .from('lora_models')
      .upsert(
        {
          replicate_id: 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da',
          name: 'Better Than Headshots',
          owner: 'thomisont',
          version: 'v1.0',
          description: 'Custom LoRA model optimized for professional headshots with improved quality and realism',
          is_active: true,
          default_parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            negative_prompt: "low quality, bad anatomy, blurry, disfigured, ugly",
            width: 1024,
            height: 1024,
            scheduler: "K_EULER"
          }
        },
        { onConflict: 'replicate_id' }
      );
    
    // 2. Create stored procedures for setup if they don't exist
    console.log('[LORA SETUP] Creating stored procedures');
    
    // Define SQL to create stored procedures
    const setupProceduresSql = `
      -- Procedure to create lora_models table
      CREATE OR REPLACE FUNCTION setup_lora_models_table()
      RETURNS text AS $$
      DECLARE
        table_exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'lora_models'
        ) INTO table_exists;
        
        IF NOT table_exists THEN
          CREATE TABLE public.lora_models (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            replicate_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            owner TEXT NOT NULL,
            version TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true NOT NULL,
            default_parameters JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
          );
          
          -- Enable RLS
          ALTER TABLE public.lora_models ENABLE ROW LEVEL SECURITY;
          
          -- Create policy
          CREATE POLICY "Anyone can view active lora_models" 
            ON public.lora_models FOR SELECT 
            USING (is_active = true);
            
          RETURN 'Created lora_models table';
        ELSE
          RETURN 'lora_models table already exists';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Procedure to create user_lora_access table
      CREATE OR REPLACE FUNCTION setup_user_lora_access_table()
      RETURNS text AS $$
      DECLARE
        table_exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_lora_access'
        ) INTO table_exists;
        
        IF NOT table_exists THEN
          CREATE TABLE public.user_lora_access (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            lora_id UUID NOT NULL REFERENCES public.lora_models(id) ON DELETE CASCADE,
            is_owner BOOLEAN DEFAULT false NOT NULL,
            can_use BOOLEAN DEFAULT true NOT NULL,
            custom_parameters JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            UNIQUE(profile_id, lora_id)
          );
          
          -- Enable RLS
          ALTER TABLE public.user_lora_access ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can view their own lora access" 
            ON public.user_lora_access FOR SELECT 
            USING (auth.uid() = profile_id);
          
          CREATE POLICY "Users can update their own custom parameters" 
            ON public.user_lora_access FOR UPDATE 
            USING (auth.uid() = profile_id);
            
          RETURN 'Created user_lora_access table';
        ELSE
          RETURN 'user_lora_access table already exists';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Execute SQL to create stored procedures
    const { error: setupError } = await supabase.rpc('exec_sql', {
      sql: setupProceduresSql
    });
    
    if (setupError) {
      // If the exec_sql function doesn't exist, create it first
      if (setupError.message.includes('function exec_sql') || setupError.code === '42883') {
        // Create the exec_sql function
        const { error: createFuncError } = await supabase.rpc('setup_exec_sql_function');
        
        if (createFuncError) {
          // Manual execution of SQL to create the function
          const { error: sqlError } = await supabase.from('_manual_sql').select('*').eq('id', 'create_exec_sql').single();
          
          if (sqlError) {
            return NextResponse.json({
              success: false,
              error: 'Could not create exec_sql function',
              details: sqlError
            });
          }
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to set up procedures',
          details: setupError
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      loraModelsTable: createLoraModelsResult.error ? 'Error' : 'Success',
      userLoraAccessTable: createUserLoraAccessResult.error ? 'Error' : 'Success',
      modelInserted: !insertModelResult.error,
      errors: {
        loraModels: createLoraModelsResult.error,
        userLoraAccess: createUserLoraAccessResult.error,
        insertModel: insertModelResult.error
      }
    });
  } catch (error: unknown) {
    console.error('[LORA SETUP] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 