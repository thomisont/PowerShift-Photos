# PowerShift® Photo App

A web application for generating custom headshots using AI and managing your favorite images.

## Features

- User authentication with Supabase
- AI-powered headshot generation using Flux 1.1 LoRA model on Replicate
- Save and favorite images
- Public gallery to view shared images
- Download functionality for saved images

## Tech Stack

- **Frontend:** Next.js 14+ with App Router, React 18, and TypeScript
- **Styling:** Tailwind CSS
- **Authentication & Database:** Supabase
- **Image Generation:** Replicate API (Flux 1.1 LoRA model)
- **Hosting:** Replit

## Local Development Setup

1. **Prerequisites**
   - Node.js 18.17.0 or later
   - npm or yarn

2. **Installation**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd powershift-photo-app

   # Install dependencies
   npm install
   # or
   yarn install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   REPLICATE_API_TOKEN=your_replicate_api_token
   ```

4. **Running the Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Replit

1. Push your code to GitHub
2. Import the repository into Replit
3. Set up Secrets in the Replit environment (equivalent to environment variables)
4. Set the run command to `npm run dev`

## License

This project is proprietary and confidential. 