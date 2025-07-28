import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldOff, Plus, DollarSign } from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  display_name: string;
  is_banned: boolean;
  balance_minutes: number;
  created_at: string;
}

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [minutesToAdd, setMinutesToAdd] = useState('');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          is_banned,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get minutes balance for each user
      const usersWithBalance = await Promise.all(
        (data || []).map(async (user) => {
          const { data: balance } = await supabase
            .from('minutes_balance')
            .select('session_seconds_used, session_seconds_limit')
            .eq('user_id', user.user_id)
            .single();
          
          return {
            ...user,
            balance_minutes: Math.floor((balance?.session_seconds_limit || 600) - (balance?.session_seconds_used || 0)) / 60
          };
        })
      );
      
      return usersWithBalance as User[];
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, shouldBan }: { userId: string; shouldBan: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: shouldBan })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id!,
          target_user_id: userId,
          action_type: shouldBan ? 'ban_user' : 'unban_user',
          action_details: { banned: shouldBan }
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User status updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error updating user status', variant: 'destructive' });
    }
  });

  const grantMinutesMutation = useMutation({
    mutationFn: async ({ userId, minutes }: { userId: string; minutes: number }) => {
      // Convert minutes to seconds and update the used seconds (grant = reduce used)
      const secondsToGrant = minutes * 60;
      const { data: current } = await supabase
        .from('minutes_balance')
        .select('session_seconds_used')
        .eq('user_id', userId)
        .single();
      
      const newUsedSeconds = Math.max(0, (current?.session_seconds_used || 0) - secondsToGrant);
      
      const { error } = await supabase
        .from('minutes_balance')
        .update({ session_seconds_used: newUsedSeconds })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id!,
          target_user_id: userId,
          action_type: 'grant_minutes',
          action_details: { minutes_granted: minutes }
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsGrantModalOpen(false);
      setMinutesToAdd('');
      toast({ title: 'Minutes granted successfully' });
    },
    onError: () => {
      toast({ title: 'Error granting minutes', variant: 'destructive' });
    }
  });

  const handleGrantMinutes = () => {
    if (!selectedUser || !minutesToAdd) return;
    
    const minutes = parseInt(minutesToAdd);
    if (isNaN(minutes) || minutes <= 0) {
      toast({ title: 'Please enter a valid number of minutes', variant: 'destructive' });
      return;
    }

    const newBalance = selectedUser.balance_minutes + minutes;
    grantMinutesMutation.mutate({ userId: selectedUser.user_id, minutes: newBalance });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Badge variant="secondary">{users?.length || 0} Total Users</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Minutes Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.display_name || 'No name'}
                </TableCell>
                <TableCell>{user.user_id}</TableCell>
                <TableCell>{user.balance_minutes}</TableCell>
                <TableCell>
                  <Badge variant={user.is_banned ? 'destructive' : 'secondary'}>
                    {user.is_banned ? 'Banned' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => banUserMutation.mutate({ 
                        userId: user.user_id, 
                        shouldBan: !user.is_banned 
                      })}
                      disabled={banUserMutation.isPending}
                    >
                      {user.is_banned ? (
                        <><Shield className="w-4 h-4 mr-1" /> Unban</>
                      ) : (
                        <><ShieldOff className="w-4 h-4 mr-1" /> Ban</>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsGrantModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Grant Minutes
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isGrantModalOpen} onOpenChange={setIsGrantModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Minutes to {selectedUser?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="minutes">Current Balance: {selectedUser?.balance_minutes} minutes</Label>
            </div>
            <div>
              <Label htmlFor="minutes">Minutes to Add</Label>
              <Input
                id="minutes"
                type="number"
                value={minutesToAdd}
                onChange={(e) => setMinutesToAdd(e.target.value)}
                placeholder="Enter minutes to add"
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleGrantMinutes} 
                disabled={grantMinutesMutation.isPending}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Grant Minutes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsGrantModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}