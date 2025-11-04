import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface StallFeedbackFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function StallFeedbackForm({ sessionId, onComplete }: StallFeedbackFormProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState([3]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please enter feedback');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('bms_stall_feedbacks').insert({
      session_id: sessionId,
      feedback_text: feedback.trim(),
      rating: rating[0],
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save feedback');
      return;
    }

    toast.success('Feedback saved successfully');
    setFeedback('');
    setRating([3]);
    onComplete();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          BMS Stall Feedbacks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Rating: {rating[0]}/5</Label>
            <Slider
              id="rating"
              min={1}
              max={5}
              step={1}
              value={rating}
              onValueChange={setRating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
