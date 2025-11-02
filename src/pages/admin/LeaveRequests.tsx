import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Leave {
  id: string;
  user_id: string;
  leave_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
    const channel = supabase
      .channel('admin-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_leaves' }, fetchLeaves)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeaves = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('employee_leaves')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeaves(data || []);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const decide = async (leave: Leave, status: 'approved' | 'rejected') => {
    try {
      const { error } = await (supabase as any)
        .from('employee_leaves')
        .update({ status, decided_at: new Date().toISOString() })
        .eq('id', leave.id);
      if (error) throw error;
      await fetchLeaves();
    } catch (err) {
      console.error('Error updating leave:', err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminLayout>
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Approve or reject employee leave requests</p>
        </div>

        {leaves.map((l) => (
          <Card key={l.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{new Date(l.leave_date).toLocaleDateString()}</CardTitle>
                  <CardDescription>
                    Status: <span className="font-medium">{l.status}</span>
                  </CardDescription>
                </div>
                {l.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => decide(l, 'rejected')}>Reject</Button>
                    <Button onClick={() => decide(l, 'approved')}>Approve</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{l.reason}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}



