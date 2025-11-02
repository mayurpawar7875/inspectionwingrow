import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, MapPin, Eye, Filter, Search } from 'lucide-react';

interface Session {
  id: string;
  session_date: string;
  market_date: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string;
  finalized_at: string | null;
  market_id: string;
  market: { name: string; location: string } | null;
  stalls_count?: number;
  media_count?: number;
  tasks_completed?: number;
  tasks_total?: number;
  all_tasks_completed?: boolean;
}

interface BDOSubmission {
  id: string;
  name: string;
  submitted_at: string;
  status: string;
  opening_date: string;
  review_notes: string | null;
}

interface BDOMediaUpload {
  id: string;
  file_name: string;
  captured_at: string;
  media_type: string;
  market_date: string;
}

export default function MySessions() {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    searchQuery: '',
  });
  
  // BDO specific states
  const [bdoMarketSubmissions, setBdoMarketSubmissions] = useState<BDOSubmission[]>([]);
  const [bdoMediaUploads, setBdoMediaUploads] = useState<BDOMediaUpload[]>([]);

  useEffect(() => {
    if (user) {
      if (currentRole === 'bdo') {
        fetchBDOData();
      } else {
        fetchSessions();
      }
    }
  }, [user, currentRole]);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchBDOData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch BDO market submissions
      const { data: marketSubmissions, error: marketError } = await supabase
        .from('bdo_market_submissions')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (marketError) throw marketError;

      // Fetch BDO media uploads
      const { data: mediaUploads, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .order('captured_at', { ascending: false });

      if (mediaError) throw mediaError;

      setBdoMarketSubmissions(marketSubmissions || []);
      setBdoMediaUploads(mediaUploads || []);
    } catch (error: any) {
      console.error('Error fetching BDO data:', error);
      toast.error('Failed to load your submission history');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all sessions for the current user
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          market_date,
          punch_in_time,
          punch_out_time,
          status,
          finalized_at,
          market_id,
          market:markets(name, location)
        `)
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionList = (sessionsData || []) as Session[];

      const todayIST = getISTDateString(new Date());
      
      // Define required task types
      const requiredTasks = ['punch', 'stall_confirm', 'outside_rates', 'selfie_gps', 'rate_board', 'market_video', 'cleaning_video', 'collection'];
      
      // Fetch additional stats for each session and update old active sessions
      const sessionsWithStats = await Promise.all(
        sessionList.map(async (session) => {
          const [stallsResult, mediaResult, taskStatusResult] = await Promise.all([
            supabase
              .from('stall_confirmations')
              .select('id', { count: 'exact', head: true })
              .eq('market_id', session.market_id)
              .eq('market_date', session.market_date || session.session_date),
            supabase
              .from('media')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session.id),
            supabase
              .from('task_status')
              .select('task_type, status')
              .eq('session_id', session.id),
          ]);

          // Check if all required tasks are completed (status is 'submitted' or 'locked')
          const taskStatuses = taskStatusResult.data || [];
          const completedTasks = taskStatuses.filter(
            (ts: any) => ts.status === 'submitted' || ts.status === 'locked'
          );
          const allTasksCompleted = requiredTasks.every((taskType) => {
            const taskStatus = taskStatuses.find((ts: any) => ts.task_type === taskType);
            return taskStatus && (taskStatus.status === 'submitted' || taskStatus.status === 'locked');
          });

          // If session is from a previous day and still marked as active, determine correct status
          const sessionDate = session.market_date || session.session_date;
          const isExpired = sessionDate < todayIST;
          let finalStatus = session.status;
          
          if (isExpired) {
            if (session.status === 'active') {
              // Session expired - update to completed in database
              try {
                await supabase
                  .from('sessions')
                  .update({ status: 'completed' })
                  .eq('id', session.id);
              } catch (error) {
                console.error('Error updating session status:', error);
              }
              
              // Determine display status based on task completion
              if (allTasksCompleted) {
                finalStatus = 'completed';
              } else {
                finalStatus = 'incomplete_expired';
              }
            } else if (session.status !== 'finalized' && session.status !== 'locked' && !allTasksCompleted) {
              // Session is already completed/finalized but tasks are incomplete, mark as incomplete_expired for display
              finalStatus = 'incomplete_expired';
            }
          }

          return {
            ...session,
            status: finalStatus,
            stalls_count: stallsResult.count || 0,
            media_count: mediaResult.count || 0,
            tasks_completed: completedTasks.length,
            tasks_total: requiredTasks.length,
            all_tasks_completed: allTasksCompleted,
          };
        })
      );

      setSessions(sessionsWithStats);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load session history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (s) => s.session_date >= filters.dateFrom
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (s) => s.session_date <= filters.dateTo
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    // Search filter (market name)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.market?.name?.toLowerCase().includes(query) ||
          s.market?.location?.toLowerCase().includes(query)
      );
    }

    setFilteredSessions(filtered);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-info text-info-foreground',
      completed: 'bg-success text-success-foreground',
      finalized: 'bg-success text-success-foreground',
      locked: 'bg-muted text-muted-foreground',
      incomplete_expired: 'bg-destructive text-destructive-foreground',
    };

    const labels: Record<string, string> = {
      active: 'Active',
      completed: 'Completed',
      finalized: 'Finalized',
      locked: 'Locked',
      incomplete_expired: 'Incomplete & Expired',
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-muted'}>
        {labels[status as keyof typeof labels] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    return new Date(timeStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = async (session: Session) => {
    setSelectedSession(session);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // BDO View
  if (currentRole === 'bdo') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/bdo-dashboard')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">My Submissions</h1>
                  <p className="text-sm text-muted-foreground">
                    View your market submissions and media uploads
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Market Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Market Location Submissions</CardTitle>
                <CardDescription>Markets you've submitted for review</CardDescription>
              </CardHeader>
              <CardContent>
                {bdoMarketSubmissions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No market submissions yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market Name</TableHead>
                        <TableHead>Opening Date</TableHead>
                        <TableHead>Submitted On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bdoMarketSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.name}</TableCell>
                          <TableCell>{formatDate(submission.opening_date)}</TableCell>
                          <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                submission.status === 'approved'
                                  ? 'default'
                                  : submission.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {submission.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {submission.review_notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Media Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>Media Uploads</CardTitle>
                <CardDescription>Videos and photos you've uploaded</CardDescription>
              </CardHeader>
              <CardContent>
                {bdoMediaUploads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No media uploads yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Uploaded On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bdoMediaUploads.map((media) => (
                        <TableRow key={media.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {media.file_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {media.media_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(media.market_date)}</TableCell>
                          <TableCell>{formatDate(media.captured_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Employee View
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">My Session History</h1>
                <p className="text-sm text-muted-foreground">
                  View all markets you've attended
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Market name..."
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters({ ...filters, searchQuery: e.target.value })
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value === 'all' ? '' : value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="finalized">Finalized</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="incomplete_expired">Incomplete & Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {sessions.length === 0
                  ? "You haven't attended any markets yet."
                  : 'No sessions match your filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead>Stalls</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(session.session_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {session.market?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.market?.location || ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(session.punch_in_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(session.punch_out_time)}
                          </div>
                        </TableCell>
                        <TableCell>{session.stalls_count || 0}</TableCell>
                        <TableCell>{session.media_count || 0}</TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(session)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session Details Dialog */}
        {selectedSession && (
          <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Session Details</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedSession.session_date)} -{' '}
                  {selectedSession.market?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Market</Label>
                    <p className="font-medium">
                      {selectedSession.market?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.market?.location || ''}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedSession.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">
                      {formatDate(selectedSession.session_date)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Finalized At</Label>
                    <p className="font-medium">
                      {selectedSession.finalized_at
                        ? formatDate(selectedSession.finalized_at) +
                          ' ' +
                          formatTime(selectedSession.finalized_at)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Punch In Time</Label>
                    <p className="font-medium">
                      {formatTime(selectedSession.punch_in_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Punch Out Time</Label>
                    <p className="font-medium">
                      {formatTime(selectedSession.punch_out_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stalls Confirmed</Label>
                    <p className="font-medium">
                      {selectedSession.stalls_count || 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Media Uploads</Label>
                    <p className="font-medium">
                      {selectedSession.media_count || 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tasks Completion</Label>
                    <p className="font-medium">
                      {selectedSession.tasks_completed || 0} / {selectedSession.tasks_total || 0} tasks completed
                    </p>
                    {selectedSession.status === 'incomplete_expired' && (
                      <p className="text-xs text-destructive mt-1">
                        Some tasks were not completed before the session expired
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}

