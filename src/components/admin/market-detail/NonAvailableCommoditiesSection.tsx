import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface NonAvailableCommodity {
  id: string;
  commodity_name: string;
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

export function NonAvailableCommoditiesSection({ marketId, marketDate, isToday }: Props) {
  const [commodities, setCommodities] = useState<NonAvailableCommodity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommodities();

    if (isToday) {
      const channel = supabase
        .channel('non-available-commodities-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'non_available_commodities',
          },
          () => {
            fetchCommodities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchCommodities = async () => {
    try {
      const { data, error } = await supabase
        .from('non_available_commodities')
        .select('*')
        .eq('market_id', marketId)
        .eq('market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedCommodities = data.map(c => ({
          ...c,
          employee_name: employeeMap.get(c.user_id) || 'Unknown',
        }));

        setCommodities(formattedCommodities);
      }
    } catch (error) {
      console.error('Error fetching non-available commodities:', error);
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
          <CardTitle>Non-Available Commodities</CardTitle>
          <Badge variant="secondary">{commodities.length} Items</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {commodities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No non-available commodities reported yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Commodity Name</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((commodity) => (
                  <TableRow key={commodity.id}>
                    <TableCell>{format(new Date(commodity.created_at), 'hh:mm a')}</TableCell>
                    <TableCell>{commodity.employee_name}</TableCell>
                    <TableCell className="font-medium">{commodity.commodity_name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {commodity.notes || '—'}
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
