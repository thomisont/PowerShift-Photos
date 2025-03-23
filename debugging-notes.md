# PowerShift Photo App - Debugging Notes

## Potential Issues Analysis

After examining the codebase and error logs, I've identified several potential issues causing the authentication and favorites functionality problems:

### 1. Database Schema Relationship Issues

**Problem:** Error logs show `"Could not find a relationship between 'images' and 'profiles' in the schema cache"` when trying to fetch public images.

**Cause:** The gallery API is attempting to use a nested select syntax (`profiles (username)`) which requires a properly defined foreign key relationship between the tables.

**Solution:** 
- Modified the gallery API to use separate queries instead of nested selection
- Added manual joining of profile data to images after fetching both separately

### 2. Authentication Flow Issues

**Problem:** Error logs show `"AuthSessionMissingError: Auth session missing!"` when trying to access protected routes.

**Cause:** The authentication system may be failing due to:
- Inconsistent cookie handling between client and server
- Outdated Supabase client packages
- Middleware configuration issues

**Solution:**
- Updated middleware to use the newer `@supabase/ssr` package
- Standardized cookie handling across all API routes
- Created a centralized server client utility for consistency

### 3. Duplicate Profile Creation

**Problem:** Error logs show `"duplicate key value violates unique constraint "profiles_pkey""` when creating a profile.

**Cause:** When saving an image, the app attempts to create a profile if one doesn't exist, but multiple concurrent requests might try to create the same profile.

**Solution:**
- Added specific error handling for the duplicate key case (code '23505')
- Allowed the flow to continue when profile already exists instead of returning an error

### 4. Missing Foreign Key Configuration in Supabase

**Problem:** Unable to use nested selections between tables.

**Cause:** The Supabase schema doesn't have the proper foreign key relationships defined between tables.

**Solution:**
- Modified query approach to avoid nested selections
- Manual joining of data from separate queries

### 5. Cookie Parsing Errors

**Problem:** Errors like `"Failed to parse cookie string: [SyntaxError: Unexpected token b in JSON at position 0]"`.

**Cause:** Incompatibility between different Supabase package versions or incorrect cookie format.

**Solution:**
- Standardized on the newer `@supabase/ssr` package
- Implemented consistent cookie handling across all routes

## Logging Strategy

To diagnose the remaining issues, I've implemented a comprehensive logging strategy:

1. **Contextual Prefixes:** All logs include prefixes like `[GALLERY API]` to easily identify their source

2. **Sequential Operation Logs:** Each API route logs its progression through operations:
   - Initial request receipt
   - Client creation
   - Authentication check
   - Database operations
   - Success or failure states

3. **Data Validation Logs:** Key data points are logged:
   - User authentication status
   - IDs of relevant records
   - Query results and counts

4. **Detailed Error Handling:** Error logs include:
   - Specific error codes (e.g., PGRST116, 23505)
   - Error messages and details
   - Error context

## Next Steps

1. **Validate Authentication Flow:**
   - Check logs for any `[AUTH]` errors
   - Verify if user sessions are being properly created and maintained

2. **Verify Database Relationships:**
   - Analyze the logs from the gallery API to confirm if basic queries work
   - Ensure profiles can be fetched and joined with images

3. **Monitor Favorite Operations:**
   - Check the favorites API logs for any failures in creating or deleting favorites
   - Verify if the "duplicate profile key" error is properly handled

4. **Test Gallery Functionality:**
   - Verify that public images are being fetched correctly
   - Confirm that user data is being properly associated with images

## Resolution Priorities

1. Fix authentication session persistence
2. Ensure proper database schema and relationships
3. Resolve the favorites functionality
4. Complete the gallery feature with proper user attribution

By following this approach and analyzing the logs, we should be able to identify and fix the remaining issues with the favorites system and related functionality.

## Comprehensive Solution (March 22, 2024)

After analyzing the codebase and error patterns, the following comprehensive fixes have been implemented:

### 1. Authentication Improvements

1. **Centralized Token-Based Authentication**
   - Created a standard `createClientWithToken` utility in `lib/supabase.ts`
   - Updated all API routes to use consistent token authentication
   - Added explicit auth configuration with `persistSession` and `autoRefreshToken` options
   - Used a custom `storageKey` for better token persistence

2. **Optimized Middleware**
   - Limited middleware to only non-API routes to avoid token conflicts
   - Added better error logging and session validation
   - Implemented proper Authorization header detection

### 2. Database Relationship Handling

1. **Removed Nested Query Dependencies**
   - Replaced nested profile queries with separate sequential queries
   - Implemented manual data joining with Maps for performance
   - Added chunked queries to handle potential large result sets

2. **Profile Creation Strategy**
   - Implemented "try-first" approach: try saving image directly, only create profile if needed
   - Added explicit foreign key error handling (23503 error code)
   - Ensured profile creation in all relevant API endpoints

### 3. Error Handling Improvements

1. **Enhanced Logging**
   - Added consistent logging prefixes across all components
   - Implemented detailed error logging with error codes
   - Added transaction tracking across API stages

2. **Request Flow Resilience**
   - Added robust error handling with fallbacks
   - Implemented proper duplicate key handling (23505 error code)
   - Separated concern between auth errors and database errors

### 4. Environment Fixes

1. **NPX Compatibility**
   - Created `start-app.sh` script for conda environments
   - Used local node_modules binaries through PATH extension
   - Ensured correct executable permissions

### Next Steps

1. Run the app using `./start-app.sh` instead of direct npm commands
2. Monitor the logs for any remaining authentication issues
3. If foreign key errors persist, check the Supabase schema directly in the dashboard
4. Consider implementing database migrations to ensure proper table relationships

These changes maintain the existing app architecture while addressing the core issues through improved error handling, authentication management, and database query strategies.

## Updated Solution (March 24, 2024)

After continued testing, we found that the image saving functionality still had issues. Here's how we fixed it:

### 1. Database Schema Verification

1. **Created Schema Verification Script**
   - Added `supabase-schema.sql` to ensure all tables and relationships are properly defined
   - Fixed potential foreign key constraints between `profiles`, `images`, and `favorites` tables
   - Added proper RLS (Row Level Security) policies to ensure proper access control

2. **Profile Creation Strategy Change**
   - Changed from "try-first" to "ensure-first" approach: always check and create profile before saving image
   - This eliminates race conditions and ensures profile records always exist before associated data is created

### 2. Enhanced Error Handling and Logging

1. **Detailed Error Information**
   - Added JSON.stringify for all error objects to see all properties including codes, hints, and details
   - Included more specific error messages in API responses
   - Added extensive logging around profile creation and image saving

2. **Improved Debug Tools**
   - Created `debug-image-save.js` to test direct database operations outside the API layer
   - Added step-by-step verification process to catch specific failure points

### 3. Cache and Environment Issues

1. **Cache Clearing**
   - Added cache clearing to `start-app.sh` to prevent stale webpack caches
   - This helps avoid ENOENT errors and other cache-related issues during development

2. **Environment Consistency**
   - Simplified the data structure sent to Supabase to reduce potential serialization issues
   - Ensured proper JSON handling for `model_parameters` field

### Next Steps for Troubleshooting

If issues persist, follow these steps:

1. Run the debug script to test direct database access: `node debug-image-save.js`
2. Check for RLS policy issues in the Supabase dashboard (sometimes policies block operations)
3. Verify the image URL is accessible and properly formatted
4. Check Supabase logs for any additional errors not captured in our application logs
5. Consider running the SQL schema verification script in the Supabase SQL Editor

Remember to restart the server with the cache clearing script when testing changes:

```bash
./start-app.sh
``` 