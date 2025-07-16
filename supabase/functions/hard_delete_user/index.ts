import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const { userId } = await req.json() as RequestBody;

    // Verify user can only delete their own data
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only delete own data' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`Starting hard delete for user: ${userId}`);

    // 1. Get all story files for deletion from storage
    const { data: storyFiles, error: storyFilesError } = await supabase
      .from('story_files')
      .select('file_path')
      .eq('user_id', userId);

    if (storyFilesError) {
      console.error('Error fetching story files:', storyFilesError);
    }

    // 2. Delete files from storage
    if (storyFiles && storyFiles.length > 0) {
      const filePaths = storyFiles.map(file => file.file_path);
      const { error: storageError } = await supabase.storage
        .from('story-files')
        .remove(filePaths);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
      } else {
        console.log(`Deleted ${filePaths.length} files from storage`);
      }
    }

    // 3. Delete all user data from database tables
    // Note: Due to CASCADE DELETE constraints, deleting the user will cascade to all related tables
    const tables = ['story_files', 'transcripts', 'minutes_balance', 'profiles'];
    
    for (const table of tables) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error(`Error deleting from ${table}:`, deleteError);
      } else {
        console.log(`Deleted data from ${table}`);
      }
    }

    // 4. Delete user from auth.users (this will cascade to all related tables)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`Successfully deleted user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        message: 'User data and account deleted successfully',
        deletedUserId: userId 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in hard_delete_user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});