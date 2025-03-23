import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/_utils/server-client';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('[LORA SETUP SIMPLE] Starting simple LoRA setup');
    
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
      console.log('[LORA SETUP SIMPLE] Invalid admin key');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Direct SQL query to check if lora_models table exists
    const { data: tableExists, error: checkError } = await supabase.from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'lora_models')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // Not found
      return NextResponse.json({
        success: false,
        error: 'Failed to check if table exists',
        details: checkError
      });
    }
    
    const exists = !!tableExists;
    
    // If table doesn't exist, insert the model
    if (exists) {
      // Simple check if the model exists
      const { data: modelExists, error: modelCheckError } = await supabase
        .from('lora_models')
        .select('id')
        .eq('replicate_id', 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da')
        .single();
        
      if (modelCheckError && modelCheckError.code !== 'PGRST116') { // Not found
        return NextResponse.json({
          success: false,
          error: 'Failed to check if model exists',
          details: modelCheckError
        });
      }
      
      // If model doesn't exist, insert it
      if (!modelExists) {
        const { data: insertResult, error: insertError } = await supabase
          .from('lora_models')
          .insert({
            replicate_id: 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da',
            name: 'Better Than Headshots',
            owner: 'thomisont',
            version: 'v1.0',
            description: 'Custom LoRA model optimized for professional headshots with improved quality and realism',
            trigger_word: 'BTHEADSHOTS',
            is_active: true,
            default_parameters: {
              num_inference_steps: 30,
              guidance_scale: 7.5,
              negative_prompt: "low quality, bad anatomy, blurry, disfigured, ugly",
              width: 1024,
              height: 1024,
              scheduler: "K_EULER",
              aspect_ratio: "1:1",
              num_outputs: 1,
              model: "dev",
              lora_scale: 0.8,
              output_format: "png",
              seed: null, // Use random seed by default
              go_fast: false,
              disable_safety_checker: false,
              megapixels: "1"
            }
          });
          
        if (insertError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to insert model',
            details: insertError
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'LoRA model inserted successfully'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'LoRA model already exists'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'lora_models table does not exist',
        suggestion: 'Run the supabase-schema.sql file to create the table'
      });
    }
  } catch (error: unknown) {
    console.error('[LORA SETUP SIMPLE] Error:', error);
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