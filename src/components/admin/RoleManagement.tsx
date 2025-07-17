import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export const RoleManagement = () => {
  const [adminUsers, setAdminUsers] = useState<UserRole[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const { removeAdminRole } = useAdminRole();

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .eq('role', 'admin');

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const addAdminByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setAddingAdmin(true);
    try {
      // First, find user by email in auth.users (we'll need to create a function for this)
      // For now, we'll show an error that this feature needs to be implemented
      toast.error('Adding admin by email requires additional setup. Please use the admin code method.');
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin user');
    } finally {
      setAddingAdmin(false);
      setNewAdminEmail('');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (adminUsers.length <= 1) {
      toast.error('Cannot remove the last admin user');
      return;
    }

    const success = await removeAdminRole(userId);
    if (success) {
      fetchAdminUsers();
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            Manage users with admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No admin users found
            </p>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((userRole) => (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        Admin User
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ID: {userRole.user_id}
                      </p>
                    </div>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  
                  {adminUsers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAdmin(userRole.user_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Admin</CardTitle>
          <CardDescription>
            Currently, new admins must use the admin code method. Future updates will support email-based invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addAdminByEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled
              />
            </div>
            <Button type="submit" disabled={true}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin (Coming Soon)
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Current method:</strong> Share the admin code (18433540) with users who need admin access. 
              They must be logged in and enter the code at /admin-login.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};