# PowerShift® Photo App Development Plan

## Current State

### Completed Features
- **Authentication**: Token-based authentication with Supabase Auth
- **Image Generation**: Integration with Replicate API to generate headshots
- **Image Storage**: Saving generated images to Supabase storage
- **Favorites System**: Adding and removing images from user favorites
- **Gallery View**: Public gallery showing images marked as public
- **Public/Private Toggle**: Controls for users to make their images public or private

### Technical Components
- **Frontend**: Next.js 14 with App Router, Server Components, and TypeScript
- **Authentication**: Supabase Auth with token-based authentication
- **Database**: Supabase Postgres with tables for profiles, images, and favorites
- **Image Generation**: Replicate API for AI image generation
- **UI**: Tailwind CSS for styling

### Database Schema
- **profiles**: User profiles linked to Supabase Auth
- **images**: Generated images with metadata (prompt, parameters, etc.)
- **favorites**: User-favorited images

## Next Phase: Custom LoRA Integration

### Features to Implement
1. **Custom LoRA Selection**: Allow users to select from available custom LoRAs
2. **Personal LoRA Dashboard**: Display user's available LoRAs and their details
3. **LoRA-specific Parameters**: Customize generation parameters based on LoRA
4. **LoRA Performance Metrics**: Track and display results from each LoRA

### Technical Approach
1. **Replicate API Integration**: Use Replicate API to access custom LoRAs
2. **LoRA Metadata Schema**: Add tables/columns for storing LoRA details and user preferences
3. **Parameter UI**: Create intuitive interfaces for adjusting LoRA-specific parameters
4. **Results Tracking**: Implement analytics for tracking LoRA performance

### Implementation Plan
1. **Phase 1**: Basic LoRA selection and integration (current focus)
2. **Phase 2**: Enhanced parameter controls and LoRA-specific optimizations
3. **Phase 3**: Performance tracking and analytics dashboard
4. **Phase 4**: Social sharing and community features

## Technical Architecture

### Frontend Architecture
- **Page Components**: Main pages for generation, gallery, favorites, etc.
- **UI Components**: Reusable UI elements (buttons, cards, modals)
- **Context Providers**: Auth context, LoRA selection context, etc.
- **API Clients**: Wrapper functions for Supabase and Replicate APIs

### Backend Architecture
- **API Routes**: Next.js API routes for handling server-side logic
- **Database Models**: Supabase tables and relationships
- **Authentication**: Token-based Supabase authentication
- **External Services**: Replicate API for image generation

### Data Flow
1. User authenticates → Receives auth token
2. User selects LoRA and parameters → Sends to Replicate API
3. Generated image returned → Saved to Supabase with metadata
4. Images retrieved for gallery/favorites with proper authorization

## Deployment Strategy
- **Development**: Local development with Next.js dev server
- **Production**: Deployment on Replite platform
- **Environment Variables**: Stored securely in Replite secrets
- **Database**: Supabase project with production and development environments 