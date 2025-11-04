import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface TaskHistoryViewProps {
  sessionId: string;
  taskType: 'employee_allocations' | 'market_manager_punchin' | 'market_land_search' | 
    'stall_searching_updates' | 'assets_money_recovery' | 'assets_usage' | 
    'bms_stall_feedbacks' | 'market_inspection_updates' | 'market_manager_punchout';
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[];
}

export function TaskHistoryView({ sessionId, taskType, columns }: TaskHistoryViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`history-${taskType}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: taskType, filter: `session_id=eq.${sessionId}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, taskType]);

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from(taskType)
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && records) {
      setData(records);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading history...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No records yet</div>;
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(row.created_at), 'HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
