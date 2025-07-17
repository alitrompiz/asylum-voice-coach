
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaCard } from '../PersonaCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

const mockPersona = {
  id: '1',
  name: 'Test Persona',
  image_url: 'https://example.com/image.jpg',
  alt_text: 'Test persona image',
  mood: 'Professional',
  position: 1,
  is_visible: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const renderWithClient = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PersonaCard', () => {
  const mockOnDelete = vi.fn();
  const mockOnToggleVisibility = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders persona information correctly', () => {
    renderWithClient(
      <PersonaCard
        persona={mockPersona}
        onDelete={mockOnDelete}
        onToggleVisibility={mockOnToggleVisibility}
      />
    );

    expect(screen.getByDisplayValue('Test Persona')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Professional')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByAltText('Test persona image')).toBeInTheDocument();
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    renderWithClient(
      <PersonaCard
        persona={mockPersona}
        onDelete={mockOnDelete}
        onToggleVisibility={mockOnToggleVisibility}
      />
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('calls onToggleVisibility when visibility switch is toggled', () => {
    renderWithClient(
      <PersonaCard
        persona={mockPersona}
        onDelete={mockOnDelete}
        onToggleVisibility={mockOnToggleVisibility}
      />
    );

    const visibilitySwitch = screen.getByRole('switch');
    fireEvent.click(visibilitySwitch);
    expect(mockOnToggleVisibility).toHaveBeenCalledWith('1', false);
  });

  it('triggers save when name is changed', async () => {
    renderWithClient(
      <PersonaCard
        persona={mockPersona}
        onDelete={mockOnDelete}
        onToggleVisibility={mockOnToggleVisibility}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Persona');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    expect(nameInput).toHaveValue('Updated Name');
    
    // Wait for debounce and check if save indicator appears
    await waitFor(() => {
      expect(screen.getByTestId('saving-indicator') || screen.getByTestId('success-indicator')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows square image with correct aspect ratio', () => {
    renderWithClient(
      <PersonaCard
        persona={mockPersona}
        onDelete={mockOnDelete}
        onToggleVisibility={mockOnToggleVisibility}
      />
    );

    const image = screen.getByAltText('Test persona image');
    expect(image).toHaveClass('aspect-square');
    expect(image).toHaveClass('object-cover');
  });
});
