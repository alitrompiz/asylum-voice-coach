import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneratingFeedbackModal } from '../GeneratingFeedbackModal';

describe('GeneratingFeedbackModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <GeneratingFeedbackModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Generating Feedback...')).toBeInTheDocument();
    expect(screen.getByText(/When it's done, you'll see it in Past Feedback/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <GeneratingFeedbackModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByText('Generating Feedback...')).not.toBeInTheDocument();
  });

  it('calls onComplete when OK button is clicked', () => {
    render(
      <GeneratingFeedbackModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});