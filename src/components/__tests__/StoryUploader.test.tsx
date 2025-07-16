import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StoryUploader } from '../StoryUploader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// Mock global fetch
global.fetch = vi.fn();

describe('StoryUploader', () => {
  const mockToast = vi.fn();
  const mockOnStoryAdded = vi.fn();
  const mockOnStoryUpdated = vi.fn();
  const mockOnStoryDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    // Mock auth user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } }
    });

    // Mock supabase queries
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    });
  });

  it('renders mode selection buttons', () => {
    render(<StoryUploader />);
    
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /paste text/i })).toBeInTheDocument();
  });

  it('switches between upload and text modes', () => {
    render(<StoryUploader />);
    
    const textModeButton = screen.getByRole('button', { name: /paste text/i });
    fireEvent.click(textModeButton);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/paste your story text/i)).toBeInTheDocument();
  });

  it('validates file size on upload', async () => {
    render(<StoryUploader />);
    
    const file = new File(['a'.repeat(11 * 1024 * 1024)], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByRole('button', { name: /choose pdf file/i });
    
    // Mock file input
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.click(fileInput);
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
    });
  });

  it('validates file type on upload', async () => {
    render(<StoryUploader />);
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByRole('button', { name: /choose pdf file/i });
    
    // Mock file input
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.click(fileInput);
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    });
  });

  it('validates text word count', async () => {
    render(<StoryUploader />);
    
    const textModeButton = screen.getByRole('button', { name: /paste text/i });
    fireEvent.click(textModeButton);
    
    const textarea = screen.getByRole('textbox');
    const longText = 'word '.repeat(2001);
    
    fireEvent.change(textarea, { target: { value: longText } });
    
    expect(screen.getByText(/too many words/i)).toBeInTheDocument();
    expect(screen.getByText(/2001 \/ 2000 words/i)).toBeInTheDocument();
  });

  it('saves text story successfully', async () => {
    const mockStoryData = {
      id: 'story-123',
      title: 'Test Story',
      story_text: 'This is a test story',
      source_type: 'text',
      user_id: 'user-123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockStoryData, error: null })
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    render(<StoryUploader onStoryAdded={mockOnStoryAdded} />);
    
    const textModeButton = screen.getByRole('button', { name: /paste text/i });
    fireEvent.click(textModeButton);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'This is a test story' } });
    
    const saveButton = screen.getByRole('button', { name: /save story/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnStoryAdded).toHaveBeenCalledWith({
        ...mockStoryData,
        source_type: 'text'
      });
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Story saved successfully"
      });
    });
  });

  it('handles PDF upload with S3 and OCR', async () => {
    const mockSignedUrlData = {
      signedUrl: 'https://s3.amazonaws.com/signed-url',
      filePath: 'stories/test.pdf',
      token: 'token-123'
    };

    const mockOcrData = {
      text: 'Extracted text from PDF',
      sections: { personalInfo: { name: 'Test User' } }
    };

    const mockStoryData = {
      id: 'story-123',
      title: 'test',
      story_text: 'Extracted text from PDF',
      source_type: 'pdf',
      user_id: 'user-123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    // Mock Supabase functions
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: mockSignedUrlData, error: null })
      .mockResolvedValueOnce({ data: mockOcrData, error: null });

    // Mock fetch for S3 upload
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200
    });

    // Mock database insert
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockStoryData, error: null })
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    render(<StoryUploader onStoryAdded={mockOnStoryAdded} />);
    
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByRole('button', { name: /choose pdf file/i });
    
    // Mock file input
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false
    });
    
    fireEvent.click(fileInput);
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('get-signed-url', {
        body: {
          fileName: 'test.pdf',
          contentType: 'application/pdf'
        }
      });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        mockSignedUrlData.signedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: file
        })
      );
    });

    await waitFor(() => {
      expect(mockOnStoryAdded).toHaveBeenCalledWith({
        ...mockStoryData,
        source_type: 'pdf'
      });
    });
  });

  it('shows existing stories', async () => {
    const mockStories = [
      {
        id: 'story-1',
        title: 'Story 1',
        story_text: 'This is story 1 content',
        source_type: 'text',
        user_id: 'user-123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 'story-2',
        title: 'Story 2',
        story_text: 'This is story 2 content',
        source_type: 'pdf',
        user_id: 'user-123',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      }
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    render(<StoryUploader />);
    
    await waitFor(() => {
      expect(screen.getByText('Story 1')).toBeInTheDocument();
      expect(screen.getByText('Story 2')).toBeInTheDocument();
    });
  });

  it('handles story deletion', async () => {
    const mockStories = [
      {
        id: 'story-1',
        title: 'Story 1',
        story_text: 'This is story 1 content',
        source_type: 'text',
        user_id: 'user-123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    render(<StoryUploader onStoryDeleted={mockOnStoryDeleted} />);
    
    await waitFor(() => {
      expect(screen.getByText('Story 1')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: '' }); // Trash icon
    fireEvent.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnStoryDeleted).toHaveBeenCalledWith('story-1');
    });
  });
});