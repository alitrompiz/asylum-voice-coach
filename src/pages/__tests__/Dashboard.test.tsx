import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { useSkillsStore } from '@/stores/personaStore';

// Mock all the required hooks and stores
vi.mock('@/stores/personaStore', () => ({
  useSkillsStore: vi.fn(),
  usePersonaStore: vi.fn(() => ({
    selectedPersona: null,
    setSelectedPersona: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '550e8400-e29b-41d4-a716-446655440000' }
  })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                { credibility: 85, story_clarity: 78, case_strength: 92 },
                { credibility: 88, story_clarity: 82, case_strength: 89 }
              ],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Dashboard - Start Interview Button Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('disables Start Interview button when no skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: [],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeDisabled();
    });
  });

  it('enables Start Interview button when skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1', '2'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeEnabled();
    });
  });

  it('shows skill count in button when skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1', '2', '3'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toHaveTextContent('(3 skills)');
    });
  });

  it('shows helper text when no skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: [],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Select at least one skill to begin')).toBeInTheDocument();
    });
  });

  it('hides helper text when skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Select at least one skill to begin')).not.toBeInTheDocument();
    });
  });

  it('navigates to interview when Start Interview button is clicked', async () => {
    const user = userEvent.setup();
    
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeEnabled();
    });

    const startButton = screen.getByRole('button', { name: /start interview/i });
    await user.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith('/interview');
  });

  it('has full-width button on mobile', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toHaveClass('w-full');
    });
  });

  it('has fixed positioning on mobile', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const buttonContainer = screen.getByRole('button', { name: /start interview/i }).parentElement;
      expect(buttonContainer).toHaveClass('fixed', 'bottom-4', 'left-4', 'right-4');
    });
  });

  it('has proper responsive layout classes', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const buttonContainer = screen.getByRole('button', { name: /start interview/i }).parentElement;
      expect(buttonContainer).toHaveClass('md:relative', 'md:bottom-auto', 'md:left-auto', 'md:right-auto', 'md:max-w-6xl', 'md:mx-auto');
    });
  });

  it('has proper padding on main container for fixed button', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: [],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const mainContainer = screen.getByRole('main') || document.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('pb-24', 'md:pb-4');
    });
  });

  it('updates button state when skills selection changes', async () => {
    const { rerender } = renderWithProviders(<Dashboard />);

    // Initially no skills selected
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: [],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    rerender(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeDisabled();
    });

    // Skills selected
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1', '2'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    rerender(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeEnabled();
      expect(startButton).toHaveTextContent('(2 skills)');
    });
  });

  it('handles single skill selection correctly', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start interview/i });
      expect(startButton).toBeEnabled();
      expect(startButton).toHaveTextContent('(1 skills)'); // Note: the component shows "skills" even for 1
    });
  });

  it('renders all dashboard components', async () => {
    (useSkillsStore as any).mockReturnValue({
      skillsSelected: ['1'],
      toggleSkill: vi.fn(),
      clearSkills: vi.fn(),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      // Check for main dashboard elements
      expect(screen.getByText('Interview Practice Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Prepare for your asylum interview with AI-powered practice sessions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start interview/i })).toBeInTheDocument();
    });
  });
});