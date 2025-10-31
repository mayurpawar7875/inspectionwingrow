import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Image, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveMarketSummary {
  market_name: string;
  active_employees: number;
  stalls_confirmed: number;
  media_uploaded: number;
  late_uploads: number;
}

export default function LiveMarketWidget() {
  const [summary, setSummary] = useState<LiveMarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummary();
    
    const channel = supabase
      .channel('live-market-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchSummary)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('live_markets_today')
        .select('market_name, active_employees, stall_confirmations_count, media_uploads_count');

      if (error) throw error;

      const summaries: LiveMarketSummary[] = (data || []).map((row: any) => ({
        market_name: row.market_name,
        active_employees: row.active_employees || 0,
        stalls_confirmed: row.stall_confirmations_count || 0,
        media_uploaded: row.media_uploads_count || 0,
        late_uploads: 0
      }));

      setSummary(summaries);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Markets Today</CardTitle>
            <CardDescription>Real-time activity across all markets</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/live-market')}>
            View Full Monitor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active markets today
            </div>
          ) : (
            summary.map((market, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">{market.market_name}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{market.active_employees} employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span>{market.stalls_confirmed} stalls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" />
                      <span>{market.media_uploaded} uploads</span>
                    </div>
                    {market.late_uploads > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <Badge variant="destructive" className="text-xs">
                          {market.late_uploads} late
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
