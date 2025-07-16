import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, DollarSign, Activity } from 'lucide-react';

// Mock data for demonstration
const usageData = [
  { month: 'Jan', users: 45, minutes: 1200 },
  { month: 'Feb', users: 52, minutes: 1450 },
  { month: 'Mar', users: 61, minutes: 1800 },
  { month: 'Apr', users: 78, minutes: 2100 },
  { month: 'May', users: 89, minutes: 2400 },
  { month: 'Jun', users: 95, minutes: 2650 },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system usage and manage AsylumPrep
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45,231</div>
              <p className="text-xs text-muted-foreground">
                +23% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,345</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">
                +4% from last hour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Monthly Usage</CardTitle>
            <CardDescription>
              User engagement and minutes consumed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8884d8" />
                <Bar dataKey="minutes" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Management</CardTitle>
              <CardDescription>
                Manage system settings and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                Edit AI Prompts
              </Button>
              <Button className="w-full" variant="outline">
                Manage Skills
              </Button>
              <Button className="w-full" variant="outline">
                Upload Personas
              </Button>
              <Button className="w-full" variant="outline">
                System Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                User Directory
              </Button>
              <Button className="w-full" variant="outline">
                Grant Minutes
              </Button>
              <Button className="w-full" variant="outline">
                Process Refunds
              </Button>
              <Button className="w-full" variant="outline">
                Ban/Unban Users
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New user registration</p>
                  <p className="text-sm text-muted-foreground">john.doe@example.com</p>
                </div>
                <Badge variant="secondary">2 min ago</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Interview session completed</p>
                  <p className="text-sm text-muted-foreground">User practiced for 15 minutes</p>
                </div>
                <Badge variant="secondary">5 min ago</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment processed</p>
                  <p className="text-sm text-muted-foreground">$19.00 for 25 minutes</p>
                </div>
                <Badge variant="secondary">12 min ago</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}