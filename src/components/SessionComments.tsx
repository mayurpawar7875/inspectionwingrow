import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profiles: { full_name: string };
}

interface SessionCommentsProps {
  sessionId: string;
}

export function SessionComments({ sessionId }: SessionCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [sessionId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, profiles!comments_user_id_fkey (full_name)`)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('comments').insert({
        session_id: sessionId,
        user_id: user!.id,
        comment: newComment.trim(),
      });

      if (error) throw error;

      toast.success('Comment added successfully');
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      toast.error('Failed to add comment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Admin Comments ({comments.length})
      </h4>

      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium">{comment.profiles?.full_name || 'Admin'}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{comment.comment}</p>
            </CardContent>
          </Card>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button type="submit" disabled={loading || !newComment.trim()}>
          {loading ? 'Adding...' : 'Add Comment'}
        </Button>
      </form>
    </div>
  );
}
