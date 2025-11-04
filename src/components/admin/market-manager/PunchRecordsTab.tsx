import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PunchRecordsTab() {
  const [punchIns, setPunchIns] = useState<any[]>([]);
  const [punchOuts, setPunchOuts] = useState<any[]>([]);

  useEffect(() => {
    fetchRecords();

    const channelIn = supabase
      .channel('punch-ins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchin' }, fetchRecords)
      .subscribe();

    const channelOut = supabase
      .channel('punch-outs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchout' }, fetchRecords)
      .subscribe();

    return () => {
      supabase.removeChannel(channelIn);
      supabase.removeChannel(channelOut);
    };
  }, []);

  const fetchRecords = async () => {
    const [inData, outData] = await Promise.all([
      supabase.from('market_manager_punchin').select('*').order('punched_at', { ascending: false }),
      supabase.from('market_manager_punchout').select('*').order('punched_at', { ascending: false }),
    ]);
    setPunchIns(inData.data || []);
    setPunchOuts(outData.data || []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Punch In Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Punched At</TableHead>
                <TableHead>GPS Location</TableHead>
                <TableHead>Selfie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punchIns.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.punched_at).toLocaleString()}</TableCell>
                  <TableCell>{record.gps_lat}, {record.gps_lng}</TableCell>
                  <TableCell>
                    {record.selfie_url && (
                      <a href={record.selfie_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Punch Out Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Punched At</TableHead>
                <TableHead>GPS Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punchOuts.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.punched_at).toLocaleString()}</TableCell>
                  <TableCell>{record.gps_lat}, {record.gps_lng}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
