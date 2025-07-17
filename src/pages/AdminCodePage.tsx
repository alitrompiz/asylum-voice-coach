import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAdminRole } from '@/hooks/useAdminRole';
import { toast } from 'sonner';

export default function AdminCodePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { assignAdminRole } = useAdminRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code !== '18433540') {
      setError('Incorrect code');
      return;
    }

    if (!user) {
      setError('You must be logged in to access admin panel');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Assign admin role in database
      const success = await assignAdminRole();
      
      if (success) {
        // Set local storage flag
        localStorage.setItem('isAdminUnlocked', 'true');
        toast.success('Admin access granted');
        navigate('/admin');
      } else {
        setError('Failed to assign admin role');
      }
    } catch (error: any) {
      console.error('Error in admin code submission:', error);
      setError('An error occurred while granting admin access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Enter the access code to continue to the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Access code</Label>
                <Input
                  id="code"
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter access code"
                  className={error ? 'border-destructive' : ''}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Granting Access...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </form>
            
            {!user && (
              <div className="text-center p-4 border border-muted rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-2">
                  You must be logged in to access the admin panel
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth/login">
                    Login to Continue
                  </Link>
                </Button>
              </div>
            )}
            
            <div className="text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/" className="inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}