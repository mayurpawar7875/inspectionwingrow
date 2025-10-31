import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function Finalize() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [user]);

  const fetchSession = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sessions')
        .select(`*, stalls(*), media(*)`)
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('No session found for today');
        navigate('/dashboard');
        return;
      }
      setSession(data);
    } catch (error: any) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const canFinalize = () => {
    return !!session;
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const now = new Date().toISOString();
      
      // Update session to completed
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'finalized', finalized_at: now })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Session marked as complete!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Failed to complete session');
      console.error(error);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const requirements = [
    { label: 'Punch In Time', met: !!session.punch_in_time },
    { label: 'At least one stall', met: session.stalls.length > 0 },
    { label: 'At least one media file', met: session.media.length > 0 },
    { label: 'Before 11:00 AM IST', met: new Date().getHours() < 11 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Mark Session Complete</CardTitle>
            <CardDescription>Optional: Mark your session as completed for the day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-info/10 p-4 rounded-lg">
              <p className="text-sm">
                All your tasks are automatically saved in real-time. This button is optional and simply marks your session as "completed" for the day.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Session Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Punch In</p>
                  <p className="font-semibold">
                    {session.punch_in_time ? 'Recorded' : 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Stalls Added</p>
                  <p className="font-semibold">{session.stalls?.length || 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Media Files</p>
                  <p className="font-semibold">{session.media?.length || 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{session.status}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleFinalize}
              disabled={!canFinalize() || finalizing || session.status === 'finalized'}
              className="w-full"
              size="lg"
            >
              {finalizing ? 'Marking Complete...' : session.status === 'finalized' ? 'Already Completed' : 'Mark Session Complete'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
