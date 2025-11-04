import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InspectionsTab() {
  const [inspections, setInspections] = useState<any[]>([]);

  useEffect(() => {
    fetchInspections();

    const channel = supabase
      .channel('inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_inspection_updates' }, fetchInspections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInspections = async () => {
    const { data } = await supabase
      .from('market_inspection_updates')
      .select('*, markets(name)')
      .order('created_at', { ascending: false });
    setInspections(data || []);
  };

  return (
    <div className="grid gap-4">
      {inspections.map((inspection) => (
        <Card key={inspection.id}>
          <CardHeader>
            <CardTitle className="text-base">{inspection.markets?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{inspection.update_notes}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {new Date(inspection.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
