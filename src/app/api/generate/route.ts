import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/replicate'
import { createServerSupabaseClient } from '@/app/api/_utils/server-client'
import { ReplicateModelID } from '@/types/replicate'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, loraId, parameters } = body
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'A valid prompt is required' },
        { status: 400 }
      )
    }
    
    console.log('[GENERATE API] Generating image with prompt:', prompt);
    console.log('[GENERATE API] LoRA ID:', loraId || 'Using default model');
    
    // Check if REPLICATE_API_TOKEN is available in environment
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('[GENERATE API] Missing Replicate API token in environment');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API token' },
        { status: 500 }
      )
    }

    // Default model and parameters
    let modelId: ReplicateModelID | undefined;
    let customParams = parameters || {};
    let loraName = 'Standard SDXL Model';

    // If a LoRA ID is provided, try to fetch the model
    if (loraId) {
      try {
        console.log(`[GENERATE API] Looking up LoRA model with ID: ${loraId}`);
        
        // Create a direct client without relying on cookies for more reliability
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase credentials');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        
        // Fetch the LoRA model
        const { data: loraModel, error } = await supabase
          .from('lora_models')
          .select('*')
          .eq('id', loraId)
          .eq('is_active', true)
          .single();
          
        if (error) {
          console.error('[GENERATE API] Error fetching LoRA model:', error);
          throw new Error('Failed to fetch LoRA model: ' + error.message);
        }
        
        if (!loraModel) {
          console.error('[GENERATE API] LoRA model not found or inactive');
          throw new Error('LoRA model not found or inactive');
        }
        
        // Set the model ID from the LoRA
        modelId = loraModel.replicate_id as ReplicateModelID;
        loraName = loraModel.name;
        
        // Merge default parameters from the LoRA model
        customParams = {
          ...loraModel.default_parameters,
          ...customParams
        };
        
        console.log(`[GENERATE API] Using LoRA model: ${loraModel.name} (${modelId})`);
      } catch (loraError) {
        console.error('[GENERATE API] Error with LoRA model:', loraError);
        // Continue with default model
        console.log('[GENERATE API] Falling back to default SDXL model');
      }
    }

    // Handle aspect ratio dimensions
    if (customParams.aspect_ratio && customParams.aspect_ratio !== 'custom') {
      // Parse the aspect ratio and set dimensions if needed
      const [widthRatio, heightRatio] = customParams.aspect_ratio.split(':').map(Number);
      
      if (widthRatio && heightRatio) {
        // Base the dimensions on the megapixels setting
        const megapixels = customParams.megapixels === '0.25' ? 0.25 : 1;
        const totalPixels = megapixels * 1000000; // Convert to actual pixels
        
        // Calculate the aspect ratio
        const aspectRatio = widthRatio / heightRatio;
        
        // Calculate dimensions to match the aspect ratio and total pixels
        let calculatedHeight = Math.round(Math.sqrt(totalPixels / aspectRatio));
        let calculatedWidth = Math.round(calculatedHeight * aspectRatio);
        
        // Round to nearest multiple of 8 (common requirement for image models)
        calculatedHeight = Math.floor(calculatedHeight / 8) * 8;
        calculatedWidth = Math.floor(calculatedWidth / 8) * 8;
        
        // Enforce minimum dimensions
        calculatedWidth = Math.max(calculatedWidth, 512);
        calculatedHeight = Math.max(calculatedHeight, 512);
        
        // Enforce maximum dimensions
        calculatedWidth = Math.min(calculatedWidth, 1536);
        calculatedHeight = Math.min(calculatedHeight, 1536);
        
        // Set the dimensions - use explicit assignment to ensure they're respected
        customParams.width = calculatedWidth;
        customParams.height = calculatedHeight;
        
        // Log the dimensions for debugging
        console.log(`[GENERATE API] Calculated dimensions for ${customParams.aspect_ratio} (${aspectRatio.toFixed(2)}): ${calculatedWidth}x${calculatedHeight}`);
        
        // For common non-square aspect ratios, use preset dimensions that are known to work well
        if (customParams.aspect_ratio === '16:9') {
          customParams.width = 1024;
          customParams.height = 576;
          console.log('[GENERATE API] Using preset 16:9 dimensions: 1024x576');
        } else if (customParams.aspect_ratio === '9:16') {
          customParams.width = 576;
          customParams.height = 1024;
          console.log('[GENERATE API] Using preset 9:16 dimensions: 576x1024');
        } else if (customParams.aspect_ratio === '4:3') {
          customParams.width = 1024;
          customParams.height = 768;
          console.log('[GENERATE API] Using preset 4:3 dimensions: 1024x768');
        } else if (customParams.aspect_ratio === '3:4') {
          customParams.width = 768;
          customParams.height = 1024;
          console.log('[GENERATE API] Using preset 3:4 dimensions: 768x1024');
        }
      }
    }

    // Print parameters for debugging
    console.log('[GENERATE API] Using parameters:', JSON.stringify(customParams, null, 2));

    // Generate the image using the Replicate API
    const imageUrls = await generateImage(prompt, modelId, customParams)
    
    if (!imageUrls || (Array.isArray(imageUrls) && imageUrls.length === 0)) {
      console.error('[GENERATE API] Failed to generate images, no URLs returned');
      return NextResponse.json(
        { error: 'Failed to generate images' },
        { status: 500 }
      )
    }
    
    console.log('[GENERATE API] Images generated successfully:', Array.isArray(imageUrls) ? imageUrls.length : 1);
    
    // Return the generated image URLs
    return NextResponse.json({ 
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls],
      imageUrl: Array.isArray(imageUrls) ? imageUrls[0] : imageUrls, // For backward compatibility
      modelId,
      modelName: loraName,
      parameters: customParams
    })
  } catch (error) {
    console.error('[GENERATE API] Error:', error)
    
    // Get a more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if the error is related to authentication
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || 
        errorMessage.includes('Unauthenticated') || errorMessage.includes('token')) {
      return NextResponse.json(
        { error: 'Authentication error with image generation service. Please check API key.' },
        { status: 401 }
      )
    }
    
    // Check if it's related to Replicate API
    if (errorMessage.includes('Replicate') || errorMessage.includes('replicate')) {
      return NextResponse.json(
        { error: 'Error connecting to image generation service: ' + errorMessage },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'An error occurred while generating the image: ' + errorMessage },
      { status: 500 }
    )
  }
} 