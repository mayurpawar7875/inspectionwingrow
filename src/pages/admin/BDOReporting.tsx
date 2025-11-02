import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BDOSubmissionsWidget from '@/components/admin/BDOSubmissionsWidget';

export default function BDOReporting() {
  const navigate = useNavigate();
  const submissionsRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'pending-markets' | 'pending-stalls' | 'approved-markets'>('all');
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingMarkets: 0,
    pendingStalls: 0,
    approvedMarkets: 0,
  });

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('bdo-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_market_submissions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_stall_submissions' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // BDO-specific data: Only fetch BDO market and stall submissions
      const [marketsRes, stallsRes] = await Promise.all([
        supabase.from('bdo_market_submissions').select('id, status', { count: 'exact' }),
        supabase.from('bdo_stall_submissions').select('id, status', { count: 'exact' }),
      ]);

      const markets = marketsRes.data || [];
      const stalls = stallsRes.data || [];

      setStats({
        totalSubmissions: markets.length + stalls.length,
        pendingMarkets: markets.filter(m => m.status === 'pending').length,
        pendingStalls: stalls.filter(s => s.status === 'pending').length,
        approvedMarkets: markets.filter(m => m.status === 'approved').length,
      });
    } catch (error) {
      console.error('Error fetching BDO stats:', error);
    }
  };

  const scrollToSubmissions = () => {
    submissionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTileClick = (filterType: 'all' | 'pending-markets' | 'pending-stalls' | 'approved-markets') => {
    setFilter(filterType);
    scrollToSubmissions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">BDO Real-Time Reporting</h2>
          <p className="text-muted-foreground">Monitor and review BDO submissions in real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all ${
            filter === 'all' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleTileClick('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-orange-200 ${
            filter === 'pending-markets' ? 'ring-2 ring-orange-500' : ''
          }`}
          onClick={() => handleTileClick('pending-markets')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.pendingMarkets}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-orange-200 ${
            filter === 'pending-stalls' ? 'ring-2 ring-orange-500' : ''
          }`}
          onClick={() => handleTileClick('pending-stalls')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Stalls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.pendingStalls}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-green-200 ${
            filter === 'approved-markets' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => handleTileClick('approved-markets')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.approvedMarkets}</div>
          </CardContent>
        </Card>
      </div>

      <div ref={submissionsRef}>
        <BDOSubmissionsWidget filter={filter} />
      </div>
    </div>
  );
}
