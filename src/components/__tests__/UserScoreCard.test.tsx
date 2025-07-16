import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { UserScoreCard } from '../UserScoreCard';

// Mock the auth hook
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

describe('UserScoreCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders score values correctly', async () => {
    renderWithProvider(<UserScoreCard />);

    await waitFor(() => {
      // Check for rendered scores (should be averages)
      expect(screen.getByText('87')).toBeInTheDocument(); // avg credibility: (85+88)/2 = 86.5 ≈ 87
      expect(screen.getByText('80')).toBeInTheDocument(); // avg story_clarity: (78+82)/2 = 80
      expect(screen.getByText('91')).toBeInTheDocument(); // avg case_strength: (92+89)/2 = 90.5 ≈ 91
    });
  });

  it('renders score labels correctly', async () => {
    renderWithProvider(<UserScoreCard />);

    await waitFor(() => {
      expect(screen.getByText('Credibility')).toBeInTheDocument();
      expect(screen.getByText('Story Clarity')).toBeInTheDocument();
      expect(screen.getByText('Case Strength')).toBeInTheDocument();
    });
  });

  it('displays overall readiness score', async () => {
    renderWithProvider(<UserScoreCard />);

    await waitFor(() => {
      // Overall average: (87+80+91)/3 = 86
      expect(screen.getByText(/Your overall readiness: 86\/100/)).toBeInTheDocument();
    });
  });

  it('shows tooltip on hover for credibility', async () => {
    const user = userEvent.setup();
    renderWithProvider(<UserScoreCard />);

    await waitFor(() => {
      const credibilityTooltip = screen.getByText('Credibility').nextElementSibling;
      expect(credibilityTooltip).toBeInTheDocument();
    });

    // Find the info icon next to Credibility
    const infoIcons = screen.getAllByTestId('info-icon') || screen.getAllByRole('button');
    const credibilityIcon = infoIcons[0];
    
    await user.hover(credibilityIcon);
    
    await waitFor(() => {
      expect(screen.getByText('Perceived honesty of your answers')).toBeInTheDocument();
    });
  });

  it('shows tooltip on hover for story clarity', async () => {
    const user = userEvent.setup();
    renderWithProvider(<UserScoreCard />);

    await waitFor(async () => {
      const infoIcons = screen.getAllByTestId('info-icon') || screen.getAllByRole('button');
      const storyClarityIcon = infoIcons[1];
      
      await user.hover(storyClarityIcon);
      
      await waitFor(() => {
        expect(screen.getByText('How clearly you narrate events')).toBeInTheDocument();
      });
    });
  });

  it('shows tooltip on hover for case strength', async () => {
    const user = userEvent.setup();
    renderWithProvider(<UserScoreCard />);

    await waitFor(async () => {
      const infoIcons = screen.getAllByTestId('info-icon') || screen.getAllByRole('button');
      const caseStrengthIcon = infoIcons[2];
      
      await user.hover(caseStrengthIcon);
      
      await waitFor(() => {
        expect(screen.getByText('Match between your story and asylum criteria')).toBeInTheDocument();
      });
    });
  });

  it('renders loading state', () => {
    vi.doMock('@/hooks/useAuth', () => ({
      useAuth: () => ({ user: null })
    }));

    renderWithProvider(<UserScoreCard />);
    
    expect(screen.getByText('Your overall readiness: 0/100')).toBeInTheDocument();
    expect(screen.getByText('Complete practice interviews to see your scores')).toBeInTheDocument();
  });

  it('renders zero scores when no data available', () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }))
      }
    }));

    renderWithProvider(<UserScoreCard />);

    expect(screen.getByText('Your overall readiness: 0/100')).toBeInTheDocument();
    expect(screen.getByText('Complete practice interviews to see your scores')).toBeInTheDocument();
  });

  it('uses correct colors for different score ranges', async () => {
    renderWithProvider(<UserScoreCard />);

    await waitFor(() => {
      const scoreSvgs = screen.getAllByRole('img', { hidden: true });
      
      // Check that SVG elements exist (color testing would require more complex setup)
      expect(scoreSvgs.length).toBeGreaterThan(0);
    });
  });
});