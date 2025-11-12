import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

export function ApprovedRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('approved-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('asset_requests')
      .select('*, asset_inventory(asset_name), markets(name), employees(full_name, email)')
      .eq('status', 'approved')
      .order('approval_date', { ascending: false });
    setRequests(data || []);
  };

  const handleMarkReturned = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'returned',
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Asset marked as returned');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to mark as returned');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approved Asset Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Approval Date</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>{request.employees?.full_name || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{request.employees?.email}</div>
                </TableCell>
                <TableCell className="capitalize">{request.requester_role}</TableCell>
                <TableCell>{request.asset_inventory?.asset_name}</TableCell>
                <TableCell>{request.quantity}</TableCell>
                <TableCell>{request.markets?.name || '-'}</TableCell>
                <TableCell>
                  {request.approval_date ? format(new Date(request.approval_date), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(request.expected_return_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handleMarkReturned(request.id)}
                    disabled={loading}
                  >
                    Mark Returned
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No approved requests
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}