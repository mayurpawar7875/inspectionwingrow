import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Trash2 } from 'lucide-react';

interface Props {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

interface FeedbackEntry {
  id: string;
  difficulties: string | null;
  feedback: string | null;
}

export default function OrganiserFeedbackForm({ sessionId, marketId, marketDate, userId, onSuccess }: Props) {
  const [difficulties, setDifficulties] = useState('');
  const [feedback, setFeedback] = useState('');
  const [existingEntry, setExistingEntry] = useState<FeedbackEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExistingFeedback();
  }, [userId, marketDate]);

  const fetchExistingFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('organiser_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('market_date', marketDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingEntry(data);
        setDifficulties(data.difficulties || '');
        setFeedback(data.feedback || '');
      }
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!difficulties.trim() && !feedback.trim()) {
      toast.error('Please enter at least one field');
      return;
    }

    setSaving(true);
    try {
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('organiser_feedback')
          .update({
            difficulties: difficulties.trim() || null,
            feedback: feedback.trim() || null,
          })
          .eq('id', existingEntry.id);

        if (error) throw error;
        toast.success('Feedback updated successfully');
      } else {
        // Create new entry
        const { error } = await supabase
          .from('organiser_feedback')
          .insert({
            user_id: userId,
            session_id: sessionId,
            market_id: marketId,
            market_date: marketDate,
            difficulties: difficulties.trim() || null,
            feedback: feedback.trim() || null,
          });

        if (error) throw error;
        toast.success('Feedback saved successfully');
      }

      await fetchExistingFeedback();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEntry) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organiser_feedback')
        .delete()
        .eq('id', existingEntry.id);

      if (error) throw error;

      setExistingEntry(null);
      setDifficulties('');
      setFeedback('');
      toast.success('Feedback deleted successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organiser Feedback & Difficulties</CardTitle>
        <CardDescription>Report any difficulties faced and provide feedback about the organiser</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="difficulties">Difficulties Faced</Label>
          <Textarea
            id="difficulties"
            placeholder="Describe any difficulties or challenges you faced today..."
            value={difficulties}
            onChange={(e) => setDifficulties(e.target.value)}
            rows={4}
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback">Feedback about Organiser</Label>
          <Textarea
            id="feedback"
            placeholder="Provide feedback about the organiser's performance..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            disabled={saving}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {existingEntry ? 'Update' : 'Save'}
              </>
            )}
          </Button>

          {existingEntry && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
