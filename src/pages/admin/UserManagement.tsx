import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Ban, Gift, DollarSign, Mail, MoreHorizontal, UserX, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserActions } from '@/hooks/useUserActions';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  is_banned: boolean;
  balance_minutes: number;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [grantMinutesDialog, setGrantMinutesDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');

  const { loading: actionLoading, banUser, unbanUser, grantMinutes, refundMinutes } = useUserActions();
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          is_banned,
          created_at,
          minutes_balance (
            balance_minutes
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails from auth metadata
      const usersWithEmails = await Promise.all(
        data.map(async (profile: any) => {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              ...profile,
              email: authUser.user?.email || 'Unknown',
              last_sign_in_at: authUser.user?.last_sign_in_at || null,
              balance_minutes: profile.minutes_balance?.[0]?.balance_minutes || 0,
            };
          } catch (error) {
            console.error('Error fetching user email:', error);
            return {
              ...profile,
              email: 'Unknown',
              last_sign_in_at: null,
              balance_minutes: profile.minutes_balance?.[0]?.balance_minutes || 0,
            };
          }
        })
      );

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBanUser = async () => {
    if (!selectedUser) return;
    await banUser(selectedUser.user_id, reason);
    setBanDialog(false);
    setReason('');
    setSelectedUser(null);
    await fetchUsers();
  };

  const handleUnbanUser = async (userId: string) => {
    await unbanUser(userId);
    await fetchUsers();
  };

  const handleGrantMinutes = async () => {
    if (!selectedUser || !minutes) return;
    await grantMinutes(selectedUser.user_id, parseInt(minutes), reason);
    setGrantMinutesDialog(false);
    setMinutes('');
    setReason('');
    setSelectedUser(null);
    await fetchUsers();
  };

  const handleRefund = async () => {
    if (!selectedUser || !minutes) return;
    await refundMinutes(selectedUser.user_id, parseInt(minutes), reason);
    setRefundDialog(false);
    setMinutes('');
    setReason('');
    setSelectedUser(null);
    await fetchUsers();
  };

  const UserActionsDropdown = ({ user }: { user: User }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setSelectedUser(user);
            setGrantMinutesDialog(true);
          }}
        >
          <Gift className="h-4 w-4 mr-2" />
          Grant Minutes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSelectedUser(user);
            setRefundDialog(true);
          }}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Refund
        </DropdownMenuItem>
        {user.is_banned ? (
          <DropdownMenuItem onClick={() => handleUnbanUser(user.user_id)}>
            <UserCheck className="h-4 w-4 mr-2" />
            Unban User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              setSelectedUser(user);
              setBanDialog(true);
            }}
          >
            <Ban className="h-4 w-4 mr-2" />
            Ban User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage user accounts, permissions, and billing
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <CardDescription>Find and manage specific user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Minutes</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.display_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_banned ? 'destructive' : 'secondary'}>
                        {user.is_banned ? 'Banned' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.balance_minutes}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <UserActionsDropdown user={user} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grant Minutes Dialog */}
      <Dialog open={grantMinutesDialog} onOpenChange={setGrantMinutesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Minutes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="minutes">Minutes to Grant</Label>
              <Input
                id="minutes"
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Enter minutes"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for granting minutes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGrantMinutesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGrantMinutes} disabled={!minutes || actionLoading}>
                Grant Minutes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onOpenChange={setRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-minutes">Minutes to Refund</Label>
              <Input
                id="refund-minutes"
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Enter minutes to refund"
              />
            </div>
            <div>
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for refund"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRefund} disabled={!minutes || actionLoading}>
                Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <AlertDialog open={banDialog} onOpenChange={setBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              This will ban the user and revoke all their active sessions. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="ban-reason">Reason for Ban</Label>
            <Textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for ban"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser} disabled={actionLoading}>
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}