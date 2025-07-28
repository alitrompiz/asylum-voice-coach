import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Search, Filter, Download, MoreHorizontal, Crown, Clock, 
  UserCheck, UserX, Mail, ExternalLink, RefreshCw, Eye, Trash2,
  Calendar, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface EnrichedUser {
  user_id: string;
  email: string;
  display_name: string;
  is_banned: boolean;
  created_at: string;
  last_sign_in_at?: string;
  entitlement_status: 'free_trial' | 'full_prep_subscription' | 'full_prep_grant';
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  grace_period_end?: string;
  stripe_customer_id?: string;
  attorney_id?: string;
  attorney_display_name?: string;
  attorney_firm?: string;
  lifetime_session_seconds: number;
  session_seconds_used: number;
  session_seconds_limit: number;
  free_seconds_remaining: number;
  last_session_at?: string;
  grant_end_at?: string;
  grant_remaining_seconds: number;
  grant_history_count: number;
  member_age_days: number;
  auth_methods: string[];
}

interface UsersResponse {
  users: EnrichedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const UserManagement = () => {
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attorneyFilter, setAttorneyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'grant' | 'revoke' | 'delete' | 'ban' | 'unban' | null;
    user: EnrichedUser | null;
  }>({ type: null, user: null });

  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with enhanced data
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-users-enhanced', searchTerm, statusFilter, attorneyFilter, sortBy, sortOrder, currentPage],
    queryFn: async (): Promise<UsersResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        status_filter: statusFilter,
        attorney_filter: attorneyFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
      queryClient.invalidateQueries({ queryKey: ['admin-users-enhanced'] });
      toast({ title: 'Success', description: 'Full Prep access granted for 1 week' });
      setConfirmAction({ type: null, user: null });
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
      queryClient.invalidateQueries({ queryKey: ['admin-users-enhanced'] });
      toast({ title: 'Success', description: 'Full Prep access revoked' });
      setConfirmAction({ type: null, user: null });
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

  // Send password reset/magic link
  const sendResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-user-reset', {
        body: { userId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Success', 
        description: data.message 
      });
    },
    onError: (error) => {
      console.error('Error sending reset:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to send authentication email',
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-enhanced'] });
      toast({ title: 'User status updated successfully' });
      setConfirmAction({ type: null, user: null });
    },
    onError: () => {
      toast({ title: 'Error updating user status', variant: 'destructive' });
    }
  });

  // Export CSV
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        status_filter: statusFilter,
        attorney_filter: attorneyFilter,
      });

      const response = await fetch(
        `https://atthfkcmknkcyfeumcrq.supabase.co/functions/v1/admin-users-export?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: 'Export successful', description: 'CSV file has been downloaded' });
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export user data',
        variant: 'destructive' 
      });
    }
  });

  const renderStatusBadge = (user: EnrichedUser) => {
    if (user.entitlement_status.includes('full_prep')) {
      const isSubscription = user.entitlement_status === 'full_prep_subscription';
      return (
        <Badge variant="default" className="bg-green-600">
          <Crown className="w-3 h-3 mr-1" />
          {isSubscription ? 'Full Prep (Sub)' : 'Full Prep (Grant)'}
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

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'None';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const formatMinutes = (seconds: number) => {
    return Math.round(seconds / 60 * 10) / 10;
  };

  const handleAction = (action: string, user: EnrichedUser) => {
    switch (action) {
      case 'grant':
        setConfirmAction({ type: 'grant', user });
        break;
      case 'revoke':
        setConfirmAction({ type: 'revoke', user });
        break;
      case 'ban':
        setConfirmAction({ type: 'ban', user });
        break;
      case 'unban':
        setConfirmAction({ type: 'unban', user });
        break;
      case 'reset':
        sendResetMutation.mutate(user.user_id);
        break;
      case 'view':
        setSelectedUser(user);
        break;
      case 'stripe':
        if (user.stripe_customer_id) {
          window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank');
        }
        break;
    }
  };

  const renderDesktopTable = () => {
    if (!usersData?.users) return null;

    return (
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium">User</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Plan/Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Usage</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Free Minutes Left</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Premium Grant</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Attorney</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Created</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersData.users.map((user) => (
                <tr key={user.user_id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{user.display_name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      {user.is_banned && (
                        <Badge variant="destructive" className="mt-1">Banned</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {renderStatusBadge(user)}
                    {user.subscribed && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {user.subscription_tier}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {formatMinutes(user.lifetime_session_seconds)} min total
                    </div>
                    {user.last_session_at && (
                      <div className="text-xs text-muted-foreground">
                        Last: {new Date(user.last_session_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {formatMinutes(user.free_seconds_remaining)} min
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {formatMinutes(user.session_seconds_limit)}
                    </div>
                  </td>
                  <td className="p-4">
                    {user.grant_remaining_seconds > 0 ? (
                      <div className="text-sm text-green-600">
                        {formatTimeRemaining(user.grant_remaining_seconds)}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">None</div>
                    )}
                    {user.grant_history_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {user.grant_history_count} grants total
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {user.attorney_display_name ? (
                      <div>
                        <div className="text-sm">{user.attorney_display_name}</div>
                        <div className="text-xs text-muted-foreground">{user.attorney_firm}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">None</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(user.member_age_days)}d ago
                    </div>
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction('view', user)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {user.entitlement_status === 'free_trial' && (
                          <DropdownMenuItem onClick={() => handleAction('grant', user)}>
                            <Crown className="w-4 h-4 mr-2" />
                            Grant Full Prep (+1 week)
                          </DropdownMenuItem>
                        )}
                        
                        {user.entitlement_status === 'full_prep_grant' && (
                          <>
                            <DropdownMenuItem onClick={() => handleAction('grant', user)}>
                              <Crown className="w-4 h-4 mr-2" />
                              Extend Grant (+1 week)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('revoke', user)}>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Revoke Grant
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction('reset', user)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Password Reset
                        </DropdownMenuItem>
                        
                        {user.stripe_customer_id && (
                          <DropdownMenuItem onClick={() => handleAction('stripe', user)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage in Stripe
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleAction(user.is_banned ? 'unban' : 'ban', user)}
                        >
                          {user.is_banned ? (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Unban User
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Ban User
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMobileCards = () => {
    if (!usersData?.users) return null;

    return (
      <div className="space-y-4">
        {usersData.users.map((user) => (
          <Card key={user.user_id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-medium">{user.display_name || 'No name'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {renderStatusBadge(user)}
                    {user.is_banned && (
                      <Badge variant="destructive">Banned</Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction('view', user)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {/* Add other actions similar to desktop */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Lifetime Usage</div>
                  <div>{formatMinutes(user.lifetime_session_seconds)} min</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Free Minutes Left</div>
                  <div>{formatMinutes(user.free_seconds_remaining)} min</div>
                </div>
                {user.attorney_display_name && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Attorney</div>
                    <div>{user.attorney_display_name} - {user.attorney_firm}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Failed to load user data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const users = usersData?.users || [];
  const pagination = usersData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            {pagination?.total || 0} total users
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users-enhanced'] })}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="free_trial">Free Trial</SelectItem>
            <SelectItem value="full_prep">Full Prep</SelectItem>
            <SelectItem value="subscribed">Subscribed</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="lifetime_minutes">Lifetime Usage</SelectItem>
            <SelectItem value="member_age">Member Age</SelectItem>
            <SelectItem value="last_active">Last Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      {isMobile ? renderMobileCards() : renderDesktopTable()}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((pagination.page - 1) * 20 + 1, pagination.total)} to{' '}
            {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-2">Identity</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Name</div>
                    <div>{selectedUser.display_name || 'No name'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div>{selectedUser.email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">User ID</div>
                    <div className="font-mono text-xs">{selectedUser.user_id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStatusBadge(selectedUser)}
                      {selectedUser.is_banned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Entitlement Details */}
              <div>
                <h3 className="font-semibold mb-2">Entitlement</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Current Plan</div>
                    <div>{selectedUser.entitlement_status.replace('_', ' ')}</div>
                  </div>
                  {selectedUser.subscription_tier && (
                    <div>
                      <div className="text-muted-foreground">Subscription Tier</div>
                      <div>{selectedUser.subscription_tier}</div>
                    </div>
                  )}
                  {selectedUser.grant_remaining_seconds > 0 && (
                    <div>
                      <div className="text-muted-foreground">Grant Remaining</div>
                      <div className="text-green-600">
                        {formatTimeRemaining(selectedUser.grant_remaining_seconds)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted-foreground">Grant History</div>
                    <div>{selectedUser.grant_history_count} grants</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Usage Statistics */}
              <div>
                <h3 className="font-semibold mb-2">Usage</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Lifetime Usage</div>
                    <div>{formatMinutes(selectedUser.lifetime_session_seconds)} minutes</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Free Minutes Remaining</div>
                    <div>{formatMinutes(selectedUser.free_seconds_remaining)} minutes</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Free Minutes Limit</div>
                    <div>{formatMinutes(selectedUser.session_seconds_limit)} minutes</div>
                  </div>
                  {selectedUser.last_session_at && (
                    <div>
                      <div className="text-muted-foreground">Last Session</div>
                      <div>{new Date(selectedUser.last_session_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attorney Info */}
              {selectedUser.attorney_display_name && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Attorney</h3>
                    <div className="text-sm">
                      <div>{selectedUser.attorney_display_name}</div>
                      <div className="text-muted-foreground">{selectedUser.attorney_firm}</div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Account Info */}
              <div>
                <h3 className="font-semibold mb-2">Account</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div>{new Date(selectedUser.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Member Age</div>
                    <div>{Math.round(selectedUser.member_age_days)} days</div>
                  </div>
                  {selectedUser.last_sign_in_at && (
                    <div>
                      <div className="text-muted-foreground">Last Sign In</div>
                      <div>{new Date(selectedUser.last_sign_in_at).toLocaleString()}</div>
                    </div>
                  )}
                  {selectedUser.stripe_customer_id && (
                    <div>
                      <div className="text-muted-foreground">Stripe Customer</div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm"
                        onClick={() => handleAction('stripe', selectedUser)}
                      >
                        View in Stripe <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog 
        open={!!confirmAction.type} 
        onOpenChange={() => setConfirmAction({ type: null, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === 'grant' && 'Grant Full Prep Access'}
              {confirmAction.type === 'revoke' && 'Revoke Full Prep Access'}
              {confirmAction.type === 'ban' && 'Ban User'}
              {confirmAction.type === 'unban' && 'Unban User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === 'grant' && 
                `Grant ${confirmAction.user?.display_name || confirmAction.user?.email} 1 week of Full Prep access?`
              }
              {confirmAction.type === 'revoke' && 
                `Revoke Full Prep access for ${confirmAction.user?.display_name || confirmAction.user?.email}? Remaining time: ${confirmAction.user ? formatTimeRemaining(confirmAction.user.grant_remaining_seconds) : ''}`
              }
              {confirmAction.type === 'ban' && 
                `Ban ${confirmAction.user?.display_name || confirmAction.user?.email}? They will not be able to access the application.`
              }
              {confirmAction.type === 'unban' && 
                `Unban ${confirmAction.user?.display_name || confirmAction.user?.email}? They will regain access to the application.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction.user) return;
                
                switch (confirmAction.type) {
                  case 'grant':
                    grantFullPrepMutation.mutate(confirmAction.user.user_id);
                    break;
                  case 'revoke':
                    revokeFullPrepMutation.mutate(confirmAction.user.user_id);
                    break;
                  case 'ban':
                    banUserMutation.mutate({ 
                      userId: confirmAction.user.user_id, 
                      shouldBan: true 
                    });
                    break;
                  case 'unban':
                    banUserMutation.mutate({ 
                      userId: confirmAction.user.user_id, 
                      shouldBan: false 
                    });
                    break;
                }
              }}
              disabled={
                grantFullPrepMutation.isPending || 
                revokeFullPrepMutation.isPending || 
                banUserMutation.isPending
              }
            >
              {confirmAction.type === 'grant' && 'Grant Access'}
              {confirmAction.type === 'revoke' && 'Revoke Access'}
              {confirmAction.type === 'ban' && 'Ban User'}
              {confirmAction.type === 'unban' && 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;