import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  session_date: string;
  day_of_week: number;
  status: string;
  created_at: string;
  updated_at: string;
  task_counts: {
    employee_allocations: number;
    punch_in: number;
    land_search: number;
    stall_search: number;
    money_recovery: number;
    assets_usage: number;
    feedbacks: number;
    inspections: number;
    punch_out: number;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MyManagerSessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    const { data: sessionData } = await supabase
      .from('market_manager_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false });

    if (sessionData) {
      // Fetch task counts for each session
      const sessionsWithCounts = await Promise.all(
        sessionData.map(async (session) => {
          const [
            employeeAllocations,
            punchIn,
            landSearch,
            stallSearch,
            moneyRecovery,
            assetsUsage,
            feedbacks,
            inspections,
            punchOut,
          ] = await Promise.all([
            supabase.from('employee_allocations').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_manager_punchin').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_land_search').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('stall_searching_updates').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('assets_money_recovery').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('assets_usage').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('bms_stall_feedbacks').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_inspection_updates').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_manager_punchout').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
          ]);

          return {
            ...session,
            task_counts: {
              employee_allocations: employeeAllocations.count || 0,
              punch_in: punchIn.count || 0,
              land_search: landSearch.count || 0,
              stall_search: stallSearch.count || 0,
              money_recovery: moneyRecovery.count || 0,
              assets_usage: assetsUsage.count || 0,
              feedbacks: feedbacks.count || 0,
              inspections: inspections.count || 0,
              punch_out: punchOut.count || 0,
            },
          };
        })
      );

      setSessions(sessionsWithCounts);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">Completed</Badge>;
  };

  const getTotalTasks = (counts: Session['task_counts']) => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/manager-dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Sessions</h1>
              <p className="text-sm text-muted-foreground">View your session history and status</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No sessions found</p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {format(new Date(session.session_date), 'dd MMMM yyyy')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {DAY_NAMES[session.day_of_week]}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Tasks Completed:</span>
                      <span className="font-semibold">{getTotalTasks(session.task_counts)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Employee Allocations:</span>
                        <span className="font-medium">{session.task_counts.employee_allocations}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Punch-In:</span>
                        <span className="font-medium">{session.task_counts.punch_in}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Land Search:</span>
                        <span className="font-medium">{session.task_counts.land_search}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Stall Search:</span>
                        <span className="font-medium">{session.task_counts.stall_search}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Money Recovery:</span>
                        <span className="font-medium">{session.task_counts.money_recovery}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Assets Usage:</span>
                        <span className="font-medium">{session.task_counts.assets_usage}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Feedbacks:</span>
                        <span className="font-medium">{session.task_counts.feedbacks}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Inspections:</span>
                        <span className="font-medium">{session.task_counts.inspections}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Punch-Out:</span>
                        <span className="font-medium">{session.task_counts.punch_out}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Created: {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
