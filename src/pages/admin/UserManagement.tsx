import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Ban, Gift, DollarSign, Mail } from 'lucide-react';

// Mock user data
const users = [
  {
    id: '1',
    email: 'john.doe@example.com',
    status: 'active',
    minutesRemaining: 15,
    totalPurchased: 50,
    lastActive: '2024-01-15',
    joinDate: '2024-01-01',
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    status: 'banned',
    minutesRemaining: 0,
    totalPurchased: 25,
    lastActive: '2024-01-10',
    joinDate: '2023-12-15',
  },
  {
    id: '3',
    email: 'mike.johnson@example.com',
    status: 'active',
    minutesRemaining: 87,
    totalPurchased: 140,
    lastActive: '2024-01-16',
    joinDate: '2023-11-20',
  },
];

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleBanUser = (userId: string) => {
    // Implementation for banning user
    console.log('Banning user:', userId);
  };

  const handleGrantMinutes = (userId: string) => {
    // Implementation for granting minutes
    console.log('Granting minutes to user:', userId);
  };

  const handleRefund = (userId: string) => {
    // Implementation for processing refund
    console.log('Processing refund for user:', userId);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and billing
          </p>
        </header>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Find and manage specific user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email address..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button variant="outline">
                Advanced Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
            <CardDescription>
              All registered users and their account status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Minutes Remaining</TableHead>
                  <TableHead>Total Purchased</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'secondary' : 'destructive'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.minutesRemaining}</TableCell>
                    <TableCell>{user.totalPurchased}</TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGrantMinutes(user.id)}
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefund(user.id)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBanUser(user.id)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Grant Minutes</CardTitle>
              <CardDescription>
                Add practice minutes to a user's account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="User email" />
              <Input placeholder="Minutes to grant" type="number" />
              <Button className="w-full">Grant Minutes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Process Refund</CardTitle>
              <CardDescription>
                Refund a user's payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="User email" />
              <Input placeholder="Refund amount" type="number" />
              <Button className="w-full">Process Refund</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>
                Send a message to specific users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="User email" />
              <Input placeholder="Message subject" />
              <Button className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}