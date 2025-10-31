import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StallInspection {
  id: string;
  farmer_name: string;
  has_tent: boolean;
  has_table: boolean;
  has_mat: boolean;
  has_apron: boolean;
  has_cap: boolean;
  has_light: boolean;
  has_flex: boolean;
  has_green_net: boolean;
  has_display: boolean;
  has_rateboard: boolean;
  has_digital_weighing_machine: boolean;
  created_at: string;
  user_id: string;
  employee_name: string;
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function StallInspectionsSection({ marketId, marketDate, isToday }: Props) {
  const [inspections, setInspections] = useState<StallInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();

    if (isToday) {
      const channel = supabase
        .channel('stall-inspections-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stall_inspections',
          },
          () => {
            fetchInspections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('stall_inspections')
        .select('*')
        .eq('market_id', marketId)
        .eq('market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map(i => i.user_id))];
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedInspections = data.map(i => ({
          ...i,
          employee_name: employeeMap.get(i.user_id) || 'Unknown',
        }));

        setInspections(formattedInspections);
      }
    } catch (error) {
      console.error('Error fetching stall inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const CheckIcon = ({ checked }: { checked: boolean }) => 
    checked ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />;

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
          <CardTitle>Stall Inspections</CardTitle>
          <Badge variant="secondary">{inspections.length} Inspections</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {inspections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stall inspections submitted yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead className="text-center">Tent</TableHead>
                  <TableHead className="text-center">Table</TableHead>
                  <TableHead className="text-center">Mat</TableHead>
                  <TableHead className="text-center">Apron</TableHead>
                  <TableHead className="text-center">Cap</TableHead>
                  <TableHead className="text-center">Light</TableHead>
                  <TableHead className="text-center">Flex</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead className="text-center">Display</TableHead>
                  <TableHead className="text-center">Rate Board</TableHead>
                  <TableHead className="text-center">Scale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>{format(new Date(inspection.created_at), 'hh:mm a')}</TableCell>
                    <TableCell>{inspection.employee_name}</TableCell>
                    <TableCell>{inspection.farmer_name}</TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_tent} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_table} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_mat} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_apron} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_cap} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_light} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_flex} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_green_net} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_display} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_rateboard} /></TableCell>
                    <TableCell className="text-center"><CheckIcon checked={inspection.has_digital_weighing_machine} /></TableCell>
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
