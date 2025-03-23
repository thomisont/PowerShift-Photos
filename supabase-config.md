# Supabase Project Configuration

## Database Schema

### Tables

#### 1. profiles
- **Structure**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );
  ```
- **Description**: Stores user profile information, linked to Supabase Auth.
- **Relationships**: One-to-many with images and favorites.
- **RLS Policies**:
  - Users can view their own profile
  - Users can update their own profile
  - Public read access for profile usernames

#### 2. images
- **Structure**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Generated Image',
    description TEXT,
    prompt TEXT,
    model_parameters JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );
  ```
- **Description**: Stores generated images and their metadata.
- **Relationships**: Many-to-one with profiles, one-to-many with favorites.
- **RLS Policies**:
  - Users can view their own images
  - Public access for public images
  - Users can insert their own images
  - Users can update their own images
  - Users can delete their own images

#### 3. favorites
- **Structure**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.favorites (
    id SERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(profile_id, image_id)
  );
  ```
- **Description**: Tracks which images users have favorited.
- **Relationships**: Many-to-one with both profiles and images.
- **RLS Policies**:
  - Users can view their own favorites
  - Users can insert their own favorites
  - Users can delete their own favorites

### Future Tables for LoRA Integration

#### 4. lora_models (Planned)
- **Structure**:
  ```sql
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
  ```
- **Description**: Stores metadata about available LoRA models.
- **Relationships**: One-to-many with image generations.

#### 5. user_lora_access (Planned)
- **Structure**:
  ```sql
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
  ```
- **Description**: Manages which users have access to which LoRA models.
- **Relationships**: Many-to-one with both profiles and lora_models.

## Current RLS Policies

RLS (Row Level Security) is configured for all tables to ensure proper data access control:

### profiles Policies
```sql
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Public read access for profiles" 
  ON public.profiles FOR SELECT 
  USING (true);
```

### images Policies
```sql
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
```

### favorites Policies
```sql
CREATE POLICY "Users can view own favorites" 
  ON public.favorites FOR SELECT 
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own favorites" 
  ON public.favorites FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own favorites" 
  ON public.favorites FOR DELETE 
  USING (auth.uid() = profile_id);
```

## Authentication Setup

- **Authentication Method**: JWT (JSON Web Tokens)
- **Token Handling**: Access tokens stored in client, refreshed through middleware
- **Token Location**: Authorization header for API requests
- **Auth Settings**:
  - Email authentication enabled
  - Confirm emails: false
  - Password recovery: true
  - JWT expiry: 3600 seconds (1 hour)

## Connection Details

- **Project URL**: `https://dvgpqrexjoenqinoxdku.supabase.co`
- **Project API Keys**:
  - Public (Anon) Key: Stored in .env.local
  - Service Role Key: Not used in client-side code for security 