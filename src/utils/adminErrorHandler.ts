import { toast } from 'sonner';
import { PostgrestError } from '@supabase/supabase-js';

export interface AdminError {
  message: string;
  isRLSError: boolean;
  isPermissionError: boolean;
  originalError: any;
}

export const handleAdminError = (error: any, operation: string): AdminError => {
  console.error(`Admin ${operation} error:`, error);
  
  let message = `Failed to ${operation}`;
  let isRLSError = false;
  let isPermissionError = false;

  if (error?.code) {
    // PostgreSQL error codes
    switch (error.code) {
      case '42501': // insufficient_privilege
        message = `Access denied: You don't have permission to ${operation}`;
        isPermissionError = true;
        break;
      case '42P01': // undefined_table
        message = `Database error: Required table not found for ${operation}`;
        break;
      case '23505': // unique_violation
        message = `A record with this information already exists`;
        break;
      case 'PGRST301': // Row Level Security violation
        message = `Permission denied: Cannot ${operation} due to security policies`;
        isRLSError = true;
        break;
      default:
        if (error.message?.includes('row-level security')) {
          message = `Permission denied: Row-level security blocked this ${operation}`;
          isRLSError = true;
        }
    }
  }

  // Handle Supabase-specific errors
  if (error?.message) {
    if (error.message.includes('JWT')) {
      message = `Authentication error: Please log in again to ${operation}`;
      isPermissionError = true;
    } else if (error.message.includes('permission')) {
      message = `Permission denied: You're not authorized to ${operation}`;
      isPermissionError = true;
    } else if (error.message.includes('policy')) {
      message = `Access denied: Security policy prevents ${operation}`;
      isRLSError = true;
    }
  }

  const adminError: AdminError = {
    message,
    isRLSError,
    isPermissionError,
    originalError: error
  };

  // Show toast with appropriate styling
  if (isRLSError || isPermissionError) {
    toast.error(message, {
      description: 'Check admin privileges or contact system administrator',
      duration: 5000
    });
  } else {
    toast.error(message);
  }

  return adminError;
};

export const withAdminErrorHandling = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleAdminError(error, operationName);
    return null;
  }
};