import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileImage, FileText, Trash2, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { usePersonas } from '@/hooks/usePersonas';
import { parsePersonaCSV, matchImageFilesToCSV, validateImageFile } from '@/lib/personaUtils';
import { useToast } from '@/hooks/use-toast';

export default function PersonasManagement() {
  const { personas, loading, bulkUploadPersonas, togglePersonaVisibility, deletePersona } = usePersonas();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredPersonas = useMemo(() => {
    return personas.filter(persona =>
      persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.mood.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [personas, searchTerm]);

  const visiblePersonas = filteredPersonas.filter(p => p.is_visible);
  const hiddenPersonas = filteredPersonas.filter(p => !p.is_visible);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    const csvFiles = acceptedFiles.filter(file => file.type === 'text/csv');

    if (csvFiles.length > 0) {
      setCsvFile(csvFiles[0]);
    }

    const validImages = imageFiles.filter(file => {
      if (!validateImageFile(file)) {
        toast({
          title: 'Invalid Image',
          description: `${file.name} is not a valid image file or is too large (max 5MB)`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setUploadFiles(prev => [...prev, ...validImages]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'text/csv': ['.csv'],
    },
  });

  const handleBulkUpload = async () => {
    if (!csvFile || uploadFiles.length === 0) {
      toast({
        title: 'Missing Files',
        description: 'Please upload both CSV file and image files',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const csvData = await parsePersonaCSV(csvFile);
      const matchedData = matchImageFilesToCSV(csvData, uploadFiles);

      if (matchedData.length === 0) {
        toast({
          title: 'No Matches',
          description: 'No image files matched the filenames in CSV',
          variant: 'destructive',
        });
        return;
      }

      await bulkUploadPersonas(matchedData);
      setUploadDialogOpen(false);
      setUploadFiles([]);
      setCsvFile(null);
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to process upload',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeCsvFile = () => {
    setCsvFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Personas Management</h2>
          <p className="text-muted-foreground">
            Upload and manage interview personas with images
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Upload Personas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files or click to select'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload image files (PNG, JPG, GIF, WebP) and CSV file (filename, alt_text, mood_desc)
                </p>
              </div>

              {csvFile && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="font-medium">CSV File</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCsvFile}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{csvFile.name}</p>
                </div>
              )}

              {uploadFiles.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileImage className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Image Files ({uploadFiles.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={50} />
                  <p className="text-sm text-muted-foreground text-center">Processing upload...</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={!csvFile || uploadFiles.length === 0 || isProcessing}
                >
                  Upload Personas
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
            <p className="text-xs text-muted-foreground">All personas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visiblePersonas.length}</div>
            <p className="text-xs text-muted-foreground">Active personas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Hidden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hiddenPersonas.length}</div>
            <p className="text-xs text-muted-foreground">Inactive personas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(personas.length * 0.5).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">MB used</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personas List</CardTitle>
          <div className="flex gap-4">
            <Input 
              placeholder="Search personas..." 
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading personas...</div>
          ) : filteredPersonas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No personas found matching your search' : 'No personas uploaded yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Alt Text</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonas.map((persona) => (
                  <TableRow key={persona.id}>
                    <TableCell>
                      <img 
                        src={persona.image_url} 
                        alt={persona.alt_text}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {persona.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{persona.mood}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{persona.alt_text}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={persona.is_visible}
                          onCheckedChange={(checked) => togglePersonaVisibility(persona.id, checked)}
                        />
                        <Label className="text-sm">
                          {persona.is_visible ? 'Visible' : 'Hidden'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePersonaVisibility(persona.id, !persona.is_visible)}
                        >
                          {persona.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Persona</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{persona.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePersona(persona.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}