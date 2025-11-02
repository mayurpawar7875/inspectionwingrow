import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, User } from 'lucide-react';

interface TaskEvent {
  id: string;
  task_type: string;
  created_at: string;
  is_late: boolean;
  payload: any;
  file_url?: string;
  session_info?: {
    employee_name: string;
    market_name: string;
  };
}

interface EmployeeTimelineProps {
  marketId?: string;
}

export default function EmployeeTimeline({ marketId }: EmployeeTimelineProps) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string>(marketId || 'all');
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    // Update selectedMarket when marketId prop changes
    if (marketId) {
      setSelectedMarket(marketId);
    }
  }, [marketId]);

  useEffect(() => {
    if (!marketId) {
      fetchMarkets();
    }
    fetchEvents();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('task-events-timeline')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_events',
      }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMarket, marketId]);

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    setMarkets(data || []);
  };

  const fetchEvents = async () => {
    try {
      // First, get sessions matching the market filter
      let sessionsQuery = supabase
        .from('sessions')
        .select('id, user_id, market_id');

      if (selectedMarket && selectedMarket !== 'all') {
        sessionsQuery = sessionsQuery.eq('market_id', selectedMarket);
      }

      const { data: sessions } = await sessionsQuery;
      
      if (!sessions || sessions.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // Now fetch events only for those sessions
      const { data, error } = await supabase
        .from('task_events')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const events = data || [];
      if (events.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const sessionsById = Object.fromEntries(sessions.map((s: any) => [s.id, s]));

      // Get unique user and market IDs
      const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))];
      const marketIds = [...new Set(sessions.map((s: any) => s.market_id).filter(Boolean))];

      // Fetch employees and markets
      const [{ data: employees }, { data: markets }] = await Promise.all([
        supabase.from('employees').select('id, full_name').in('id', userIds),
        supabase.from('markets').select('id, name').in('id', marketIds),
      ]);

      const empById = Object.fromEntries((employees || []).map((e: any) => [e.id, e.full_name]));
      const mktById = Object.fromEntries((markets || []).map((m: any) => [m.id, m.name]));

      // Transform the data to match our interface
      const transformedData = events.map((event: any) => {
        const session = sessionsById[event.session_id];
        return {
          ...event,
          session_info: {
            employee_name: session ? empById[session.user_id] || 'Unknown' : 'Unknown',
            market_name: session ? mktById[session.market_id] || 'Unknown' : 'Unknown',
          },
        };
      });

      setEvents(transformedData);
    } catch (error) {
      console.error('Error fetching task events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'short',
    }) + ' IST';
  };

  const getTaskLabel = (taskType: string) => {
    const labels: Record<string, string> = {
      punch: 'Punch',
      stall_confirm: 'Stall Confirmation',
      outside_rates: 'Outside Rates',
      selfie_gps: 'Selfie + GPS',
      rate_board: 'Rate Board Photo',
      market_video: 'Market Video',
      cleaning_video: 'Cleaning Video',
      collection: 'Collection',
    };
    return labels[taskType] || taskType;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Employee Live Timeline</CardTitle>
            <CardDescription>
              {marketId ? 'Real-time task submissions for this market' : 'Real-time task submissions across all markets'}
            </CardDescription>
          </div>
          {!marketId && (
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map((market) => (
                  <SelectItem key={market.id} value={market.id}>
                    {market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No task events yet
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {event.session_info?.employee_name || 'Unknown'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {event.session_info?.market_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getTaskLabel(event.task_type)}</Badge>
                        {event.is_late && (
                          <Badge variant="destructive">Late</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.created_at)}
                    </div>
                  </div>
                  {event.payload && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                      {JSON.stringify(event.payload, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
