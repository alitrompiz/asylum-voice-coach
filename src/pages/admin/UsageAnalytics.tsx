import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, Clock, Download } from 'lucide-react';

export default function UsageAnalytics() {
  const usageData = [
    { id: 1, date: '2023-12-01', user: 'user@example.com', feature: 'Voice Interview', duration: '15 min', status: 'Completed' },
    { id: 2, date: '2023-12-01', user: 'user2@example.com', feature: 'Story Upload', duration: '5 min', status: 'Completed' },
    { id: 3, date: '2023-12-01', user: 'user3@example.com', feature: 'Feedback Generation', duration: '2 min', status: 'Completed' },
    { id: 4, date: '2023-11-30', user: 'user4@example.com', feature: 'Voice Interview', duration: '20 min', status: 'Incomplete' },
    { id: 5, date: '2023-11-30', user: 'user5@example.com', feature: 'Story Upload', duration: '8 min', status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usage Analytics</h2>
          <p className="text-muted-foreground">
            Monitor system usage and performance metrics
          </p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5m</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1m</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+1.2%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Voice Interview</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-secondary rounded-full h-2">
                    <div className="w-4/5 bg-primary h-2 rounded-full" />
                  </div>
                  <span className="text-sm text-muted-foreground">80%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Story Upload</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-secondary rounded-full h-2">
                    <div className="w-3/5 bg-primary h-2 rounded-full" />
                  </div>
                  <span className="text-sm text-muted-foreground">60%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Feedback Generation</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-secondary rounded-full h-2">
                    <div className="w-2/5 bg-primary h-2 rounded-full" />
                  </div>
                  <span className="text-sm text-muted-foreground">40%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Usage Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">9:00 AM - 12:00 PM</span>
                <Badge>High</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">1:00 PM - 5:00 PM</span>
                <Badge>Medium</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">6:00 PM - 9:00 PM</span>
                <Badge variant="secondary">Low</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">9:00 PM - 9:00 AM</span>
                <Badge variant="secondary">Low</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Features</SelectItem>
                <SelectItem value="voice">Voice Interview</SelectItem>
                <SelectItem value="story">Story Upload</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="7">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {new Date(item.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{item.user}</TableCell>
                  <TableCell>{item.feature}</TableCell>
                  <TableCell>{item.duration}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}