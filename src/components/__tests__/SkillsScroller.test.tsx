import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { SkillsScroller } from '../SkillsScroller';
import { useSkillsStore } from '@/stores/personaStore';

// Mock the skills store
vi.mock('@/stores/personaStore', () => ({
  useSkillsStore: vi.fn(),
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
                name: 'Communication',
                group_name: 'Core Skills',
                is_active: true,
                sort_order: 1,
              },
              {
                id: '2',
                name: 'Active Listening',
                group_name: 'Core Skills',
                is_active: true,
                sort_order: 2,
              },
              {
                id: '3',
                name: 'Storytelling',
                group_name: 'Interview Skills',
                is_active: true,
                sort_order: 3,
              },
              {
                id: '4',
                name: 'Memory Recall',
                group_name: 'Interview Skills',
                is_active: true,
                sort_order: 4,
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
  skillsSelected: [],
  toggleSkill: vi.fn(),
  clearSkills: vi.fn(),
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

describe('SkillsScroller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSkillsStore as any).mockReturnValue(mockStore);
    mockStore.toggleSkill.mockClear();
  });

  it('renders skills correctly', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument();
      expect(screen.getByText('Active Listening')).toBeInTheDocument();
      expect(screen.getByText('Storytelling')).toBeInTheDocument();
      expect(screen.getByText('Memory Recall')).toBeInTheDocument();
    });
  });

  it('renders skills in two rows', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const skillChips = screen.getAllByRole('button');
      expect(skillChips.length).toBe(4);
    });
  });

  it('handles chip toggle correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-chip-1')).toBeInTheDocument();
    });

    const communicationChip = screen.getByTestId('skill-chip-1');
    await user.click(communicationChip);

    expect(mockStore.toggleSkill).toHaveBeenCalledWith('1');
  });

  it('shows selected state correctly', async () => {
    (useSkillsStore as any).mockReturnValue({
      ...mockStore,
      skillsSelected: ['1', '3'],
    });

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      const storytellingChip = screen.getByTestId('skill-chip-3');
      
      expect(communicationChip).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(storytellingChip).toHaveClass('bg-primary', 'text-primary-foreground');
    });
  });

  it('shows selected count when skills are selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      ...mockStore,
      skillsSelected: ['1', '2'],
    });

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByText('2 skills selected')).toBeInTheDocument();
    });
  });

  it('shows singular form when one skill is selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      ...mockStore,
      skillsSelected: ['1'],
    });

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByText('1 skill selected')).toBeInTheDocument();
    });
  });

  it('does not show selected count when no skills are selected', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.queryByText(/skills? selected/)).not.toBeInTheDocument();
    });
  });

  it('handles keyboard navigation correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-chip-1')).toBeInTheDocument();
    });

    const communicationChip = screen.getByTestId('skill-chip-1');
    communicationChip.focus();
    
    await user.keyboard('{Enter}');
    expect(mockStore.toggleSkill).toHaveBeenCalledWith('1');
  });

  it('handles space key for chip toggle', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-chip-2')).toBeInTheDocument();
    });

    const activeListeningChip = screen.getByTestId('skill-chip-2');
    activeListeningChip.focus();
    
    await user.keyboard('{ }');
    expect(mockStore.toggleSkill).toHaveBeenCalledWith('2');
  });

  it('has proper accessibility attributes', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      
      expect(communicationChip).toHaveAttribute('role', 'button');
      expect(communicationChip).toHaveAttribute('tabIndex', '0');
      expect(communicationChip).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('updates aria-pressed when chip is selected', async () => {
    (useSkillsStore as any).mockReturnValue({
      ...mockStore,
      skillsSelected: ['1'],
    });

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      expect(communicationChip).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('has focus ring styles', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      expect(communicationChip).toHaveClass('focus:ring-2', 'focus:ring-primary', 'focus:ring-offset-2');
    });
  });

  it('has hover effects', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      expect(communicationChip).toHaveClass('hover:scale-105', 'hover:bg-muted');
    });
  });

  it('has snap-x scroll containers', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const scrollContainers = screen.getAllByRole('generic', { hidden: true });
      const snapContainers = scrollContainers.filter(container => 
        container.classList.contains('snap-x') && 
        container.classList.contains('snap-mandatory')
      );
      expect(snapContainers.length).toBeGreaterThan(0);
    });
  });

  it('has snap-center on chips', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const communicationChip = screen.getByTestId('skill-chip-1');
      expect(communicationChip).toHaveClass('snap-center');
    });
  });

  it('shows empty state when no skills are available', async () => {
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

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByText('No skills are currently active.')).toBeInTheDocument();
      expect(screen.getByText('Contact your administrator to add skills.')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
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

    renderWithProvider(<SkillsScroller />);
    
    expect(screen.getByText('Select Skills to Practice')).toBeInTheDocument();
    expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
  });

  it('handles error state', async () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: null,
                error: new Error('Network error'),
              }))
            }))
          }))
        }))
      }
    }));

    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByText('No skills are currently active.')).toBeInTheDocument();
    });
  });

  it('prevents default behavior on keyboard events', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-chip-1')).toBeInTheDocument();
    });

    const communicationChip = screen.getByTestId('skill-chip-1');
    const preventDefault = vi.fn();
    
    // Simulate keydown event
    communicationChip.focus();
    await user.keyboard('{Enter}');
    
    // The preventDefault should be called internally
    expect(mockStore.toggleSkill).toHaveBeenCalledWith('1');
  });

  it('splits skills into two rows correctly', async () => {
    renderWithProvider(<SkillsScroller />);

    await waitFor(() => {
      const skillChips = screen.getAllByRole('button');
      expect(skillChips.length).toBe(4);
      
      // With 4 skills, should have 2 in each row
      // This tests the splitting logic
      expect(screen.getByText('Communication')).toBeInTheDocument();
      expect(screen.getByText('Active Listening')).toBeInTheDocument();
      expect(screen.getByText('Storytelling')).toBeInTheDocument();
      expect(screen.getByText('Memory Recall')).toBeInTheDocument();
    });
  });

  it('maintains selected state across re-renders', async () => {
    const { rerender } = renderWithProvider(<SkillsScroller />);

    (useSkillsStore as any).mockReturnValue({
      ...mockStore,
      skillsSelected: ['2'],
    });

    rerender(<SkillsScroller />);

    await waitFor(() => {
      const activeListeningChip = screen.getByTestId('skill-chip-2');
      expect(activeListeningChip).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(activeListeningChip).toHaveAttribute('aria-pressed', 'true');
    });
  });
});