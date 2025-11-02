import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LiveMarketsWidget from '@/components/admin/LiveMarketsWidget';

export default function MarketManagerReporting() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    liveMarkets: 0,
    activeEmployees: 0,
    totalStallConfirmations: 0,
    totalMediaUploads: 0,
  });

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('market-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [liveMarketsRes, stallsRes, mediaRes] = await Promise.all([
        supabase.from('live_markets_today').select('*'),
        supabase
          .from('stall_confirmations')
          .select('id', { count: 'exact', head: true })
          .eq('market_date', today),
        supabase.from('media').select('id', { count: 'exact', head: true }).eq('market_date', today),
      ]);

      const liveMarkets = liveMarketsRes.data || [];
      const activeEmployees = liveMarkets.reduce((sum, m) => sum + (m.active_employees || 0), 0);

      setStats({
        liveMarkets: liveMarkets.length,
        activeEmployees,
        totalStallConfirmations: stallsRes.count || 0,
        totalMediaUploads: mediaRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching market manager stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Market Manager Real-Time Reporting</h2>
          <p className="text-muted-foreground">Monitor live market operations and activities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.liveMarkets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stall Confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalStallConfirmations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Media Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMediaUploads}</div>
          </CardContent>
        </Card>
      </div>

      <LiveMarketsWidget />
    </div>
  );
}
