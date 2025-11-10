import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SessionComments } from '@/components/SessionComments';
import { toast } from 'sonner';
import { Download, Eye, Filter, MapPin, Calendar, Clock, User } from 'lucide-react';

interface Session {
  id: string;
  user_id: string;
  market_id: string;
  session_date: string;
  market_date: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string;
  statuses?: string[]; // Array of all statuses (for expired + incomplete)
  finalized_at: string | null;
  employees: { full_name: string; phone: string | null } | null;
  markets: { name: string; location: string } | null;
  stalls?: any[];
  media?: any[];
}

export default function AllSessions() {
  const location = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    marketId: '',
  });
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    fetchMarkets();
    fetchSessions();
  }, []);

  useEffect(() => {
    // Apply filters based on navigation state
    const state = location.state as any;
    const today = new Date().toISOString().split('T')[0];
    
    if (state?.filterToday) {
      setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today, status: '' }));
    } else if (state?.filterCompleted) {
      setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today, status: 'completed' }));
    }
  }, [location.state]);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase.from('markets').select('*').order('name');
      if (error) throw error;
      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const toIST = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const y = ist.getFullYear();
        const m = String(ist.getMonth() + 1).padStart(2, '0');
        const d2 = String(ist.getDate()).padStart(2, '0');
        return `${y}-${m}-${d2}`;
      };
      // Fetch sessions without joins
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessions = sessionsData || [];
      if (sessions.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get unique user and market IDs
      const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))];
      const marketIds = [...new Set(sessions.map((s: any) => s.market_id).filter(Boolean))];
      const sessionIds = sessions.map((s: any) => s.id);

      // Compute date range (use session_date as fallback when market_date is null)
      const allDates = sessions
        .map((s: any) => (s.market_date || s.session_date))
        .filter(Boolean) as string[];
      const istDates = allDates.map((d: string) => toIST(d));
      const minDate = istDates.length ? istDates.reduce((a: string, b: string) => (a < b ? a : b)) : undefined;
      const maxDate = istDates.length ? istDates.reduce((a: string, b: string) => (a > b ? a : b)) : undefined;

      // Fetch stall confirmations first to get all users who created them
      const stallConfs = marketIds.length > 0 && minDate && maxDate ? await (async () => {
        const { data } = await supabase
          .from('stall_confirmations')
          .select('id, market_id, market_date, farmer_name, stall_name, stall_no, created_by, created_at')
          .in('market_id', marketIds)
          .gte('market_date', minDate)
          .lte('market_date', maxDate);
        return data || [];
      })() : [];

      // Get all user IDs from both sessions and stall confirmations
      const allUserIds = [...new Set([
        ...userIds,
        ...(stallConfs || []).map((sc: any) => sc.created_by).filter(Boolean)
      ])];

      // Fetch employees, markets, legacy stalls (by session), and media in parallel
      const [
        { data: employees },
        { data: markets },
        { data: stallsData },
        { data: mediaData }
      ] = await Promise.all([
        supabase.from('employees').select('id, full_name, phone').in('id', allUserIds),
        supabase.from('markets').select('id, name, location').in('id', marketIds),
        supabase.from('stalls').select('*').in('session_id', sessionIds),
        supabase.from('media').select('*').in('session_id', sessionIds)
      ]);

      const empById = Object.fromEntries((employees || []).map((e: any) => [e.id, e]));
      const mktById = Object.fromEntries((markets || []).map((m: any) => [m.id, m]));

      // Group legacy stalls by session_id and new stall_confirmations by composite key market_id|date|user
      const stallsBySession: Record<string, any[]> = {};
      const stallConfsByKey: Record<string, any[]> = {};
      const mediaBySession: Record<string, any[]> = {};

      (stallsData || []).forEach((stall: any) => {
        if (!stallsBySession[stall.session_id]) {
          stallsBySession[stall.session_id] = [];
        }
        stallsBySession[stall.session_id].push(stall);
      });

      (stallConfs || []).forEach((sc: any) => {
        const key = `${sc.market_id}|${sc.market_date}|${sc.created_by || ''}`;
        if (!stallConfsByKey[key]) {
          stallConfsByKey[key] = [];
        }
        stallConfsByKey[key].push(sc);
      });

      (mediaData || []).forEach((media: any) => {
        if (!mediaBySession[media.session_id]) {
          mediaBySession[media.session_id] = [];
        }
        mediaBySession[media.session_id].push(media);
      });

      // Fetch task data for all sessions to determine actual completion status
      const taskChecks = await Promise.all([
        supabase.from('offers').select('session_id').in('session_id', sessionIds),
        supabase.from('non_available_commodities').select('session_id').in('session_id', sessionIds),
        supabase.from('organiser_feedback').select('session_id').in('session_id', sessionIds),
        supabase.from('stall_inspections').select('session_id').in('session_id', sessionIds),
        supabase.from('next_day_planning').select('session_id').in('session_id', sessionIds)
      ]);

      const [offersData, commoditiesData, feedbackData, inspectionsData, planningData] = taskChecks.map(r => r.data || []);
      
      const tasksBySession: Record<string, { offers: boolean; commodities: boolean; feedback: boolean; inspections: boolean; planning: boolean; attendance: boolean; marketVideo: boolean; cleaningVideo: boolean }> = {};
      
      offersData.forEach((o: any) => {
        if (!tasksBySession[o.session_id]) tasksBySession[o.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        tasksBySession[o.session_id].offers = true;
      });
      commoditiesData.forEach((c: any) => {
        if (!tasksBySession[c.session_id]) tasksBySession[c.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        tasksBySession[c.session_id].commodities = true;
      });
      feedbackData.forEach((f: any) => {
        if (!tasksBySession[f.session_id]) tasksBySession[f.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        tasksBySession[f.session_id].feedback = true;
      });
      inspectionsData.forEach((i: any) => {
        if (!tasksBySession[i.session_id]) tasksBySession[i.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        tasksBySession[i.session_id].inspections = true;
      });
      planningData.forEach((p: any) => {
        if (!tasksBySession[p.session_id]) tasksBySession[p.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        tasksBySession[p.session_id].planning = true;
      });

      // Check media for attendance (photo), market_video, and cleaning_video
      (mediaData || []).forEach((media: any) => {
        if (!tasksBySession[media.session_id]) tasksBySession[media.session_id] = { offers: false, commodities: false, feedback: false, inspections: false, planning: false, attendance: false, marketVideo: false, cleaningVideo: false };
        if (media.media_type === 'photo' || media.media_type === 'attendance') {
          tasksBySession[media.session_id].attendance = true;
        }
        if (media.media_type === 'market_video') {
          tasksBySession[media.session_id].marketVideo = true;
        }
        if (media.media_type === 'cleaning_video') {
          tasksBySession[media.session_id].cleaningVideo = true;
        }
      });

      // Helper to calculate actual status - returns array of statuses
      const calculateStatus = (session: any, tasks: any): string[] => {
        // If already finalized, keep it
        if (session.status === 'finalized' || session.status === 'locked') {
          return [session.status];
        }

        // Check if all required tasks are completed
        const allTasksCompleted = tasks && 
          tasks.offers && 
          tasks.commodities && 
          tasks.feedback && 
          tasks.inspections && 
          tasks.planning && 
          tasks.attendance && 
          tasks.marketVideo && 
          tasks.cleaningVideo;

        // If all tasks done and punched out, mark as completed
        if (allTasksCompleted && session.punch_out_time) {
          return ['completed'];
        }

        // Otherwise, determine if session date has passed
        const nowUTC = new Date();
        const istTimeString = nowUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const istDate = new Date(istTimeString);
        const todayIST = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
        
        const sessionDateStr = session.session_date;

        // Compare dates as strings (YYYY-MM-DD format allows direct comparison)
        if (sessionDateStr < todayIST) {
          // Date has passed (after midnight) - show BOTH expired AND incomplete
          return ['expired', 'incomplete'];
        } else {
          // Current day or future - just incomplete
          return ['incomplete'];
        }
      };

      // Match stalls (prefer new stall_confirmations by market/date; fallback to legacy stalls by session)
      const sessionsWithData = sessions.map((session: any) => {
        const tasks = tasksBySession[session.id];
        const statuses = calculateStatus(session, tasks);
        
        return {
          ...session,
          status: statuses[0], // Primary status for filtering
          statuses: statuses, // All statuses for display
          employees: empById[session.user_id] || null,
          markets: mktById[session.market_id] || null,
          stalls: (() => {
            const dateStr = toIST(session.market_date || session.session_date);
            const key = `${session.market_id}|${dateStr}|${session.user_id}`;
            if (stallConfsByKey[key] && stallConfsByKey[key].length) return stallConfsByKey[key];
            return stallsBySession[session.id] || [];
          })(),
          media: mediaBySession[session.id] || []
        };
      });

      // Create virtual sessions for users who have stall confirmations but no sessions
      const existingSessionKeys = new Set(sessions.map((s: any) => `${s.market_id}|${toIST(s.market_date || s.session_date)}|${s.user_id}`));
      const virtualSessions = [];

      for (const [key, stallConfs] of Object.entries(stallConfsByKey)) {
        if (!existingSessionKeys.has(key) && stallConfs.length > 0) {
          const [marketId, marketDate, userId] = key.split('|');
          const employee = empById[userId];
          const market = mktById[marketId];
          
          if (employee && market) {
            virtualSessions.push({
              id: `virtual-${key}`,
              user_id: userId,
              market_id: marketId,
              session_date: marketDate,
              market_date: marketDate,
              punch_in_time: null,
              punch_out_time: null,
              status: 'stall_confirmations_only',
              finalized_at: null,
              employees: employee,
              markets: market,
              stalls: stallConfs,
              media: []
            });
          }
        }
      }

      setSessions([...sessionsWithData, ...virtualSessions] as any);
    } catch (error: any) {
      toast.error('Failed to load sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    if (filters.dateFrom) {
      filtered = filtered.filter((s) => s.session_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter((s) => s.session_date <= filters.dateTo);
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((s) => s.status === filters.status);
    }
    if (filters.marketId && filters.marketId !== 'all') {
      filtered = filtered.filter((s) => s.markets && 'id' in s.markets && (s.markets as any).id === filters.marketId);
    }

    setFilteredSessions(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Employee',
      'Market',
      'Punch In',
      'Punch Out',
      'Status',
      'Stalls Count',
      'Media Count',
    ];

    const rows = filteredSessions.map((s) => [
      s.session_date,
      s.employees?.full_name || 'N/A',
      s.markets?.name || 'N/A',
      s.punch_in_time ? new Date(s.punch_in_time).toLocaleString() : 'N/A',
      s.punch_out_time ? new Date(s.punch_out_time).toLocaleString() : 'N/A',
      s.status,
      s.stalls?.length || 0,
      s.media?.length || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-info text-info-foreground',
      completed: 'bg-success text-success-foreground',
      incomplete: 'bg-warning text-warning-foreground',
      expired: 'bg-destructive text-destructive-foreground',
      finalized: 'bg-success text-success-foreground',
      locked: 'bg-muted text-muted-foreground',
      stall_confirmations_only: 'bg-orange-100 text-orange-800',
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground'}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">All Sessions</h2>
          <p className="text-muted-foreground">View and manage employee reporting sessions</p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredSessions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="stall_confirmations_only">Stall Confirmations Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select
                value={filters.marketId}
                onValueChange={(val) => setFilters({ ...filters, marketId: val })}
              >
                <SelectTrigger id="market">
                  <SelectValue placeholder="All markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {markets.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
            {(filters.dateFrom || filters.dateTo || filters.status || filters.marketId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ dateFrom: '', dateTo: '', status: '', marketId: '' })}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No sessions found matching the filters
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{session.employees?.full_name || 'Unknown'}</h3>
                      <div className="flex gap-2">
                        {(session.statuses || [session.status]).map((status: string, idx: number) => (
                          <span key={idx}>{getStatusBadge(status)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.session_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {session.markets?.name || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        In: {session.punch_in_time ? new Date(session.punch_in_time).toLocaleTimeString() : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Out: {session.punch_out_time ? new Date(session.punch_out_time).toLocaleTimeString() : 'N/A'}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Stalls: <strong>{session.stalls?.length || 0}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Media: <strong>{session.media?.length || 0}</strong>
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              {selectedSession?.employees?.full_name} -{' '}
              {selectedSession && new Date(selectedSession.session_date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Employee Information</h4>
                  <p className="text-sm">
                    <strong>Name:</strong> {selectedSession.employees?.full_name}
                  </p>
                  <p className="text-sm">
                    <strong>Phone:</strong> {selectedSession.employees?.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Market Information</h4>
                  <p className="text-sm">
                    <strong>Market:</strong> {selectedSession.markets?.name}
                  </p>
                  <p className="text-sm">
                    <strong>Location:</strong> {selectedSession.markets?.location}
                  </p>
                </div>
              </div>

              {/* Stalls */}
              <div>
                <h4 className="font-semibold mb-3">Stalls ({selectedSession.stalls?.length || 0})</h4>
                {selectedSession.stalls?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedSession.stalls.map((stall: any) => (
                      <Card key={stall.id}>
                        <CardContent className="p-3">
                          <p className="text-sm">
                            <strong>{stall.stall_name}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">Farmer: {stall.farmer_name}</p>
                          <p className="text-xs text-muted-foreground">Stall No: {stall.stall_no}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No stalls recorded</p>
                )}
              </div>

              {/* Media */}
              <div>
                <h4 className="font-semibold mb-3">Media Files ({selectedSession.media?.length || 0})</h4>
                {selectedSession.media?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSession.media.map((media: any) => (
                      <Card key={media.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{media.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Type: {media.media_type === 'outside_rates' ? 'Outside Rates' : 'Selfie + GPS'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Captured: {new Date(media.captured_at).toLocaleString()}
                              </p>
                              {media.gps_lat && media.gps_lng && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  GPS: {media.gps_lat.toFixed(6)}, {media.gps_lng.toFixed(6)}
                                  <a
                                    href={`https://www.google.com/maps?q=${media.gps_lat},${media.gps_lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline ml-2"
                                  >
                                    View on Map
                                  </a>
                                </p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={media.file_url} target="_blank" rel="noopener noreferrer">
                                View File
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No media files uploaded</p>
                )}
              </div>

              {/* Comments */}
              <SessionComments sessionId={selectedSession.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
