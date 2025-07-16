import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/mixpanel';

export interface Persona {
  id: string;
  name: string;
  mood: string;
  alt_text: string;
  image_url: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonaUpload {
  name: string;
  mood: string;
  alt_text: string;
  image_file: File;
}

export const usePersonas = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPersonas(data || []);
    } catch (error) {
      console.error('Error fetching personas:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch personas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPersonaImage = async (file: File, filename: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('persona-images')
      .upload(`${Date.now()}-${filename}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('persona-images')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  };

  const createPersona = async (persona: PersonaUpload): Promise<Persona> => {
    const imageUrl = await uploadPersonaImage(persona.image_file, persona.name);

    const { data, error } = await supabase
      .from('personas')
      .insert([
        {
          name: persona.name,
          mood: persona.mood,
          alt_text: persona.alt_text,
          image_url: imageUrl,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const bulkUploadPersonas = async (personas: PersonaUpload[]) => {
    setLoading(true);
    const results = { success: 0, errors: 0 };

    try {
      for (const persona of personas) {
        try {
          await createPersona(persona);
          results.success++;
        } catch (error) {
          console.error(`Error uploading persona ${persona.name}:`, error);
          results.errors++;
        }
      }

      trackEvent('personas_bulk_upload', {
        total: personas.length,
        success: results.success,
        errors: results.errors,
      });

      toast({
        title: 'Bulk Upload Complete',
        description: `${results.success} personas uploaded successfully, ${results.errors} failed`,
      });

      await fetchPersonas();
    } finally {
      setLoading(false);
    }

    return results;
  };

  const togglePersonaVisibility = async (id: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('personas')
        .update({ is_visible: isVisible })
        .eq('id', id);

      if (error) throw error;

      setPersonas(prev =>
        prev.map(persona =>
          persona.id === id ? { ...persona, is_visible: isVisible } : persona
        )
      );

      trackEvent('persona_visibility_toggle', {
        persona_id: id,
        is_visible: isVisible,
      });

      toast({
        title: 'Success',
        description: `Persona ${isVisible ? 'shown' : 'hidden'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling persona visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update persona visibility',
        variant: 'destructive',
      });
    }
  };

  const deletePersona = async (id: string) => {
    try {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPersonas(prev => prev.filter(persona => persona.id !== id));

      trackEvent('persona_delete', { persona_id: id });

      toast({
        title: 'Success',
        description: 'Persona deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete persona',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  return {
    personas,
    loading,
    fetchPersonas,
    createPersona,
    bulkUploadPersonas,
    togglePersonaVisibility,
    deletePersona,
  };
};