import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, CheckCircle2, History, CalendarCheck } from 'lucide-react';
import { SessionSelector } from '@/components/market-manager/SessionSelector';
import { EmployeeAllocationForm } from '@/components/market-manager/EmployeeAllocationForm';
import { PunchInForm } from '@/components/market-manager/PunchInForm';
import { LandSearchForm } from '@/components/market-manager/LandSearchForm';
import { StallSearchForm } from '@/components/market-manager/StallSearchForm';
import { MoneyRecoveryForm } from '@/components/market-manager/MoneyRecoveryForm';
import { AssetsUsageForm } from '@/components/market-manager/AssetsUsageForm';
import { StallFeedbackForm } from '@/components/market-manager/StallFeedbackForm';
import { InspectionUpdateForm } from '@/components/market-manager/InspectionUpdateForm';
import { PunchOutForm } from '@/components/market-manager/PunchOutForm';

const TASKS = [
  { id: 1, name: 'Employee Allocation', completed: false },
  { id: 2, name: 'Punch-In', completed: false },
  { id: 3, name: 'New Market Land Search', completed: false },
  { id: 4, name: 'Stall Searching Updates', completed: false },
  { id: 5, name: 'Assets Money Recovery', completed: false },
  { id: 6, name: 'Assets Usage in Live Markets', completed: false },
  { id: 7, name: 'BMS Stall Feedbacks', completed: false },
  { id: 8, name: 'Market Inspection Update', completed: false },
  { id: 9, name: 'Punch-Out', completed: false },
];

export default function MarketManagerDashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (authLoading) return;

    if (currentRole !== 'market_manager') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'bdo') {
        navigate('/bdo-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Check for active session when component mounts
      checkActiveSession();
    }
  }, [currentRole, navigate, authLoading]);

  const checkActiveSession = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('market_manager_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSessionId(data.id);
      await fetchTaskCounts(data.id);
    }
  };

  const fetchTaskCounts = async (sessionId: string) => {
    const counts: Record<number, number> = {};
    
    const queries = await Promise.all([
      supabase.from('employee_allocations').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_manager_punchin').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_land_search').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('stall_searching_updates').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('assets_money_recovery').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('assets_usage').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('bms_stall_feedbacks').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_inspection_updates').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_manager_punchout').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
    ]);

    queries.forEach((result, index) => {
      counts[index + 1] = result.count || 0;
    });

    setTaskCounts(counts);
  };

  const handleSessionCreate = async (sessionDate: string, dayOfWeek: number) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('market_manager_sessions')
      .insert({
        user_id: user.id,
        session_date: sessionDate,
        day_of_week: dayOfWeek,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create session');
      return;
    }

    setSessionId(data.id);
    await fetchTaskCounts(data.id);
    toast.success('Session started');
  };

  useEffect(() => {
    if (sessionId) {
      fetchTaskCounts(sessionId);

      const channel = supabase
        .channel('task-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_allocations', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchin', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_land_search', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_searching_updates', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_money_recovery', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_usage', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bms_stall_feedbacks', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_inspection_updates', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchout', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId]);

  useEffect(() => {
    const checkSessionCompletion = async () => {
      if (!sessionId) return;

      // Check if all tasks have at least one entry
      const allTasksCompleted = TASKS.every(task => (taskCounts[task.id] || 0) > 0);

      if (allTasksCompleted) {
        const { error } = await supabase
          .from('market_manager_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId);

        if (!error) {
          toast.success('All tasks completed! Session marked as complete.');
        }
      }
    };

    checkSessionCompletion();
  }, [taskCounts, sessionId]);

  const handleTaskComplete = (taskId: number) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
    }
    setOpenDialog(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const renderTaskForm = (taskId: number) => {
    if (!sessionId) return null;

    switch (taskId) {
      case 1:
        return <EmployeeAllocationForm sessionId={sessionId} onComplete={() => handleTaskComplete(1)} />;
      case 2:
        return <PunchInForm sessionId={sessionId} onComplete={() => handleTaskComplete(2)} />;
      case 3:
        return <LandSearchForm sessionId={sessionId} onComplete={() => handleTaskComplete(3)} />;
      case 4:
        return <StallSearchForm sessionId={sessionId} onComplete={() => handleTaskComplete(4)} />;
      case 5:
        return <MoneyRecoveryForm sessionId={sessionId} onComplete={() => handleTaskComplete(5)} />;
      case 6:
        return <AssetsUsageForm sessionId={sessionId} onComplete={() => handleTaskComplete(6)} />;
      case 7:
        return <StallFeedbackForm sessionId={sessionId} onComplete={() => handleTaskComplete(7)} />;
      case 8:
        return <InspectionUpdateForm sessionId={sessionId} onComplete={() => handleTaskComplete(8)} />;
      case 9:
        return <PunchOutForm sessionId={sessionId} onComplete={() => handleTaskComplete(9)} />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Market Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/my-attendance')}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-manager-sessions')}>
              <History className="h-4 w-4 mr-2" />
              My Sessions
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!sessionId ? (
          <SessionSelector onSessionCreate={handleSessionCreate} />
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>
            {TASKS.map((task) => (
              <div key={task.id}>
                <button
                  onClick={() => setOpenDialog(task.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    completedTasks.includes(task.id)
                      ? 'bg-muted border-muted'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{task.name}</span>
                      {taskCounts[task.id] > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          {taskCounts[task.id]}
                        </span>
                      )}
                    </div>
                    {completedTasks.includes(task.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </button>

                <Dialog open={openDialog === task.id} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{task.name}</DialogTitle>
                    </DialogHeader>
                    {renderTaskForm(task.id)}
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
