import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EmployeeAllocationsTab() {
  const [allocations, setAllocations] = useState<any[]>([]);

  useEffect(() => {
    fetchAllocations();

    const channel = supabase
      .channel('employee-allocations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_allocations' }, fetchAllocations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllocations = async () => {
    const { data } = await supabase
      .from('employee_allocations')
      .select('*, markets(name)')
      .order('created_at', { ascending: false });
    setAllocations(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Allocations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell>{allocation.employee_name}</TableCell>
                <TableCell>{allocation.markets?.name}</TableCell>
                <TableCell>{new Date(allocation.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
