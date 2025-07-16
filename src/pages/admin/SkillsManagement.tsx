import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function SkillsManagement() {
  const skills = [
    { id: 1, name: 'Communication', category: 'Soft Skills', interviews: 245 },
    { id: 2, name: 'Legal Knowledge', category: 'Legal', interviews: 189 },
    { id: 3, name: 'Storytelling', category: 'Communication', interviews: 156 },
    { id: 4, name: 'Document Preparation', category: 'Legal', interviews: 134 },
    { id: 5, name: 'Cultural Awareness', category: 'Cultural', interviews: 98 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Skills Management</h2>
          <p className="text-muted-foreground">
            Manage interview skills and categories
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Skill
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Most Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Communication</div>
            <p className="text-xs text-muted-foreground">245 interviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skills List</CardTitle>
          <div className="flex gap-4">
            <Input placeholder="Search skills..." className="flex-1" />
            <Button variant="outline">Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Interviews</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">{skill.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{skill.category}</Badge>
                  </TableCell>
                  <TableCell>{skill.interviews}</TableCell>
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