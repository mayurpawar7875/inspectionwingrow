import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { validateImage, validateDocument, generateUploadPath } from '@/lib/fileValidation';

export function AssetRequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMode: 'cash',
    amountReceived: '',
    paymentDate: new Date().toISOString().split('T')[0],
    proofFile: null as File | null,
  });

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('asset-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('asset_requests')
      .select('*, asset_inventory(asset_name), markets(name), asset_payments(verification_status)')
      .eq('requester_id', user?.id)
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      returned: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const getPaymentStatus = (request: any) => {
    if (request.asset_payments?.length > 0) {
      const payment = request.asset_payments[0];
      return payment.verification_status === 'verified' ? 'Verified' : 'Pending Verification';
    }
    return request.status === 'approved' ? 'Not Uploaded' : '-';
  };

  const handleUploadPayment = async () => {
    if (!selectedRequest || !paymentData.amountReceived) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      let proofUrl = null;

      if (paymentData.proofFile) {
        // Validate file
        try {
          if (paymentData.proofFile.type.startsWith('image/')) {
            validateImage(paymentData.proofFile);
          } else {
            validateDocument(paymentData.proofFile);
          }
        } catch (validationError) {
          setUploading(false);
          return;
        }

        const fileName = generateUploadPath(user?.id || '', paymentData.proofFile.name);
        
        const { error: uploadError, data } = await supabase.storage
          .from('employee-media')
          .upload(fileName, paymentData.proofFile);

        if (uploadError) throw uploadError;

        // Store just the path, not full URL
        proofUrl = fileName;
      }

      const { error } = await supabase.from('asset_payments').insert({
        request_id: selectedRequest.id,
        requester_id: user?.id,
        asset_id: selectedRequest.asset_id,
        payment_mode: paymentData.paymentMode,
        amount_received: parseFloat(paymentData.amountReceived),
        payment_proof_url: proofUrl,
        payment_date: paymentData.paymentDate,
      });

      if (error) throw error;

      toast.success('Payment details uploaded successfully');
      setSelectedRequest(null);
      setPaymentData({
        paymentMode: 'cash',
        amountReceived: '',
        paymentDate: new Date().toISOString().split('T')[0],
        proofFile: null,
      });
      fetchRequests();
    } catch (error) {
      toast.error('Failed to upload payment details');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Asset Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.asset_inventory?.asset_name}</TableCell>
                <TableCell>{request.quantity}</TableCell>
                <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>{getPaymentStatus(request)}</TableCell>
                <TableCell>{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  {request.status === 'approved' && !request.asset_payments?.length && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(request)}>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Payment Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Payment Mode *</Label>
                            <Select
                              value={paymentData.paymentMode}
                              onValueChange={(value) => setPaymentData({ ...paymentData, paymentMode: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Amount Received *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={paymentData.amountReceived}
                              onChange={(e) => setPaymentData({ ...paymentData, amountReceived: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <Label>Payment Date *</Label>
                            <Input
                              type="date"
                              value={paymentData.paymentDate}
                              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label>Upload Proof (Optional)</Label>
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => setPaymentData({ ...paymentData, proofFile: e.target.files?.[0] || null })}
                            />
                          </div>

                          <Button onClick={handleUploadPayment} disabled={uploading} className="w-full">
                            {uploading ? 'Uploading...' : 'Submit Payment Details'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No asset requests yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}