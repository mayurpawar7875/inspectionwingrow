import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, CheckCircle2 } from 'lucide-react';
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
  const [currentTask, setCurrentTask] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

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
    }
  }, [currentRole, navigate, authLoading]);

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
    toast.success('Session started');
  };

  const handleTaskComplete = (taskId: number) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
    }
    if (taskId < 9) {
      setCurrentTask(taskId + 1);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const renderTaskForm = () => {
    if (!sessionId) return null;

    switch (currentTask) {
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
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!sessionId ? (
          <SessionSelector onSessionCreate={handleSessionCreate} />
        ) : (
          <div className="grid md:grid-cols-[300px,1fr] gap-6">
            {/* Task List Sidebar */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold mb-4">Tasks</h2>
              {TASKS.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setCurrentTask(task.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    currentTask === task.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : completedTasks.includes(task.id)
                      ? 'bg-muted border-muted'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{task.name}</span>
                    {completedTasks.includes(task.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Current Task Form */}
            <div>{renderTaskForm()}</div>
          </div>
        )}
      </main>
    </div>
  );
}
