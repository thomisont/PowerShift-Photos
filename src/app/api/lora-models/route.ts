import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/_utils/server-client';
import { cookies } from 'next/headers';
import { replicate } from '@/lib/replicate';

// Interface for LoRA model
interface LoraModel {
  id: string;
  replicate_id: string;
  name: string;
  owner: string;
  version: string;
  description?: string;
  trigger_word?: string;
  is_active: boolean;
  default_parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Interface for user LoRA access
interface UserLoraAccess {
  id: string;
  profile_id: string;
  lora_id: string;
  is_owner: boolean;
  can_use: boolean;
  custom_parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Fetch trigger word from Replicate API metadata
async function fetchTriggerWord(replicateId: string): Promise<string | null> {
  try {
    // Parse replicate ID into owner/name:version
    const parts = replicateId.split(':');
    if (parts.length !== 2) {
      console.error(`[LORA API] Invalid replicate ID format: ${replicateId}`);
      return null;
    }
    
    const ownerAndModel = parts[0]; // e.g., "thomisont/betterthanheadshots-tjt"
    const version = parts[1]; // e.g., "dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da"
    
    // For the Replicate API, we need to get information in a slightly different way
    // We can access model descriptions directly through the raw API call
    // This is a simplification; in a production environment, a proper Replicate API client should be used
    
    try {
      // Try to directly get model description from a direct API call
      // Note: This is a simpler approach without using the proper Replicate client methods
      // which might have type issues
      const response = await fetch(`https://api.replicate.com/v1/models/${ownerAndModel}`);
      if (!response.ok) {
        console.error(`[LORA API] Failed to fetch model info for: ${ownerAndModel}`);
        return null;
      }
      
      const modelData = await response.json();
      const description = modelData.description || '';
      
      // Look for trigger word in model description
      const triggerWordMatch = 
        description.match(/trigger word is (\w+)/i) || 
        description.match(/trigger word: (\w+)/i) ||
        description.match(/trigger word "([^"]+)"/i);
      
      if (triggerWordMatch && triggerWordMatch[1]) {
        console.log(`[LORA API] Found trigger word for ${replicateId}: ${triggerWordMatch[1]}`);
        return triggerWordMatch[1];
      }
      
      // Check for trigger words in other common formats
      const otherTriggerMatches = 
        description.match(/Use the token "([^"]+)"/i) ||
        description.match(/Use token "([^"]+)"/i) ||
        description.match(/add "([^"]+)" to your prompt/i);
        
      if (otherTriggerMatches && otherTriggerMatches[1]) {
        console.log(`[LORA API] Found alternative trigger word for ${replicateId}: ${otherTriggerMatches[1]}`);
        return otherTriggerMatches[1];
      }
      
      // If the model has "BTHEADShOTS" in the name, it's likely the trigger word
      if (ownerAndModel.toLowerCase().includes('btheadshots')) {
        console.log(`[LORA API] Using "BTHEADSHOTS" as trigger word for ${replicateId} based on model name`);
        return "BTHEADSHOTS";
      }
      
      // For Better Than Headshots model, we know the trigger word
      if (ownerAndModel === 'thomisont/betterthanheadshots-tjt') {
        console.log(`[LORA API] Using known trigger word "BTHEADSHOTS" for Better Than Headshots`);
        return "BTHEADSHOTS";
      }
      
      return null;
    } catch (apiError) {
      console.error(`[LORA API] Error in Replicate API call:`, apiError);
      
      // Fallback for the specific model we know about
      if (ownerAndModel === 'thomisont/betterthanheadshots-tjt') {
        console.log(`[LORA API] Using known trigger word "BTHEADSHOTS" for Better Than Headshots (fallback)`);
        return "BTHEADSHOTS";
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[LORA API] Error fetching trigger word from Replicate:`, error);
    return null;
  }
}

// Update trigger word in database
async function updateTriggerWord(supabase: any, modelId: string, triggerWord: string) {
  try {
    const { error } = await supabase
      .from('lora_models')
      .update({ trigger_word: triggerWord })
      .eq('id', modelId);
      
    if (error) {
      console.error(`[LORA API] Failed to update trigger word:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[LORA API] Error updating trigger word:`, error);
    return false;
  }
}

// GET handler to fetch all available LoRA models
export async function GET(req: NextRequest) {
  try {
    console.log('[LORA API] Fetching available LoRA models');
    
    // Create Supabase client using server client
    const supabase = createServerSupabaseClient();
    
    // Try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Check for session errors
    if (sessionError) {
      console.error('[LORA API] Session error:', sessionError);
    }
    
    // Try a direct approach to get the LoRA models regardless of session
    const { data: loraModels, error } = await supabase
      .from('lora_models')
      .select('*')
      .eq('is_active', true);
      
    if (error) {
      console.error('[LORA API] Error fetching LoRA models:', error);
      return NextResponse.json({
        models: [],
        error: 'Failed to fetch LoRA models'
      });
    }

    // If we have no models, something is wrong
    if (!loraModels || loraModels.length === 0) {
      console.error('[LORA API] No LoRA models found in database');
      return NextResponse.json({
        models: [],
        message: "No models available"
      });
    }
    
    console.log(`[LORA API] Found ${loraModels.length} LoRA models`);
    
    // Check for missing trigger words and try to fetch them from Replicate
    for (const model of loraModels) {
      if (!model.trigger_word && model.replicate_id) {
        console.log(`[LORA API] Model ${model.name} is missing trigger word, fetching from Replicate...`);
        const triggerWord = await fetchTriggerWord(model.replicate_id);
        
        if (triggerWord) {
          console.log(`[LORA API] Setting trigger word for ${model.name} to "${triggerWord}"`);
          model.trigger_word = triggerWord;
          
          // Also update in database for future use
          await updateTriggerWord(supabase, model.id, triggerWord);
        }
      }
    }
    
    // If we have a session, try to get user-specific settings
    if (session) {
      // Check if user has any custom access settings
      const { data: userAccess, error: accessError } = await supabase
        .from('user_lora_access')
        .select('*')
        .eq('profile_id', session.user.id);
        
      if (accessError) {
        console.error('[LORA API] Error fetching user LoRA access:', accessError);
      }
      
      // If we have user access data, enrich the models
      if (userAccess && userAccess.length > 0) {
        const enrichedModels = loraModels.map((model: LoraModel) => {
          const userModel = userAccess.find((access: UserLoraAccess) => access.lora_id === model.id);
          if (userModel) {
            return {
              ...model,
              custom_parameters: userModel.custom_parameters,
              is_owner: userModel.is_owner,
              can_use: userModel.can_use
            };
          }
          return model;
        });
        
        console.log(`[LORA API] Enriched models with user settings`);
        
        return NextResponse.json({ 
          models: enrichedModels,
          user_id: session.user.id
        });
      }
    }
    
    // If no user-specific enrichment, just return the models
    return NextResponse.json({ 
      models: loraModels,
      user_id: session?.user?.id || null
    });
    
  } catch (error) {
    console.error('[LORA API] Unexpected error:', error);
    // Return an empty array instead of an error response
    return NextResponse.json({ 
      models: [],
      error: 'An unexpected error occurred'
    });
  }
}

// POST handler to update user's custom parameters for a LoRA model
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lora_id, custom_parameters } = body;
    
    if (!lora_id) {
      return NextResponse.json(
        { error: 'LoRA model ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`[LORA API] Updating custom parameters for LoRA model ${lora_id}`);
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('[LORA API] Unauthorized: No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user-lora access record exists
    const { data: existingAccess, error: checkError } = await supabase
      .from('user_lora_access')
      .select('*')
      .eq('profile_id', session.user.id)
      .eq('lora_id', lora_id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // Not found error
      console.error('[LORA API] Error checking user access:', checkError);
      return NextResponse.json(
        { error: 'Failed to check user access' },
        { status: 500 }
      );
    }
    
    let result;
    
    if (existingAccess) {
      // Update existing record
      const { data, error: updateError } = await supabase
        .from('user_lora_access')
        .update({ 
          custom_parameters,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccess.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('[LORA API] Error updating user access:', updateError);
        return NextResponse.json(
          { error: 'Failed to update custom parameters' },
          { status: 500 }
        );
      }
      
      result = data;
    } else {
      // Create new record
      const { data, error: insertError } = await supabase
        .from('user_lora_access')
        .insert({
          profile_id: session.user.id,
          lora_id,
          custom_parameters,
          is_owner: false,
          can_use: true
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('[LORA API] Error creating user access:', insertError);
        return NextResponse.json(
          { error: 'Failed to save custom parameters' },
          { status: 500 }
        );
      }
      
      result = data;
    }
    
    console.log('[LORA API] Successfully updated custom parameters');
    
    return NextResponse.json({ 
      success: true,
      access: result
    });
  } catch (error) {
    console.error('[LORA API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 