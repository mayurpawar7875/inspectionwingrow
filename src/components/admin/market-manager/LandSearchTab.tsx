import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function LandSearchTab() {
  const [searches, setSearches] = useState<any[]>([]);

  useEffect(() => {
    fetchSearches();

    const channel = supabase
      .channel('land-searches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_land_search' }, fetchSearches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase
      .from('market_land_search')
      .select('*')
      .order('created_at', { ascending: false });
    setSearches(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Land Search</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Place Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Opening Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searches.map((search) => (
              <TableRow key={search.id}>
                <TableCell>{search.place_name}</TableCell>
                <TableCell>
                  <div>{search.contact_name}</div>
                  <div className="text-sm text-muted-foreground">{search.contact_phone}</div>
                </TableCell>
                <TableCell>{search.address}</TableCell>
                <TableCell>{search.opening_date ? new Date(search.opening_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>
                  <Badge variant={search.is_finalized ? 'default' : 'secondary'}>
                    {search.is_finalized ? 'Finalized' : 'Pending'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
