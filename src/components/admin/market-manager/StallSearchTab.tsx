import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function StallSearchTab() {
  const [searches, setSearches] = useState<any[]>([]);

  useEffect(() => {
    fetchSearches();

    const channel = supabase
      .channel('stall-searches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_searching_updates' }, fetchSearches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase
      .from('stall_searching_updates')
      .select('*')
      .order('created_at', { ascending: false });
    setSearches(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stall Searching Updates</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stall Name</TableHead>
              <TableHead>Farmer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Interested</TableHead>
              <TableHead>Joining Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searches.map((search) => (
              <TableRow key={search.id}>
                <TableCell>{search.stall_name}</TableCell>
                <TableCell>{search.farmer_name}</TableCell>
                <TableCell>{search.contact_phone}</TableCell>
                <TableCell>
                  <Badge variant={search.is_interested ? 'default' : 'secondary'}>
                    {search.is_interested ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>{search.joining_date ? new Date(search.joining_date).toLocaleDateString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
