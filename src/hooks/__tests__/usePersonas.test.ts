import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonas } from '../usePersonas';
import { useToast } from '../use-toast';
import { trackEvent } from '@/lib/tracking';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

vi.mock('../use-toast');
vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn()
}));

const mockToast = vi.fn();
const mockTrackEvent = vi.mocked(trackEvent);

describe('usePersonas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ 
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });
  });

  describe('fetchPersonas', () => {
    it('should fetch personas successfully', async () => {
      const mockPersonas = [
        {
          id: '1',
          name: 'Test Persona',
          mood: 'Happy',
          alt_text: 'Test alt text',
          image_url: 'https://example.com/image.jpg',
          is_visible: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockPersonas,
          error: null,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => usePersonas());

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.personas).toEqual(mockPersonas);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Database error');
      
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => usePersonas());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to fetch personas',
        variant: 'destructive',
      });
    });
  });

  describe('togglePersonaVisibility', () => {
    it('should toggle persona visibility successfully', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockUpdate,
        }),
      } as any);

      const { result } = renderHook(() => usePersonas());

      await act(async () => {
        await result.current.togglePersonaVisibility('1', false);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('persona_visibility_toggle', {
        persona_id: '1',
        is_visible: false,
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Persona hidden successfully',
      });
    });

    it('should handle toggle errors', async () => {
      const mockError = new Error('Update failed');
      
      const mockUpdate = vi.fn().mockResolvedValue({
        error: mockError,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockUpdate,
        }),
      } as any);

      const { result } = renderHook(() => usePersonas());

      await act(async () => {
        await result.current.togglePersonaVisibility('1', false);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to update persona visibility',
        variant: 'destructive',
      });
    });
  });

  describe('deletePersona', () => {
    it('should delete persona successfully', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      } as any);

      const { result } = renderHook(() => usePersonas());

      await act(async () => {
        await result.current.deletePersona('1');
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('persona_delete', {
        persona_id: '1',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Persona deleted successfully',
      });
    });

    it('should handle delete errors', async () => {
      const mockError = new Error('Delete failed');
      
      const mockDelete = vi.fn().mockResolvedValue({
        error: mockError,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      } as any);

      const { result } = renderHook(() => usePersonas());

      await act(async () => {
        await result.current.deletePersona('1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to delete persona',
        variant: 'destructive',
      });
    });
  });

  describe('bulkUploadPersonas', () => {
    it('should upload multiple personas successfully', async () => {
      const mockPersonas = [
        {
          name: 'Test Persona 1',
          mood: 'Happy',
          alt_text: 'Test alt text 1',
          image_file: new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        },
        {
          name: 'Test Persona 2',
          mood: 'Sad',
          alt_text: 'Test alt text 2',
          image_file: new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
        },
      ];

      // Mock storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      });

      // Mock database insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '1', name: 'Test Persona 1' },
            error: null,
          }),
        }),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => usePersonas());

      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkUploadPersonas(mockPersonas);
      });

      expect(bulkResult).toEqual({
        success: 2,
        errors: 0,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('personas_bulk_upload', {
        total: 2,
        success: 2,
        errors: 0,
      });
    });

    it('should handle mixed success and error results', async () => {
      const mockPersonas = [
        {
          name: 'Test Persona 1',
          mood: 'Happy',
          alt_text: 'Test alt text 1',
          image_file: new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        },
        {
          name: 'Test Persona 2',
          mood: 'Sad',
          alt_text: 'Test alt text 2',
          image_file: new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
        },
      ];

      // Mock first upload success, second upload failure
      const mockUpload = vi.fn()
        .mockResolvedValueOnce({
          data: { path: 'test-path' },
          error: null,
        })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '1', name: 'Test Persona 1' },
            error: null,
          }),
        }),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => usePersonas());

      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkUploadPersonas(mockPersonas);
      });

      expect(bulkResult).toEqual({
        success: 1,
        errors: 1,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('personas_bulk_upload', {
        total: 2,
        success: 1,
        errors: 1,
      });
    });
  });
});