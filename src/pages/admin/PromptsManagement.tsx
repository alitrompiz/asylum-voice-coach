import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, MessageSquare, Eye } from 'lucide-react';

export default function PromptsManagement() {
  const prompts = [
    {
      id: 1,
      name: 'Interview Opening',
      type: 'System',
      category: 'Greeting',
      version: 'v2.1',
      status: 'Active',
      lastUsed: '2023-12-01',
    },
    {
      id: 2,
      name: 'Feedback Generation',
      type: 'AI',
      category: 'Analysis',
      version: 'v1.5',
      status: 'Active',
      lastUsed: '2023-12-01',
    },
    {
      id: 3,
      name: 'Error Handling',
      type: 'System',
      category: 'Fallback',
      version: 'v1.0',
      status: 'Inactive',
      lastUsed: '2023-11-28',
    },
    {
      id: 4,
      name: 'Legal Context',
      type: 'Persona',
      category: 'Legal',
      version: 'v3.0',
      status: 'Active',
      lastUsed: '2023-12-01',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Prompts Management</h2>
          <p className="text-muted-foreground">
            Manage system prompts and AI instructions
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Prompt
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">System prompts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Prompt categories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompts List</CardTitle>
          <div className="flex gap-4">
            <Input placeholder="Search prompts..." className="flex-1" />
            <Button variant="outline">Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {prompt.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{prompt.type}</Badge>
                  </TableCell>
                  <TableCell>{prompt.category}</TableCell>
                  <TableCell>{prompt.version}</TableCell>
                  <TableCell>
                    <Badge variant={prompt.status === 'Active' ? 'default' : 'secondary'}>
                      {prompt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(prompt.lastUsed).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Editor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create or edit system prompts
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Prompt Name</label>
              <Input placeholder="Enter prompt name..." />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input placeholder="Enter category..." />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Prompt Content</label>
            <Textarea
              placeholder="Enter your prompt content here..."
              className="min-h-[200px]"
            />
          </div>
          <div className="flex gap-2">
            <Button>Save Prompt</Button>
            <Button variant="outline">Preview</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}