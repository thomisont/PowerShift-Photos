# Transition Context: PowerShift® Photo App Custom LoRA Integration

## Project Overview

The PowerShift® Photo App is a Next.js application that allows users to generate AI headshots using Replicate's API, save them to a personal gallery, favorite them, and share them publicly. The app uses Supabase for authentication and data storage.

## Current State

We've successfully implemented and fixed the core functionality:

1. **Authentication** with Supabase using token-based auth
2. **Image Generation** using Replicate API
3. **Image Storage** in Supabase
4. **Favorites System** to bookmark images
5. **Public Gallery** with visibility controls
6. **Database Schema** with proper relationships between profiles, images, and favorites

All core features are now working, including:
- User sign-up and login
- Generating images with text prompts
- Saving images to the database
- Adding images to favorites
- Toggling images between public and private
- Viewing images in a public gallery

## Next Phase: Custom LoRA Integration

The next phase is to enhance the app with custom LoRA model integration. Specifically:

1. **Use a specific custom LoRA model**: `thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da`
2. **Develop a UI for selecting and using this LoRA**
3. **Implement custom parameter controls for the LoRA**
4. **Track and analyze results from this LoRA**

## Technical Details

### Replicate API Information

- **API Token**: Available in .env.local as `REPLICATE_API_TOKEN`
- **Custom LoRA ID**: `thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da`
- **User Account**: Associated with tom@thomison.com

### Database Schema Updates Needed

We need to implement:

1. **lora_models table** - To store metadata about available LoRA models
2. **user_lora_access table** - To manage which users have access to which LoRAs

The proposed schema is available in the `supabase-config.md` file.

### UI/UX Requirements

1. A **LoRA selection interface** on the generation page
2. **Parameter adjustment controls** specific to the selected LoRA
3. **Result comparison features** to analyze different outputs
4. **Usage tracking** to monitor LoRA performance

## Key Files and Components

### Current Implementation

- **Image Generation**: `src/app/generate/page.tsx` - Front-end for generating images
- **Generate API**: `src/lib/replicate.ts` - Replicate API integration
- **Supabase Client**: `src/lib/supabase.ts` - Database integration

### Files to Create/Modify

1. **LoRA Models API**: New endpoint at `/api/lora-models` to manage LoRA metadata
2. **LoRA Selection Component**: UI component for selecting LoRAs
3. **Parameter Controls**: Custom UI for LoRA-specific parameters
4. **Database Schema Updates**: SQL scripts for new tables

## Implementation Notes

1. **Authentication**: Continue using the token-based auth implemented in previous phases
2. **Error Handling**: Follow the pattern of detailed error logging established in existing API routes
3. **Testing**: Ensure thorough testing of access controls and parameter validation
4. **Documentation**: Update all relevant documentation as features are implemented

## Key Learnings from Previous Phases

1. **Supabase RLS Policies** are crucial for proper access control - ensure they're set up correctly
2. **Authentication Token Handling** must be consistent across all API routes
3. **Error Logging** with descriptive prefixes greatly simplifies debugging
4. **Database Schema Relationships** should be thoroughly validated before implementing features
5. **Image Domain Configuration** in next.config.js must be updated when using new image sources

## Documentation Resources

Refer to:
- **development-plan.md** - Overall project plan and architecture
- **supabase-config.md** - Database schema and configuration details
- **architecture-diagram.md** - Visual diagrams of the application architecture
- **.cursorrules** - Coding standards and guidelines for the project

## Priority Order for Implementation

1. Database schema updates for LoRA models
2. Basic LoRA selection UI
3. Integration with Replicate API for the specific LoRA
4. Parameter customization UI
5. Analytics and tracking features 