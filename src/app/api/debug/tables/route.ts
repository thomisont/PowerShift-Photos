import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/_utils/server-client';

// Define interface for table results
interface TableResult {
  exists: boolean;
  error: string | null;
  data: string | null;
}

// Define interface for table results collection
interface TableResults {
  [key: string]: TableResult;
}

export async function GET(req: NextRequest) {
  try {
    console.log('[DEBUG API] Checking database tables');
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get environment variables status
    const envStatus = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      replicateToken: !!process.env.REPLICATE_API_TOKEN,
    };
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Check the tables
    const tables = ['profiles', 'images', 'favorites', 'lora_models', 'user_lora_access'];
    const tableResults: TableResults = {};
    
    for (const table of tables) {
      try {
        // Try to get a single row from each table
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        tableResults[table] = {
          exists: !error,
          error: error ? error.message : null,
          data: data ? 'Data found' : 'No data',
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        tableResults[table] = {
          exists: false,
          error: errorMessage,
          data: null,
        };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envStatus,
      session: {
        exists: !!session,
        error: sessionError ? sessionError.message : null,
        user: session ? { id: session.user.id, email: session.user.email } : null,
      },
      tables: tableResults,
    });
  } catch (error: unknown) {
    console.error('[DEBUG API] Error checking tables:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'An error occurred while checking tables',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
} 