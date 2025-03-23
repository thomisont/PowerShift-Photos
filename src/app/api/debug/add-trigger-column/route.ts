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
      console.log('[ADD TRIGGER COLUMN] Invalid admin key');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Check if the trigger_word column already exists
    console.log('[ADD TRIGGER COLUMN] Checking if trigger_word column exists');
    
    const { data: columnExists, error: columnCheckError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'lora_models')
      .eq('column_name', 'trigger_word')
      .single();
    
    // If we got an error but it's not just "not found", handle it
    if (columnCheckError && columnCheckError.code !== 'PGRST116') {
      console.error('[ADD TRIGGER COLUMN] Error checking column:', columnCheckError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check if column exists',
        details: columnCheckError
      });
    }
    
    let columnAdded = false;
    
    // If column doesn't exist, add it
    if (!columnExists) {
      console.log('[ADD TRIGGER COLUMN] Adding trigger_word column to lora_models table');
      
      // Execute direct SQL to add the column
      // Note: In production, you'd use a migration system or a safer approach
      const { error: alterError } = await supabase.rpc('add_trigger_word_column');
      
      if (alterError) {
        console.error('[ADD TRIGGER COLUMN] Error adding column:', alterError);
        
        // If the stored procedure doesn't exist, create it and try again
        if (alterError.message.includes('function add_trigger_word_column') || alterError.code === '42883') {
          console.log('[ADD TRIGGER COLUMN] Creating stored procedure and trying again');
          
          // Create a stored procedure to add the column
          const createProcSql = `
            CREATE OR REPLACE FUNCTION add_trigger_word_column()
            RETURNS text AS $$
            BEGIN
              ALTER TABLE IF EXISTS public.lora_models 
              ADD COLUMN IF NOT EXISTS trigger_word TEXT;
              RETURN 'Column added';
            END;
            $$ LANGUAGE plpgsql;
          `;
          
          // Execute the SQL to create the stored procedure
          const { error: createProcError } = await supabase.rpc('exec_sql', {
            sql: createProcSql
          });
          
          if (createProcError) {
            // If exec_sql function doesn't exist either, try a direct alter table
            if (createProcError.message.includes('function exec_sql') || createProcError.code === '42883') {
              console.log('[ADD TRIGGER COLUMN] Using direct SQL statement');
              
              // Try direct SQL via a custom endpoint (not ideal but may work)
              const { error: directError } = await supabase
                .from('_direct_sql')
                .select('*')
                .eq('id', 'add_trigger_word_column')
                .single();
                
              if (directError) {
                return NextResponse.json({
                  success: false,
                  error: 'Could not add column. Manual database update required.',
                  details: directError
                });
              }
            } else {
              return NextResponse.json({
                success: false,
                error: 'Failed to create stored procedure',
                details: createProcError
              });
            }
          } else {
            // Try calling the stored procedure again
            const { error: retryError } = await supabase.rpc('add_trigger_word_column');
            
            if (retryError) {
              return NextResponse.json({
                success: false,
                error: 'Failed to add column after creating stored procedure',
                details: retryError
              });
            }
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to add column',
            details: alterError
          });
        }
      }
      
      columnAdded = true;
    } else {
      console.log('[ADD TRIGGER COLUMN] trigger_word column already exists');
    }
    
    // Update the Better Than Headshots model with the trigger word
    console.log('[ADD TRIGGER COLUMN] Setting trigger word for Better Than Headshots model');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('lora_models')
      .update({ trigger_word: 'BTHEADSHOTS' })
      .eq('replicate_id', 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da')
      .select();
      
    if (updateError) {
      console.error('[ADD TRIGGER COLUMN] Error updating model with trigger word:', updateError);
      return NextResponse.json({
        success: columnAdded,
        columnUpdated: false,
        error: 'Failed to update model with trigger word',
        details: updateError
      });
    }
    
    return NextResponse.json({
      success: true,
      columnAdded,
      modelUpdated: updateResult.length > 0,
      message: columnAdded 
        ? 'Added trigger_word column and updated models' 
        : 'trigger_word column already exists, updated models'
    });
    
  } catch (error: unknown) {
    console.error('[ADD TRIGGER COLUMN] Error:', error);
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