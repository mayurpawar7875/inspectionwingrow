import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TodaysOffer {
  id: string;
  commodity_name: string;
  category: string;
  price: number | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  employee_name: string;
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function TodaysOffersSection({ marketId, marketDate, isToday }: Props) {
  const [offers, setOffers] = useState<TodaysOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();

    if (isToday) {
      const channel = supabase
        .channel('offers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'offers',
          },
          () => {
            fetchOffers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('market_id', marketId)
        .eq('market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map(o => o.user_id))];
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedOffers = data.map(o => ({
          ...o,
          employee_name: employeeMap.get(o.user_id) || 'Unknown',
        }));

        setOffers(formattedOffers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Offers</CardTitle>
          <Badge variant="secondary">{offers.length} Offers</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No offers submitted yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>{format(new Date(offer.created_at), 'hh:mm a')}</TableCell>
                    <TableCell>{offer.employee_name}</TableCell>
                    <TableCell className="font-medium">{offer.commodity_name}</TableCell>
                    <TableCell>{offer.category}</TableCell>
                    <TableCell>
                      {offer.price ? `₹${offer.price}` : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {offer.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
