import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { PersonaCarousel } from '../PersonaCarousel';
import { usePersonaStore } from '@/stores/personaStore';

// Mock the persona store
vi.mock('@/stores/personaStore', () => ({
  usePersonaStore: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: '1',
                name: 'Officer Chen',
                image_url: 'https://example.com/chen.jpg',
                alt_text: 'Officer Chen profile picture',
                mood: 'Professional',
                is_visible: true,
              },
              {
                id: '2',
                name: 'Officer Rodriguez',
                image_url: 'https://example.com/rodriguez.jpg',
                alt_text: 'Officer Rodriguez profile picture',
                mood: 'Thorough',
                is_visible: true,
              },
              {
                id: '3',
                name: 'Officer Johnson',
                image_url: 'https://example.com/johnson.jpg',
                alt_text: 'Officer Johnson profile picture',
                mood: 'Friendly',
                is_visible: true,
              },
            ],
            error: null,
          }))
        }))
      }))
    }))
  }
}));

const mockStore = {
  selectedPersona: null,
  setSelectedPersona: vi.fn(),
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProvider = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PersonaCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePersonaStore as any).mockReturnValue(mockStore);
    mockStore.setSelectedPersona.mockClear();
  });

  it('renders personas correctly', async () => {
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Officer Chen')).toBeInTheDocument();
      expect(screen.getByText('Officer Rodriguez')).toBeInTheDocument();
      expect(screen.getByText('Officer Johnson')).toBeInTheDocument();
    });
  });

  it('renders persona moods correctly', async () => {
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('Thorough')).toBeInTheDocument();
      expect(screen.getByText('Friendly')).toBeInTheDocument();
    });
  });

  it('renders persona images with correct attributes', async () => {
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const chenImage = screen.getByAltText('Officer Chen profile picture');
      expect(chenImage).toHaveAttribute('src', 'https://example.com/chen.jpg');
      expect(chenImage).toHaveAttribute('loading', 'lazy');
      expect(chenImage).toHaveClass('w-20', 'h-20', 'object-cover', 'rounded-full');
    });
  });

  it('handles persona selection correctly', async () => {
    const user = userEvent.setup();
    const onSelectMock = vi.fn();
    renderWithProvider(<PersonaCarousel onSelect={onSelectMock} />);

    await waitFor(() => {
      const chenPersona = screen.getByTestId('persona-1');
      expect(chenPersona).toBeInTheDocument();
    });

    const chenPersona = screen.getByTestId('persona-1');
    await user.click(chenPersona);

    expect(mockStore.setSelectedPersona).toHaveBeenCalledWith('1');
    expect(onSelectMock).toHaveBeenCalledWith('1');
  });

  it('highlights selected persona', async () => {
    // Mock store with selected persona
    (usePersonaStore as any).mockReturnValue({
      selectedPersona: '2',
      setSelectedPersona: vi.fn(),
    });

    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const rodriguezPersona = screen.getByTestId('persona-2');
      const imageContainer = rodriguezPersona.querySelector('div');
      expect(imageContainer).toHaveClass('ring-2', 'ring-primary', 'ring-offset-2', 'scale-105');
    });
  });

  it('shows selection indicator on selected persona', async () => {
    (usePersonaStore as any).mockReturnValue({
      selectedPersona: '1',
      setSelectedPersona: vi.fn(),
    });

    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const chenPersona = screen.getByTestId('persona-1');
      const indicator = chenPersona.querySelector('.bg-primary\\/10');
      expect(indicator).toBeInTheDocument();
    });
  });

  it('does not show selection indicator on unselected personas', async () => {
    (usePersonaStore as any).mockReturnValue({
      selectedPersona: '1',
      setSelectedPersona: vi.fn(),
    });

    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const rodriguezPersona = screen.getByTestId('persona-2');
      const indicator = rodriguezPersona.querySelector('.bg-primary\\/10');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  it('renders loading state', () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => {
                // Simulate loading by never resolving
                return new Promise(() => {});
              })
            }))
          }))
        }))
      }
    }));

    renderWithProvider(<PersonaCarousel />);
    
    expect(screen.getByText('Select Your Interviewer')).toBeInTheDocument();
    expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
  });

  it('renders error state when no personas available', async () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              }))
            }))
          }))
        }))
      }
    }));

    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      expect(screen.getByText('No interviewers available at the moment.')).toBeInTheDocument();
    });
  });

  it('has proper horizontal scroll setup', async () => {
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const scrollContainer = screen.getByRole('generic', { hidden: true });
      expect(scrollContainer).toHaveClass('snap-x', 'snap-mandatory', 'overflow-x-auto');
    });
  });

  it('personas have snap-center class for proper snapping', async () => {
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const chenPersona = screen.getByTestId('persona-1');
      expect(chenPersona).toHaveClass('snap-center');
    });
  });

  it('applies hover effects correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const chenPersona = screen.getByTestId('persona-1');
      const imageContainer = chenPersona.querySelector('div');
      expect(imageContainer).toHaveClass('hover:scale-105');
    });
  });

  it('handles store updates correctly when persona is selected', async () => {
    const user = userEvent.setup();
    const setSelectedPersonaMock = vi.fn();
    
    (usePersonaStore as any).mockReturnValue({
      selectedPersona: null,
      setSelectedPersona: setSelectedPersonaMock,
    });

    renderWithProvider(<PersonaCarousel />);

    await waitFor(() => {
      const johnsonPersona = screen.getByTestId('persona-3');
      expect(johnsonPersona).toBeInTheDocument();
    });

    const johnsonPersona = screen.getByTestId('persona-3');
    await user.click(johnsonPersona);

    expect(setSelectedPersonaMock).toHaveBeenCalledWith('3');
  });

  it('maintains selection state across re-renders', async () => {
    const { rerender } = renderWithProvider(<PersonaCarousel />);

    (usePersonaStore as any).mockReturnValue({
      selectedPersona: '2',
      setSelectedPersona: vi.fn(),
    });

    rerender(<PersonaCarousel />);

    await waitFor(() => {
      const rodriguezPersona = screen.getByTestId('persona-2');
      const imageContainer = rodriguezPersona.querySelector('div');
      expect(imageContainer).toHaveClass('ring-2', 'ring-primary', 'ring-offset-2', 'scale-105');
    });
  });
});