// Type for Replicate model ID
export type ReplicateModelID = `${string}/${string}` | `${string}/${string}:${string}`;

// Type definitions for model parameters
export interface ModelParameters {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_outputs?: number;
  scheduler?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  
  // Additional parameters from Replicate API
  image?: string; // For image-to-image
  mask?: string; // For inpainting
  aspect_ratio?: "1:1" | "16:9" | "21:9" | "3:2" | "2:3" | "4:5" | "5:4" | "3:4" | "4:3" | "9:16" | "9:21" | "custom";
  prompt_strength?: number; // For image-to-image, default is 0.8
  model?: "dev" | "schnell"; // Which model to run, dev or schnell
  seed?: number | null; // Random seed for reproducible generation
  output_format?: "webp" | "jpg" | "png";
  output_quality?: number; // Quality when saving images (0-100)
  disable_safety_checker?: boolean;
  go_fast?: boolean; // Run faster predictions
  megapixels?: "1" | "0.25"; // Approximate megapixels
  lora_scale?: number; // How strongly the LoRA should be applied
  extra_lora?: string; // Load additional LoRA weights
  extra_lora_scale?: number; // How strongly extra LoRA should be applied
  
  // Allow for additional custom parameters
  [key: string]: any;
}

// Interface for LoRA model
export interface LoraModel {
  id: string;
  replicate_id: ReplicateModelID;
  name: string;
  owner: string;
  version: string;
  description?: string;
  trigger_word?: string;
  is_active: boolean;
  default_parameters: ModelParameters;
  custom_parameters?: Record<string, any>; // User-specific custom parameters
}

// Interface for user LoRA access
export interface UserLoraAccess {
  id: string;
  profile_id: string;
  lora_id: string;
  is_owner: boolean;
  can_use: boolean;
  custom_parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
} 