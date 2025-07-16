import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import AdminCodePage from '@/pages/AdminCodePage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const renderAdminCodePage = () => {
  return render(
    <BrowserRouter>
      <AdminCodePage />
    </BrowserRouter>
  );
};

describe('AdminCodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the access code form', () => {
    renderAdminCodePage();
    
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Access code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  it('shows error message for incorrect code', async () => {
    renderAdminCodePage();
    
    const input = screen.getByLabelText('Access code');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    fireEvent.change(input, { target: { value: 'wrongcode' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Incorrect code')).toBeInTheDocument();
    });
    
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sets localStorage and navigates for correct code', async () => {
    renderAdminCodePage();
    
    const input = screen.getByLabelText('Access code');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    fireEvent.change(input, { target: { value: '18433540' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('isAdminUnlocked', 'true');
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('handles Enter key submission', async () => {
    renderAdminCodePage();
    
    const input = screen.getByLabelText('Access code');
    
    fireEvent.change(input, { target: { value: '18433540' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('isAdminUnlocked', 'true');
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('clears error when typing new code', () => {
    renderAdminCodePage();
    
    const input = screen.getByLabelText('Access code');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    // Enter wrong code to show error
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Incorrect code')).toBeInTheDocument();
    
    // Start typing new code - error should clear
    fireEvent.change(input, { target: { value: 'new' } });
    
    expect(screen.queryByText('Incorrect code')).not.toBeInTheDocument();
  });
});