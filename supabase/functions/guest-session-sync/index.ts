import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const {
      guestToken,
      guestName,
      expiresAt,
      storySource,
      storyText,
      storyFirstName,
      storyLastName,
      selectedTestStoryId,
      storyFilePath,
      selectedPersonaId,
      selectedLanguage,
      selectedSkills,
      sessionStartedAt,
      sessionEndedAt,
      sessionDurationSeconds,
      fullTranscript
    } = body;

    if (!guestToken) {
      return new Response(
        JSON.stringify({ error: 'Guest token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update object - only include fields that were provided
    const updateData: any = {};
    
    if (guestName !== undefined) updateData.guest_name = guestName;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt;
    if (storySource !== undefined) updateData.story_source = storySource;
    if (storyText !== undefined) updateData.story_text = storyText;
    if (storyFirstName !== undefined) updateData.story_first_name = storyFirstName;
    if (storyLastName !== undefined) updateData.story_last_name = storyLastName;
    if (selectedTestStoryId !== undefined) updateData.selected_test_story_id = selectedTestStoryId;
    if (storyFilePath !== undefined) updateData.story_file_path = storyFilePath;
    if (selectedPersonaId !== undefined) updateData.selected_persona_id = selectedPersonaId;
    if (selectedLanguage !== undefined) updateData.selected_language = selectedLanguage;
    if (selectedSkills !== undefined) updateData.selected_skills = selectedSkills;
    if (sessionStartedAt !== undefined) updateData.session_started_at = sessionStartedAt;
    if (sessionEndedAt !== undefined) updateData.session_ended_at = sessionEndedAt;
    if (sessionDurationSeconds !== undefined) updateData.session_duration_seconds = sessionDurationSeconds;
    if (fullTranscript !== undefined) updateData.full_transcript = fullTranscript;

    // Upsert guest session
    const { data, error } = await supabase
      .from('guest_sessions')
      .upsert({
        guest_token: guestToken,
        ...updateData
      }, {
        onConflict: 'guest_token'
      })
      .select()
      .single();

    if (error) {
      console.error('Error syncing guest session:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in guest-session-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
