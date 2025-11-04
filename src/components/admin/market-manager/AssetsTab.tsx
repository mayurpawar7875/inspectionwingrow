import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AssetsTab() {
  const [usage, setUsage] = useState<any[]>([]);
  const [recovery, setRecovery] = useState<any[]>([]);

  useEffect(() => {
    fetchData();

    const channelUsage = supabase
      .channel('assets-usage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_usage' }, fetchData)
      .subscribe();

    const channelRecovery = supabase
      .channel('money-recovery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_money_recovery' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channelUsage);
      supabase.removeChannel(channelRecovery);
    };
  }, []);

  const fetchData = async () => {
    const [usageData, recoveryData] = await Promise.all([
      supabase.from('assets_usage').select('*, markets(name)').order('created_at', { ascending: false }),
      supabase.from('assets_money_recovery').select('*').order('created_at', { ascending: false }),
    ]);
    setUsage(usageData.data || []);
    setRecovery(recoveryData.data || []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assets Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Return Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.asset_name}</TableCell>
                  <TableCell>{item.employee_name}</TableCell>
                  <TableCell>{item.markets?.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.return_date ? new Date(item.return_date).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money Recovery</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stall</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recovery.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.stall_name}</TableCell>
                  <TableCell>{item.farmer_name}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>₹{item.pending_amount}</TableCell>
                  <TableCell>₹{item.received_amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
