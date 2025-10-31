import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface NextDayPlanning {
  id: string;
  next_day_market_name: string;
  stall_list: string;
  created_at: string;
  employee_name: string;
}

interface StallConfirmation {
  farmerName: string;
  stallName: string;
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function NextDayPlanningSection({ marketId, marketDate, isToday }: Props) {
  const [plannings, setPlannings] = useState<NextDayPlanning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlannings();

    if (isToday) {
      const channel = supabase
        .channel('next-day-planning-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'next_day_planning',
          },
          () => {
            fetchPlannings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchPlannings = async () => {
    try {
      const { data, error } = await supabase
        .from('next_day_planning')
        .select(`
          id,
          next_day_market_name,
          stall_list,
          created_at,
          user_id
        `)
        .eq('current_market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch employee names
        const userIds = data.map(p => p.user_id);
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedPlannings = data.map(p => ({
          id: p.id,
          next_day_market_name: p.next_day_market_name,
          stall_list: p.stall_list,
          created_at: p.created_at,
          employee_name: employeeMap.get(p.user_id) || 'Unknown',
        }));

        setPlannings(formattedPlannings);
      }
    } catch (error) {
      console.error('Error fetching next day plannings:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseStallList = (stallListJson: string): StallConfirmation[] => {
    try {
      return JSON.parse(stallListJson);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Next Day Planning</CardTitle>
          </div>
          <Badge variant="secondary">{plannings.length} Submissions</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {plannings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No next day planning submitted yet
          </div>
        ) : (
          <div className="space-y-6">
            {plannings.map((planning) => {
              const confirmations = parseStallList(planning.stall_list);
              return (
                <div key={planning.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{planning.employee_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(planning.created_at), 'hh:mm a')}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Next Day Market</p>
                    <p className="font-medium">{planning.next_day_market_name}</p>
                  </div>

                  {confirmations.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Stall Confirmations ({confirmations.length})
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stall Name</TableHead>
                            <TableHead>Farmer Name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {confirmations.map((conf, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{conf.stallName}</TableCell>
                              <TableCell>{conf.farmerName}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
