import Replicate from 'replicate'
import { ReplicateModelID, ModelParameters, LoraModel } from '@/types/replicate'

// This will be set in Replit Secrets later
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''

// Print environment variables for debugging (remove in production)
console.log('Replicate API Token:', REPLICATE_API_TOKEN ? 'Set (hidden for security)' : 'NOT SET')

if (!REPLICATE_API_TOKEN) {
  console.error('Replicate API Token is missing. Please check your .env.local file.')
}

// Create a single replicate client for generating images
export const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
})

// Default model parameters
const DEFAULT_PARAMETERS: ModelParameters = {
  prompt: "",
  negative_prompt: "low quality, bad anatomy, blurry, disfigured, ugly",
  width: 1024,
  height: 1024,
  num_outputs: 1,
  scheduler: "K_EULER",
  num_inference_steps: 30,
  guidance_scale: 7.5,
}

// The Better Than Headshots LoRA model ID
const BETTER_THAN_HEADSHOTS_MODEL = "thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da" as ReplicateModelID;

// Default standard SDXL model
const DEFAULT_SDXL_MODEL = "stability-ai/sdxl:c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866bfb27c061316" as ReplicateModelID;

// Function to generate an image using a specified model
export async function generateImage(
  prompt: string, 
  modelId: ReplicateModelID = DEFAULT_SDXL_MODEL,
  customParams: Partial<ModelParameters> = {}
): Promise<string[] | null> {
  try {
    // Validate prompt
    if (!prompt || prompt.trim() === '') {
      console.error('[REPLICATE] Cannot generate image: Empty prompt');
      throw new Error('Empty prompt provided');
    }
    
    console.log('[REPLICATE] Generating image with prompt:', prompt);
    console.log('[REPLICATE] Using model:', modelId);
    
    // Verify we have a token
    if (!REPLICATE_API_TOKEN) {
      console.error('[REPLICATE] Cannot generate image: Missing Replicate API token');
      throw new Error('Missing Replicate API token');
    }

    // Merge default parameters with custom parameters
    const parameters: ModelParameters = {
      ...DEFAULT_PARAMETERS,
      prompt,
      ...customParams,
    };

    // Ensure that certain parameters are explicitly passed to ensure Replicate respects them
    console.log('[REPLICATE] Using parameters:', JSON.stringify(parameters, null, 2));

    // Log specific parameters we want to make sure are being passed correctly
    console.log(`[REPLICATE] Key settings - Format: ${parameters.output_format}, Aspect: ${parameters.aspect_ratio}, Dimensions: ${parameters.width}x${parameters.height}`);

    // Explicitly structure the parameters for the API call to ensure they're properly recognized
    const apiParameters = {
      // Include all base parameters first
      ...parameters,
      
      // Then override with forced values to ensure these specific parameters are respected
      output_format: parameters.output_format || 'png',
      width: parameters.width || 1024,
      height: parameters.height || 1024,
      aspect_ratio: parameters.aspect_ratio || '1:1',
      num_outputs: parameters.num_outputs || 1,
      num_inference_steps: parameters.num_inference_steps || 30,
      guidance_scale: parameters.guidance_scale || 7.5,
    };

    try {
      // Run the generation with the specified model
      const output = await replicate.run(
        modelId,
        { input: apiParameters }
      );
      
      // The output is typically an array of image URLs
      if (Array.isArray(output) && output.length > 0) {
        console.log(`[REPLICATE] ${output.length} image(s) generated successfully`);
        return output as string[];
      } else {
        console.error('[REPLICATE] Unexpected output format from Replicate', output);
        throw new Error('Unexpected output format from Replicate API');
      }
    } catch (replicateError) {
      console.error('[REPLICATE] Error from Replicate API:', replicateError);
      
      // Rethrow with a more helpful message
      const errorMessage = replicateError instanceof Error 
        ? replicateError.message 
        : 'Unknown Replicate API error';
        
      throw new Error(`Replicate API error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('[REPLICATE] Error generating image:', error);
    throw error; // Let the calling code handle this error
  }
}

// Function to generate an image specifically with the BetterThanHeadshots LoRA
export async function generateWithBetterThanHeadshots(
  prompt: string,
  customParams: Partial<ModelParameters> = {}
): Promise<string[] | null> {
  return generateImage(prompt, BETTER_THAN_HEADSHOTS_MODEL, customParams);
} 