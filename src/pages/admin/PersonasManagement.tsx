import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, User } from 'lucide-react';

export default function PersonasManagement() {
  const personas = [
    { id: 1, name: 'Professional Officer', type: 'Formal', language: 'English', interviews: 456 },
    { id: 2, name: 'Empathetic Counselor', type: 'Supportive', language: 'English', interviews: 342 },
    { id: 3, name: 'Strict Examiner', type: 'Challenging', language: 'English', interviews: 198 },
    { id: 4, name: 'Cultural Liaison', type: 'Understanding', language: 'Spanish', interviews: 165 },
    { id: 5, name: 'Legal Advisor', type: 'Informative', language: 'English', interviews: 134 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Personas Management</h2>
          <p className="text-muted-foreground">
            Configure interview personas and their characteristics
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Persona
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Active personas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Most Popular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Professional</div>
            <p className="text-xs text-muted-foreground">456 interviews</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Supported languages</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2</div>
            <p className="text-xs text-muted-foreground">User satisfaction</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personas List</CardTitle>
          <div className="flex gap-4">
            <Input placeholder="Search personas..." className="flex-1" />
            <Button variant="outline">Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Interviews</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {persona.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{persona.type}</Badge>
                  </TableCell>
                  <TableCell>{persona.language}</TableCell>
                  <TableCell>{persona.interviews}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
    </div>
  );
}