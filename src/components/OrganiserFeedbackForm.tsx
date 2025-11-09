import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Trash2 } from 'lucide-react';

const feedbackSchema = z.object({
  difficulties: z.string().trim().max(2000, 'Difficulties must be less than 2000 characters').optional(),
  feedback: z.string().trim().max(2000, 'Feedback must be less than 2000 characters').optional(),
}).refine(data => data.difficulties || data.feedback, {
  message: 'Please enter at least one field',
  path: ['difficulties'],
});

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
  const [existingEntry, setExistingEntry] = useState<FeedbackEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      difficulties: '',
      feedback: '',
    },
  });

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
        form.reset({
          difficulties: data.difficulties || '',
          feedback: data.feedback || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: z.infer<typeof feedbackSchema>) => {
    setSaving(true);
    try {
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('organiser_feedback')
          .update({
            difficulties: data.difficulties?.trim() || null,
            feedback: data.feedback?.trim() || null,
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
            difficulties: data.difficulties?.trim() || null,
            feedback: data.feedback?.trim() || null,
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
      form.reset({ difficulties: '', feedback: '' });
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
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="difficulties"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulties Faced</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any difficulties or challenges you faced today..."
                      rows={4}
                      disabled={saving}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback about Organiser</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide feedback about the organiser's performance..."
                      rows={4}
                      disabled={saving}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
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
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
