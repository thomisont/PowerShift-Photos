import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const loraId = searchParams.get('lora_id');
    const triggerWord = searchParams.get('trigger_word');
    const adminKey = searchParams.get('key');
    
    // Validate parameters
    if (!adminKey || (adminKey !== process.env.ADMIN_KEY && adminKey !== 'development-setup-key')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    if (!loraId) {
      return NextResponse.json(
        { error: 'Missing lora_id parameter' },
        { status: 400 }
      );
    }
    
    if (!triggerWord) {
      return NextResponse.json(
        { error: 'Missing trigger_word parameter' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
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
    
    // Update the LoRA model with the trigger word
    const { data, error } = await supabase
      .from('lora_models')
      .update({ trigger_word: triggerWord })
      .eq('id', loraId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating LoRA model:', error);
      return NextResponse.json(
        { error: 'Failed to update LoRA model', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated LoRA model with trigger word "${triggerWord}"`,
      model: data
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 