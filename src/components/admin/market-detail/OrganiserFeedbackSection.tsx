import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { User } from 'lucide-react';

interface OrganiserFeedback {
  id: string;
  difficulties: string | null;
  feedback: string | null;
  created_at: string;
  user_id: string;
  employee_name: string;
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function OrganiserFeedbackSection({ marketId, marketDate, isToday }: Props) {
  const [feedbacks, setFeedbacks] = useState<OrganiserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();

    if (isToday) {
      const channel = supabase
        .channel('organiser-feedback-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'organiser_feedback',
          },
          () => {
            fetchFeedbacks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('organiser_feedback')
        .select('*')
        .eq('market_id', marketId)
        .eq('market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map(f => f.user_id))];
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedFeedbacks = data.map(f => ({
          ...f,
          employee_name: employeeMap.get(f.user_id) || 'Unknown',
        }));

        setFeedbacks(formattedFeedbacks);
      }
    } catch (error) {
      console.error('Error fetching organiser feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Organiser Feedback</CardTitle>
          <Badge variant="secondary">{feedbacks.length} Submissions</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {feedbacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No organiser feedback submitted yet
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{feedback.employee_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(feedback.created_at), 'hh:mm a')}
                  </span>
                </div>
                
                {feedback.difficulties && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Difficulties Faced</p>
                    <p className="text-sm mt-1">{feedback.difficulties}</p>
                  </div>
                )}

                {feedback.feedback && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Feedback</p>
                    <p className="text-sm mt-1">{feedback.feedback}</p>
                  </div>
                )}

                {!feedback.difficulties && !feedback.feedback && (
                  <p className="text-sm text-muted-foreground italic">No content provided</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
