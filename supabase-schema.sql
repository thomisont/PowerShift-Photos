-- Supabase Schema Verification and Correction Script
-- Run this script in the Supabase SQL Editor to ensure proper table relationships

-- Check if profiles table exists, create it if not
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create RLS policies for profiles
DO $$
BEGIN
  -- Drop existing RLS policies to recreate them
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  
  -- Enable RLS on profiles
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Create RLS policies
  CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);
  
  CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
  
  -- Allow public access for profile usernames
  CREATE POLICY "Public read access for profiles" 
    ON public.profiles FOR SELECT 
    USING (true);
END
$$;

-- Check if images table exists, create it if not, ensure proper foreign key and all needed columns
-- First check if the images table exists at all
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'images') THEN
    -- Table exists, check if prompt column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'images' AND column_name = 'prompt') THEN
      -- Add prompt column
      EXECUTE 'ALTER TABLE public.images ADD COLUMN prompt TEXT';
    END IF;
  ELSE
    -- Table doesn't exist, create it with all needed columns
    EXECUTE '
      CREATE TABLE public.images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT ''Generated Image'',
        description TEXT,
        prompt TEXT,
        model_parameters JSONB DEFAULT ''{}''::jsonb,
        is_public BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
      )
    ';
  END IF;
END
$$;

-- Create RLS policies for images
DO $$
BEGIN
  -- Drop existing RLS policies to recreate them
  DROP POLICY IF EXISTS "Users can view own images" ON public.images;
  DROP POLICY IF EXISTS "Public access for public images" ON public.images;
  DROP POLICY IF EXISTS "Users can insert own images" ON public.images;
  DROP POLICY IF EXISTS "Users can update own images" ON public.images;
  DROP POLICY IF EXISTS "Users can delete own images" ON public.images;
  
  -- Enable RLS on images
  ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
  
  -- Create RLS policies
  CREATE POLICY "Users can view own images" 
    ON public.images FOR SELECT 
    USING (auth.uid() = owner_id);
  
  CREATE POLICY "Public access for public images" 
    ON public.images FOR SELECT 
    USING (is_public = true);
  
  CREATE POLICY "Users can insert own images" 
    ON public.images FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);
  
  CREATE POLICY "Users can update own images" 
    ON public.images FOR UPDATE 
    USING (auth.uid() = owner_id);
  
  CREATE POLICY "Users can delete own images" 
    ON public.images FOR DELETE 
    USING (auth.uid() = owner_id);
END
$$;

-- Check if favorites table exists, create it if not, ensure proper foreign keys
CREATE TABLE IF NOT EXISTS public.favorites (
  id SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(profile_id, image_id)
);

-- Create RLS policies for favorites
DO $$
BEGIN
  -- Drop existing RLS policies to recreate them
  DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
  DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
  DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
  
  -- Enable RLS on favorites
  ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
  
  -- Create RLS policies
  CREATE POLICY "Users can view own favorites" 
    ON public.favorites FOR SELECT 
    USING (auth.uid() = profile_id);
  
  CREATE POLICY "Users can insert own favorites" 
    ON public.favorites FOR INSERT 
    WITH CHECK (auth.uid() = profile_id);
  
  CREATE POLICY "Users can delete own favorites" 
    ON public.favorites FOR DELETE 
    USING (auth.uid() = profile_id);
END
$$;

-- Create or replace a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$
BEGIN
  -- Profiles table updated_at trigger
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  
  -- Images table updated_at trigger
  DROP TRIGGER IF EXISTS update_images_updated_at ON public.images;
  CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
END
$$;

-- Create lora_models table
CREATE TABLE IF NOT EXISTS public.lora_models (
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

-- Create user_lora_access table
CREATE TABLE IF NOT EXISTS public.user_lora_access (
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

-- Add RLS policies for lora_models
ALTER TABLE public.lora_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active lora_models" 
  ON public.lora_models FOR SELECT 
  USING (is_active = true);

-- Add RLS policies for user_lora_access
ALTER TABLE public.user_lora_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lora access" 
  ON public.user_lora_access FOR SELECT 
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own custom parameters" 
  ON public.user_lora_access FOR UPDATE 
  USING (auth.uid() = profile_id);

-- Insert the betterthanheadshots LoRA model
INSERT INTO public.lora_models (replicate_id, name, owner, version, description, default_parameters)
VALUES (
  'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da',
  'Better Than Headshots',
  'thomisont',
  'v1.0',
  'Custom LoRA model optimized for professional headshots with improved quality and realism',
  '{
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
    "negative_prompt": "low quality, bad anatomy, blurry, disfigured, ugly",
    "width": 1024,
    "height": 1024,
    "scheduler": "K_EULER"
  }'::jsonb
)
ON CONFLICT (replicate_id) DO NOTHING; 