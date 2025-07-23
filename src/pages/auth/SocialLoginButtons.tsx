import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SocialLoginButtonsProps {
  onGoogleClick: () => void;
  onAppleClick: () => void;
  isLoading: boolean;
}

export function SocialLoginButtons({ onGoogleClick, onAppleClick, isLoading }: SocialLoginButtonsProps) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h240z"
            ></path>
          </svg>
        )}
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onAppleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="apple"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
          >
            <path
              fill="currentColor"
              d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-42.8-35.5-1.2-67.3 21.2-84.9 21.2-17.9 0-45.4-20.9-75.2-20.5-38.5.4-74.2 22.9-93.4 58.1-39.2 68.1-10.1 168.9 28.3 224.3 18.9 27.2 41.4 57.7 71 56.6 28.6-1.1 39.5-18.4 74.3-18.4 34.3 0 44.9 18.4 75.4 17.8 31.2-.5 50.3-27.8 69.2-55.1 21.4-31.1 30.2-62.2 30.4-63.7-.7-.3-58.4-22.4-58.7-89.2zm-50.4-134.3c15.7-19.2 26.2-45.9 23.2-72.9-22.6 1.3-50.1 15.1-66.7 34.3-14.9 17.2-27.8 44.3-24.4 70.3 25.6 2.1 52.2-12.8 67.9-31.7z"
            ></path>
          </svg>
        )}
        Continue with Apple
      </Button>
    </div>
  );
}