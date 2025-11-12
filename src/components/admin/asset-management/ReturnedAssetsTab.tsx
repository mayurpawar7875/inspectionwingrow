import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export function ReturnedAssetsTab() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('returned-assets-changes')
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
      .eq('status', 'returned')
      .order('actual_return_date', { ascending: false });
    setRequests(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Returned Assets</CardTitle>
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
              <TableHead>Expected Return</TableHead>
              <TableHead>Actual Return</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const expectedDate = new Date(request.expected_return_date);
              const actualDate = request.actual_return_date ? new Date(request.actual_return_date) : null;
              const isLate = actualDate && actualDate > expectedDate;

              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>{request.employees?.full_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{request.employees?.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{request.requester_role}</TableCell>
                  <TableCell>{request.asset_inventory?.asset_name}</TableCell>
                  <TableCell>{request.quantity}</TableCell>
                  <TableCell>{request.markets?.name || '-'}</TableCell>
                  <TableCell>{format(expectedDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {actualDate ? format(actualDate, 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={isLate ? 'text-destructive font-medium' : 'text-foreground'}>
                      {isLate ? 'Late Return' : 'On Time'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No returned assets yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}