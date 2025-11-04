import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    fetchFeedbacks();

    const channel = supabase
      .channel('feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bms_stall_feedbacks' }, fetchFeedbacks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase
      .from('bms_stall_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    setFeedbacks(data || []);
  };

  return (
    <div className="grid gap-4">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {feedback.rating && `Rating: ${feedback.rating}/5`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{feedback.feedback_text || 'No feedback text'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {new Date(feedback.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
