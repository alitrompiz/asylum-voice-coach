import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MinutesMeter from '../MinutesMeter';
import * as minutesStore from '@/stores/minutesStore';

// Mock the stores
vi.mock('@/stores/minutesStore', () => ({
  useMinutesStore: vi.fn(),
}));

const mockMinutesStore = {
  currentMinutes: 15,
  freeTrialUsed: false,
  fetchMinutesBalance: vi.fn(),
};

describe('MinutesMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(minutesStore.useMinutesStore).mockReturnValue(mockMinutesStore);
  });

  it('renders with default values from store', () => {
    render(<MinutesMeter />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('mins')).toBeInTheDocument();
  });

  it('uses prop values over store values', () => {
    render(<MinutesMeter currentMinutes={5} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('mins')).toBeInTheDocument();
  });

  it('displays singular "min" for 1 minute', () => {
    render(<MinutesMeter currentMinutes={1} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
  });

  it('shows green color for minutes > 10', () => {
    render(<MinutesMeter currentMinutes={15} />);
    
    const minutesText = screen.getByText('15');
    expect(minutesText).toHaveStyle({ color: '#10b981' });
  });

  it('shows yellow color for minutes 2-10', () => {
    render(<MinutesMeter currentMinutes={5} />);
    
    const minutesText = screen.getByText('5');
    expect(minutesText).toHaveStyle({ color: '#f59e0b' });
  });

  it('shows red color for minutes < 2', () => {
    render(<MinutesMeter currentMinutes={1} />);
    
    const minutesText = screen.getByText('1');
    expect(minutesText).toHaveStyle({ color: '#ef4444' });
  });

  it('calls onZeroMinutes when minutes reach zero', () => {
    const onZeroMinutes = vi.fn();
    render(<MinutesMeter currentMinutes={0} onZeroMinutes={onZeroMinutes} />);
    
    expect(onZeroMinutes).toHaveBeenCalledTimes(1);
  });

  it('does not call onZeroMinutes when minutes are above zero', () => {
    const onZeroMinutes = vi.fn();
    render(<MinutesMeter currentMinutes={5} onZeroMinutes={onZeroMinutes} />);
    
    expect(onZeroMinutes).not.toHaveBeenCalled();
  });

  it('shows free trial indicator when freeTrialUsed is true', () => {
    render(<MinutesMeter freeTrialUsed={true} />);
    
    expect(screen.getByText('Trial Used')).toBeInTheDocument();
  });

  it('does not show free trial indicator when freeTrialUsed is false', () => {
    render(<MinutesMeter freeTrialUsed={false} />);
    
    expect(screen.queryByText('Trial Used')).not.toBeInTheDocument();
  });

  it('fetches minutes balance on mount', () => {
    render(<MinutesMeter />);
    
    expect(mockMinutesStore.fetchMinutesBalance).toHaveBeenCalledTimes(1);
  });

  it('renders SVG progress ring', () => {
    render(<MinutesMeter currentMinutes={30} />);
    
    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toBeInTheDocument();
    expect(svg.querySelector('circle')).toBeInTheDocument();
  });
});