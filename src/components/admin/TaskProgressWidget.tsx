import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock } from 'lucide-react';

interface TaskStatus {
  task_type: string;
  status: string;
  updated_at: string;
}

interface Session {
  id: string;
  employee_name: string;
  market_name: string;
  task_statuses: TaskStatus[];
}

export default function TaskProgressWidget() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const allTasks = [
    'punch',
    'stall_confirm',
    'outside_rates',
    'selfie_gps',
    'rate_board',
    'market_video',
    'cleaning_video',
    'collection',
  ];

  useEffect(() => {
    fetchSessions();

    // Subscribe to task_status changes
    const channel = supabase
      .channel('task-status-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_status',
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          user_id,
          market_id,
          task_status:task_status(task_type, status, updated_at)
        `)
        .eq('session_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sessions = data || [];
      if (sessions.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get unique user and market IDs
      const userIds = [...new Set(sessions.map(s => s.user_id).filter(Boolean))];
      const marketIds = [...new Set(sessions.map(s => s.market_id).filter(Boolean))];

      // Fetch employees and markets
      const [{ data: employees }, { data: markets }] = await Promise.all([
        supabase.from('employees').select('id, full_name').in('id', userIds),
        supabase.from('markets').select('id, name').in('id', marketIds),
      ]);

      const empById = Object.fromEntries((employees || []).map((e: any) => [e.id, e.full_name]));
      const mktById = Object.fromEntries((markets || []).map((m: any) => [m.id, m.name]));

      // Transform the data to match our interface
      const transformedData = sessions.map((session: any) => ({
        id: session.id,
        employee_name: empById[session.user_id] || 'Unknown',
        market_name: mktById[session.market_id] || 'Unknown',
        task_statuses: session.task_status || [],
      }));

      setSessions(transformedData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskLabel = (taskType: string) => {
    const labels: Record<string, string> = {
      punch: 'Punch',
      stall_confirm: 'Stalls',
      outside_rates: 'Outside Rates',
      selfie_gps: 'Selfie GPS',
      rate_board: 'Rate Board',
      market_video: 'Market Video',
      cleaning_video: 'Cleaning',
      collection: 'Collection',
    };
    return labels[taskType] || taskType;
  };

  const getTaskStatus = (session: Session, taskType: string) => {
    const status = session.task_statuses?.find((t: any) => t.task_type === taskType);
    return status?.status || 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
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
            <CardTitle>Task Progress Summary</CardTitle>
            <CardDescription>Track completion status for each employee</CardDescription>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions for selected date
            </div>
          ) : (
            sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h4 className="font-semibold">{session.employee_name}</h4>
                    <p className="text-sm text-muted-foreground">{session.market_name}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {allTasks.map((taskType) => {
                      const status = getTaskStatus(session, taskType);
                      return (
                        <div
                          key={taskType}
                          className="flex items-center gap-1 p-2 bg-muted rounded text-xs"
                        >
                          {getStatusIcon(status)}
                          <span className="truncate">{getTaskLabel(taskType)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
