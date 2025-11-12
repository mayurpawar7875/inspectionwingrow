import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function PendingRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('pending-requests-changes')
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
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const handleApprove = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'approved',
          approval_date: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request approved successfully');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: user?.id,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Request rejected');
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Asset Requests</CardTitle>
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
              <TableHead>Purpose</TableHead>
              <TableHead>Return Date</TableHead>
              <TableHead>Request Date</TableHead>
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
                <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                <TableCell>{format(new Date(request.expected_return_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request.id)}
                      disabled={loading}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Rejection Reason *</Label>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Provide a reason for rejection"
                              rows={4}
                            />
                          </div>
                          <Button onClick={handleReject} disabled={loading} variant="destructive" className="w-full">
                            {loading ? 'Rejecting...' : 'Confirm Rejection'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No pending requests
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}