import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Target, 
  UserCircle, 
  MessageSquare, 
  BarChart3,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  totalSkills: number;
  activeSkills: number;
  totalPersonas: number;
  visiblePersonas: number;
  totalPrompts: number;
  activePrompts: number;
  avgMinutesPerUser: number;
  minutesUsedToday: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Fetch all stats in parallel
      const [
        usersData,
        skillsData,
        personasData,
        promptsData,
        adminStatsData
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('skills').select('id, is_active'),
        supabase.from('personas').select('id, is_visible'),
        supabase.from('prompts').select('id, is_active'),
        supabase.rpc('get_admin_stats')
      ]);

      if (usersData.error || skillsData.error || personasData.error || 
          promptsData.error || adminStatsData.error) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const adminStats = adminStatsData.data[0];
      
      return {
        totalUsers: usersData.data?.length || 0,
        activeUsers7d: adminStats?.active_users_7d || 0,
        totalSkills: skillsData.data?.length || 0,
        activeSkills: skillsData.data?.filter(s => s.is_active).length || 0,
        totalPersonas: personasData.data?.length || 0,
        visiblePersonas: personasData.data?.filter(p => p.is_visible).length || 0,
        totalPrompts: promptsData.data?.length || 0,
        activePrompts: promptsData.data?.filter(p => p.is_active).length || 0,
        avgMinutesPerUser: Number(adminStats?.avg_minutes_per_user || 0),
        minutesUsedToday: adminStats?.minutes_used_today || 0
      } as DashboardStats;
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      href: '/admin/users',
      count: stats?.totalUsers,
    },
    {
      title: 'Manage Skills',
      description: 'Configure practice skills',
      icon: Target,
      href: '/admin/skills',
      count: stats?.activeSkills,
    },
    {
      title: 'Manage Personas',
      description: 'Upload and configure interviewer personas',
      icon: UserCircle,
      href: '/admin/personas',
      count: stats?.visiblePersonas,
    },
    {
      title: 'Manage Prompts',
      description: 'Edit interview prompts and scenarios',
      icon: MessageSquare,
      href: '/admin/prompts',
      count: stats?.activePrompts,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Welcome to the AsylumPrep administration panel
          </p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/admin/usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Link>
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers7d || 0} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Minutes Today</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats?.minutesUsedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Practice minutes used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Minutes/User</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.avgMinutesPerUser ? stats.avgMinutesPerUser.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">System Health</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">Good</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outline"
                  className="w-full justify-between h-auto p-3 sm:p-4"
                  asChild
                >
                  <Link to={action.href}>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{action.title}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{action.count}</Badge>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {activity.action_type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent admin activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Content Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Active Skills:</span>
                  <Badge variant={stats?.activeSkills ? 'default' : 'destructive'}>
                    {stats?.activeSkills}/{stats?.totalSkills}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Visible Personas:</span>
                  <Badge variant={stats?.visiblePersonas ? 'default' : 'destructive'}>
                    {stats?.visiblePersonas}/{stats?.totalPersonas}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Prompts:</span>
                  <Badge variant={stats?.activePrompts ? 'default' : 'destructive'}>
                    {stats?.activePrompts}/{stats?.totalPrompts}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">User Engagement</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Weekly Active Rate:</span>
                  <Badge variant="secondary">
                    {((stats?.activeUsers7d || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Today's Usage:</span>
                  <Badge variant="secondary">{stats?.minutesUsedToday || 0} min</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Quick Stats</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Users:</span>
                  <span className="font-medium">{stats?.totalUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Content Items:</span>
                  <span className="font-medium">
                    {(stats?.totalSkills || 0) + (stats?.totalPersonas || 0) + (stats?.totalPrompts || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}