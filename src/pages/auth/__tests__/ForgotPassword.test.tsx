import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import ForgotPassword from '../ForgotPassword';

// Mock the auth hook
const mockResetPassword = vi.fn();
const mockUseAuth = {
  resetPassword: mockResetPassword,
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderForgotPassword = () => {
  return render(
    <BrowserRouter>
      <ForgotPassword />
    </BrowserRouter>
  );
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form', () => {
    renderForgotPassword();
    
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  it('submits form with email', async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null });
    
    renderForgotPassword();
    
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('handles password reset error', async () => {
    const mockError = new Error('Email not found');
    mockResetPassword.mockResolvedValueOnce({ error: mockError });
    
    renderForgotPassword();
    
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows loading state during password reset', async () => {
    mockResetPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderForgotPassword();
    
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('has link to sign in', () => {
    renderForgotPassword();
    
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});