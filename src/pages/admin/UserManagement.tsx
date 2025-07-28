import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Filter, Shield, ShieldOff, Plus, Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  is_banned: boolean;
  entitlement_status: 'free_trial' | 'full_prep';
  subscription_status: string;
  has_active_grant: boolean;
  has_active_subscription: boolean;
  created_at: string;
}

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'free_trial' | 'full_prep'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with entitlement status
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, statusFilter, currentPage],
    queryFn: async () => {
      // Build the query for profiles
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          is_banned,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%`);
      }

      // Get the basic user data first
      const { data: users, error } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      
      if (error) throw error;

      // Get total count for pagination
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Enhance each user with entitlement status and subscription info
      const enhancedUsers = await Promise.all(
        (users || []).map(async (user) => {
          try {
            // Check subscription status
            const { data: subscription } = await supabase
              .from('subscribers')
              .select('subscribed, subscription_tier, subscription_end, grace_period_end, email')
              .eq('user_id', user.user_id)
              .maybeSingle();

            // Check admin grants
            const { data: grants } = await supabase
              .from('admin_entitlement_grants')
              .select('end_at_utc')
              .eq('user_id', user.user_id)
              .gt('end_at_utc', new Date().toISOString())
              .order('end_at_utc', { ascending: false })
              .limit(1);

            const hasActiveSubscription = subscription?.subscribed && (
              !subscription.subscription_end || 
              new Date(subscription.subscription_end) > new Date() ||
              (subscription.grace_period_end && new Date(subscription.grace_period_end) > new Date())
            );

            const hasActiveGrant = grants && grants.length > 0;
            const entitlementStatus = (hasActiveSubscription || hasActiveGrant) ? 'full_prep' : 'free_trial';

            return {
              ...user,
              email: subscription?.email || `user-${user.user_id.slice(0, 8)}`,
              entitlement_status: entitlementStatus as 'free_trial' | 'full_prep',
              subscription_status: hasActiveSubscription ? 'Active' : 'None',
              has_active_grant: hasActiveGrant,
              has_active_subscription: hasActiveSubscription,
            };
          } catch (error) {
            console.error('Error enhancing user data:', error);
            return {
              ...user,
              email: `user-${user.user_id.slice(0, 8)}`,
              entitlement_status: 'free_trial' as const,
              subscription_status: 'None',
              has_active_grant: false,
              has_active_subscription: false,
            };
          }
        })
      );

      // Apply status filter after enhancement
      const filteredUsers = statusFilter === 'all' 
        ? enhancedUsers 
        : enhancedUsers.filter(user => user.entitlement_status === statusFilter);

      return {
        users: filteredUsers,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
  });

  // Grant Full Prep access
  const grantFullPrepMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('grant_full_prep_access', {
        target_user_id: userId,
        weeks_to_grant: 1,
        grant_reason: 'Admin grant - 1 week Full Prep access'
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ 
        title: 'Success', 
        description: 'Full Prep access granted for 1 week' 
      });
    },
    onError: (error) => {
      console.error('Error granting Full Prep access:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to grant Full Prep access',
        variant: 'destructive' 
      });
    }
  });

  // Revoke Full Prep access
  const revokeFullPrepMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('revoke_full_prep_access', {
        target_user_id: userId,
        revoke_reason: 'Admin revocation'
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ 
        title: 'Success', 
        description: 'Full Prep access revoked' 
      });
    },
    onError: (error) => {
      console.error('Error revoking Full Prep access:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to revoke Full Prep access',
        variant: 'destructive' 
      });
    }
  });

  // Ban/Unban user
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, shouldBan }: { userId: string; shouldBan: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: shouldBan })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Log admin action
      const { data: currentUser } = await supabase.auth.getUser();
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: currentUser.user?.id!,
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

  const renderStatusBadge = (user: User) => {
    if (user.entitlement_status === 'full_prep') {
      return (
        <Badge variant="default">
          <Crown className="w-3 h-3 mr-1" />
          Full Prep
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Free Trial
      </Badge>
    );
  };

  const renderActionButtons = (user: User) => {
    const isGrantDisabled = grantFullPrepMutation.isPending || revokeFullPrepMutation.isPending;
    
    if (user.entitlement_status === 'free_trial') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => grantFullPrepMutation.mutate(user.user_id)}
          disabled={isGrantDisabled}
        >
          <Plus className="w-4 h-4 mr-1" />
          Grant Full Prep (1 week)
        </Button>
      );
    }

    if (user.has_active_subscription) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                <Crown className="w-4 h-4 mr-1" />
                Already Full Prep via subscription
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Already Full Prep via subscription</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Has active grant but no subscription
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => grantFullPrepMutation.mutate(user.user_id)}
          disabled={isGrantDisabled}
        >
          <Plus className="w-4 h-4 mr-1" />
          Grant +1 week
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => revokeFullPrepMutation.mutate(user.user_id)}
          disabled={isGrantDisabled}
        >
          Revoke grant
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const users = usersData?.users || [];
  const totalCount = usersData?.totalCount || 0;
  const totalPages = usersData?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Badge variant="secondary">{totalCount} Total Users</Badge>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: 'all' | 'free_trial' | 'full_prep') => setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="free_trial">Free Trial</SelectItem>
            <SelectItem value="full_prep">Full Prep</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.display_name || 'No name'}
                  {user.is_banned && (
                    <Badge variant="destructive" className="ml-2">Banned</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {renderStatusBadge(user)}
                </TableCell>
                <TableCell>
                  <Badge variant={user.has_active_subscription ? "default" : "outline"}>
                    {user.subscription_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {renderActionButtons(user)}
                    
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}