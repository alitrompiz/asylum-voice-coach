import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ContactUsForm from '../ContactUsForm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/tracking';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/use-toast');
vi.mock('@/lib/tracking');

// Mock Supabase client
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseToast = vi.mocked(useToast);
const mockTrackEvent = vi.mocked(trackEvent);

const mockToast = vi.fn();

describe('ContactUsForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { 
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00.000Z',
      } as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPassword: vi.fn(),
    });
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ContactUsForm />
      </QueryClientProvider>
    );
  };

  it('renders contact form with user email prefilled', () => {
    renderComponent();

    expect(screen.getByLabelText(/email address/i)).toHaveValue('test@example.com');
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/subject must be at least 5 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('submits form successfully and shows success toast', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    renderComponent();

    // Fill out the form
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'This is a test message' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('send-contact-email', {
        body: {
          email: 'user@example.com',
          subject: 'Test Subject',
          message: 'This is a test message',
          userEmail: 'test@example.com',
        },
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message Sent!',
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('contact_us_sent', {
      subject: 'Test Subject',
      message_length: 21,
      user_email: 'test@example.com',
    });
  });

  it('handles submission error and shows error toast', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Failed to send email' },
      error: null,
    });

    renderComponent();

    // Fill out the form
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'This is a test message' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('handles API error and shows error toast', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    renderComponent();

    // Fill out the form
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'This is a test message' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('disables form during submission', async () => {
    mockInvoke.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderComponent();

    // Fill out the form
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'This is a test message' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sending.../i })).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(subjectInput).toBeDisabled();
      expect(messageInput).toBeDisabled();
    });
  });

  it('resets form after successful submission', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    renderComponent();

    // Fill out the form
    const emailInput = screen.getByLabelText(/email address/i);
    const subjectInput = screen.getByLabelText(/subject/i);
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'This is a test message' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message Sent!',
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
    });

    // Check that form is reset
    expect(emailInput).toHaveValue('test@example.com'); // Should keep user email
    expect(subjectInput).toHaveValue('');
    expect(messageInput).toHaveValue('');
  });
});