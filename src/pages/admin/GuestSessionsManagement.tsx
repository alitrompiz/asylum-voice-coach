import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

interface GuestSession {
  id: string;
  guest_token: string;
  guest_name: string;
  created_at: string;
  story_source: 'upload' | 'paste' | 'mock' | null;
  story_text: string | null;
  story_first_name: string | null;
  story_last_name: string | null;
  selected_test_story: { title: string; category: string } | null;
  selected_persona: { name: string; mood: string } | null;
  selected_language: string | null;
  session_duration_seconds: number | null;
  full_transcript: string | null;
  feedback_requested: boolean;
  feedback_email: string | null;
  feedback_sent_at: string | null;
  converted_to_user_id: string | null;
  conversion_email: string | null;
  converted_at: string | null;
}

export default function GuestSessionsManagement() {
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<GuestSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  // Filters
  const [storySourceFilter, setStorySourceFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [convertedFilter, setConvertedFilter] = useState('all');
  const [feedbackRequestedFilter, setFeedbackRequestedFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadSessions();
  }, [page, storySourceFilter, languageFilter, convertedFilter, feedbackRequestedFilter, dateFrom, dateTo]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (storySourceFilter !== 'all') params.append('storySource', storySourceFilter);
      if (languageFilter !== 'all') params.append('language', languageFilter);
      if (convertedFilter !== 'all') params.append('converted', convertedFilter);
      if (feedbackRequestedFilter !== 'all') params.append('feedbackRequested', feedbackRequestedFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const { data, error } = await supabase.functions.invoke(
        `admin-guest-sessions?${params.toString()}`
      );

      if (error) throw error;

      setSessions(data.sessions || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error loading guest sessions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load guest sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToEST = (utcDate: string | null) => {
    if (!utcDate) return 'N/A';
    try {
      const date = new Date(utcDate);
      return format(fromZonedTime(date, 'America/New_York'), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleViewDetails = (session: GuestSession) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const handleDownloadTranscript = (session: GuestSession) => {
    if (!session.full_transcript) return;
    
    const blob = new Blob([session.full_transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${session.guest_name || 'guest'}-${format(new Date(session.created_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setStorySourceFilter('all');
    setLanguageFilter('all');
    setConvertedFilter('all');
    setFeedbackRequestedFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guest Sessions</h1>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Story Source</label>
              <Select value={storySourceFilter} onValueChange={setStorySourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="paste">Paste</SelectItem>
                  <SelectItem value="mock">Mock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Converted</label>
              <Select value={convertedFilter} onValueChange={setConvertedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Feedback Requested</label>
              <Select value={feedbackRequestedFilter} onValueChange={setFeedbackRequestedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadSessions} variant="default">
              Apply Filters
            </Button>
            <Button onClick={resetFilters} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time (EST)</TableHead>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Story Source</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Converted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-sm">
                      {convertToEST(session.created_at)}
                    </TableCell>
                    <TableCell>{session.guest_name || 'Anonymous'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {session.story_source || 'N/A'}
                      </Badge>
                      {session.story_source === 'mock' && session.selected_test_story && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.selected_test_story.title}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.selected_persona?.name || 'N/A'}
                      {session.selected_persona && (
                        <div className="text-xs text-muted-foreground">
                          {session.selected_persona.mood}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{session.selected_language || 'N/A'}</TableCell>
                    <TableCell>{formatDuration(session.session_duration_seconds)}</TableCell>
                    <TableCell>
                      {session.feedback_requested ? (
                        <div>
                          <Badge variant="default">Requested</Badge>
                          {session.feedback_email && (
                            <div className="text-xs mt-1">{session.feedback_email}</div>
                          )}
                          {session.feedback_sent_at && (
                            <div className="text-xs text-muted-foreground">
                              Sent: {convertToEST(session.feedback_sent_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Requested</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.converted_to_user_id ? (
                        <div>
                          <Badge variant="default">Yes</Badge>
                          {session.conversion_email && (
                            <div className="text-xs mt-1">{session.conversion_email}</div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(session)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {session.full_transcript && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadTranscript(session)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No guest sessions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {!loading && sessions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Session Info</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Guest Name:</strong> {selectedSession.guest_name || 'Anonymous'}</div>
                    <div><strong>Created:</strong> {convertToEST(selectedSession.created_at)}</div>
                    <div><strong>Duration:</strong> {formatDuration(selectedSession.session_duration_seconds)}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Story Info</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Source:</strong> {selectedSession.story_source || 'N/A'}</div>
                    <div><strong>First Name:</strong> {selectedSession.story_first_name || 'N/A'}</div>
                    <div><strong>Last Name:</strong> {selectedSession.story_last_name || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {selectedSession.story_text && (
                <div>
                  <h3 className="font-semibold mb-2">Story Text</h3>
                  <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto text-sm whitespace-pre-wrap">
                    {selectedSession.story_text}
                  </div>
                </div>
              )}

              {selectedSession.full_transcript && (
                <div>
                  <h3 className="font-semibold mb-2">Interview Transcript</h3>
                  <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto text-sm whitespace-pre-wrap">
                    {selectedSession.full_transcript}
                  </div>
                </div>
              )}

              {selectedSession.converted_to_user_id && (
                <div>
                  <h3 className="font-semibold mb-2">Account Conversion</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Email:</strong> {selectedSession.conversion_email || 'N/A'}</div>
                    <div><strong>Converted At:</strong> {convertToEST(selectedSession.converted_at)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
